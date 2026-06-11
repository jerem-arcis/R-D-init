# Option Set — Table Dataverse pour les dropdowns Admin

**Date** : 2026-06-11
**Auteur** : Jeremy / Youngdata
**Statut** : design validé, prêt pour plan d'implémentation

## Contexte

La page **Admin** (`src/pages/Admin.jsx`) permet de gérer 8 listes déroulantes
utilisées dans le reste de l'app (notamment `CreerDE.jsx`). Aujourd'hui :

- Les valeurs par défaut sont en dur dans `src/lib/adminLists.js` (`DEFAULT_LISTS`).
- La persistance est en **localStorage** (clé `boncolac_admin_lists`), via
  `loadAdminLists` / `saveAdminLists`.
- Le hook `useAdminLists()` expose un objet `{ reseaux: string[], ... }`
  synchrone, consommé par `CreerDE.jsx`.
- Le commentaire dans `src/api/base44Client.js` indique que cette persistance
  mock est destinée à être remplacée par Dataverse.

La table Dataverse a déjà été créée et connectée à l'app via
`pac code add-data-source` :

- Logical name : `cr04e_optionsetcodeapps`
- Entity set name : `cr04e_optionsetcodeappses`
- Service TypeScript généré : `src/generated/services/Cr04e_optionsetcodeappsesService.ts`
- Modèle généré : `src/generated/models/Cr04e_optionsetcodeappsesModel.ts`
- Référencée dans `power.config.json` → `databaseReferences.default.cds.dataSources.optionsetcodeapps`

## Objectif

Remplacer la persistance localStorage par la table Dataverse `cr04e_optionsetcodeapps`,
avec sauvegarde immédiate côté Admin, sans casser les consumers (`CreerDE`).

## Hors scope

- Migration des données déjà saisies par les utilisateurs en localStorage —
  perdues volontairement (état de dev mock).
- Réordonnancement manuel des valeurs (drag & drop).
- Soft-delete / désactivation d'une valeur.
- Gestion d'un libellé d'affichage distinct de la valeur stockée.
- Permissions custom dans l'app — on repose sur les rôles Dataverse.

## Modèle de données

**Table** : `cr04e_optionsetcodeapps`

| Notre nom logique | Colonne Dataverse                | Type             | Note |
|-------------------|-----------------------------------|------------------|------|
| `id`              | `cr04e_optionsetcodeappsid`       | GUID (PK)        | Auto |
| `dropdownId`      | `cr04e_id_dd`                     | string (optionnel) | Code stable du dropdown — réutilise les clés actuelles de `DEFAULT_LISTS` : `reseaux`, `groupes_article`, `axes_strategiques`, `familles_produit`, `secteurs_activite`, `categories_vif`, `types_logistique`, `services_demandeur` |
| `value`           | `cr04e_valeur_dd`                 | string (optionnel) | Valeur affichée et stockée dans les fiches (ex. `"MDD"`) |

**Unicité fonctionnelle** : (`dropdownId`, `value`) doit être unique. Pas de
contrainte native côté Dataverse — l'UI Admin bloque les doublons en amont
(comportement déjà présent : `currentList.includes(v)`).

**Volume attendu** : ~50 lignes (8 dropdowns × ~5-10 valeurs). Aucun enjeu de perf.

**Identifiant fonctionnel côté fiches** : les fiches existantes (`DemandeEtude`,
`FicheLancement`) stockent les valeurs comme strings brutes (`"MDD"`, `"Traiteur"`,
etc.). On conserve ce contrat : la valeur (string) reste la clé fonctionnelle
côté fiches. Renommer une valeur dans la table Dataverse ne propage pas
automatiquement aux fiches déjà créées — c'est une opération à gérer manuellement
si elle survient.

## Architecture

### Couche 1 — Service généré (intouché)

`src/generated/services/Cr04e_optionsetcodeappsesService.ts` expose déjà :
- `create(record)`
- `update(id, changedFields)`
- `delete(id)`
- `get(id, options?)`
- `getAll(options?)`

On consomme ce service tel quel. Aucun wrapping du SDK
`@microsoft/power-apps/data` directement.

### Couche 2 — Adaptateur `src/api/optionSet.js` (nouveau)

Petit module qui mappe entre les noms Dataverse (`cr04e_id_dd`, `cr04e_valeur_dd`)
et nos noms simples (`dropdownId`, `value`). API :

```js
listAll()                          // → Promise<[{ id, dropdownId, value }]>
create(dropdownId, value)          // → Promise<{ id, dropdownId, value }>
update(id, value)                  // → Promise<void>
remove(id)                         // → Promise<void>
```

Le fichier est en `.js`. Vite résout les imports vers les `.ts` générés sans
configuration supplémentaire (le projet utilise déjà ce mix via `jsconfig.json`).

**Point à valider à l'implémentation** : si `create()` exige un `ownerid` non
auto-rempli par Dataverse, on récupère l'utilisateur courant via le
`PowerProvider` existant (`src/PowerProvider.tsx`) et on l'injecte dans le
payload.

### Couche 3 — Hooks React Query `src/lib/adminLists.js` (refactor complet)

Le fichier perd :
- `DEFAULT_LISTS`
- `STORAGE_KEY`, `UPDATE_EVENT`
- `loadAdminLists`, `saveAdminLists`

Il garde :
- Une constante `DROPDOWN_KEYS` (= les 8 clés actuelles de `DEFAULT_LISTS`) pour
  pré-bootstrapper l'objet retourné avec **toutes les clés présentes mais vides**
  pendant le chargement initial.
- `useAdminLists()` réécrit en wrapper React Query :

```js
export function useAdminLists() {
  const { data = [] } = useQuery({
    queryKey: ['optionset'],
    queryFn: listAll,
  });
  // Démarre avec toutes les clés présentes mais vides, puis remplit
  const base = Object.fromEntries(DROPDOWN_KEYS.map(k => [k, []]));
  for (const row of data) {
    if (row.dropdownId && base[row.dropdownId]) {
      base[row.dropdownId].push(row.value);
    }
  }
  return base;
}
```

Signature inchangée pour les consumers. `CreerDE.jsx` n'est pas modifié.

**Pré-requis** : un `QueryClientProvider` doit être monté à la racine. Vérifier
dans `src/main.jsx` ou `src/Layout.jsx` — l'ajouter s'il est absent.

### Couche 4 — Page Admin `src/pages/Admin.jsx` (refactor)

Disparaît :
- Bouton « Enregistrer » global en haut + `handleSave`.
- State local `lists` synchronisé via `useState(loadAdminLists)`.
- L'astuce « pensez à cliquer sur Enregistrer ».

Apparaît :
- **Query dédiée** à l'Admin qui garde les objets complets `{ id, dropdownId, value }`
  (et non les strings aplaties du hook simplifié) — nécessaire pour pouvoir
  update / delete par ID :
  ```js
  const { data: rows = [] } = useQuery({ queryKey: ['optionset'], queryFn: listAll });
  const currentRows = rows.filter(r => r.dropdownId === selectedKey);
  ```
- **Trois mutations React Query** : `createMut`, `updateMut`, `removeMut`. Chacune
  invalide `['optionset']` au succès — les dropdowns dans CreerDE se mettent à
  jour automatiquement.
- **Comportements** :
  - **Ajouter** (clic ou Entrée) : `createMut.mutate({ dropdownId: selectedKey, value })`,
    toast succès/erreur, vide le champ.
  - **Éditer inline** : `onChange` met à jour un state local d'input pour la
    fluidité ; **`onBlur`** appelle `updateMut.mutate({ id, value })` si la
    valeur a changé. Pas de debounce nécessaire — le blur suffit.
  - **Supprimer** : ouvre un **`AlertDialog`** (composant Radix déjà installé)
    avec texte « Supprimer la valeur "X" ? Cette action est irréversible. » et
    boutons Annuler / Supprimer. Au clic Supprimer → `removeMut.mutate(id)`.

### Couche 5 — Consumers (`CreerDE.jsx` etc.)

**Aucune modification** prévue. Le hook `useAdminLists()` garde sa signature et
retourne `{ reseaux: [], ... }` (toutes clés présentes) dès le premier render.
Pendant les ~200 ms de chargement initial les dropdowns affichent une liste
vide — comportement acceptable.

Si une régression apparaît dans `CreerDE.jsx` (test manuel à faire), corriger
sur place.

## Seed initial

L'utilisateur importe manuellement les valeurs actuelles de `DEFAULT_LISTS` via
le portail Maker (import CSV).

Livrable : `docs/superpowers/specs/optionset-seed.csv` généré depuis
`DEFAULT_LISTS`, avec colonnes :

```
cr04e_id_dd,cr04e_valeur_dd
reseaux,MDD
reseaux,HSFC
...
```

Une fois le CSV importé, le code de seed n'a aucune raison d'exister côté front.

## Suppression de code mort

À retirer du repo une fois la bascule effectuée et testée :
- `DEFAULT_LISTS`, `STORAGE_KEY`, `UPDATE_EVENT`, `loadAdminLists`,
  `saveAdminLists` dans `src/lib/adminLists.js`.
- Aucune entrée dans `src/api/base44Client.js` à toucher (les autres entités
  mock restent telles quelles, le commentaire « À remplacer par Dataverse »
  reste valable pour `FicheLancement`, `DemandeEtude`, `CodeEAN`, `Query`).

## Tests / vérifications manuelles

À la fin de l'implémentation :

1. `npm run dev` puis ouvrir l'app via l'URL Power Apps locale.
2. Sur la page Admin : ajouter, éditer (blur), supprimer (avec confirmation)
   pour chaque dropdown — vérifier que les toasts apparaissent et que les
   données persistent au rechargement.
3. Ouvrir CreerDE : vérifier que les dropdowns sont peuplés des bonnes valeurs.
4. Modifier une valeur depuis Admin → rouvrir CreerDE (sans rechargement
   complet) → vérifier que le dropdown reflète immédiatement le changement
   (invalidation React Query).
5. Vérifier dans Dataverse (Maker → table → Données) que les lignes sont bien
   créées / modifiées / supprimées.

## Risques connus

- **`ownerid` requis au create** : le type généré marque `ownerid` comme
  non-optionnel. Si Dataverse n'auto-remplit pas avec l'utilisateur courant,
  premier `create` échouera — fallback : récupérer `userId` via le
  `PowerProvider`. À tester à l'impl.
- **Erreurs réseau** : la sauvegarde immédiate peut échouer (offline,
  permissions, etc.). Le toast d'erreur de chaque mutation suffit pour le MVP ;
  on ne fait pas d'optimistic update au premier jet.
