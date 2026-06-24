# Design — Brancher 5 dropdowns sur leurs tables SAP dédiées

Date : 2026-06-24

## Contexte

Aujourd'hui, les 13 listes déroulantes de l'application sont toutes stockées dans
la table option-set unique `cr04e_optionsetcodeapps` (clé `cr04e_id_dd` =
identifiant de liste). Le hook `useAdminOptions()` regroupe ces lignes par clé et
`CreerDE.jsx` est le **seul** consommateur via `buildOptions(...)`.

5 de ces listes correspondent en réalité à des référentiels **alimentés par SAP**.
Elles disposent désormais chacune de leur **table Dataverse dédiée** (déjà générée
sous `src/generated`). Ces tables seront initialisées plus tard, par import de
fichier, une fois l'app déployée. **Ce spec ne couvre pas l'import** : il se limite
à (a) retirer ces 5 listes de l'onglet Admin et (b) faire lire leurs dropdowns
depuis les tables dédiées.

## Périmètre

NE FAIT PAS partie de ce lot :
- L'UI d'import de fichier vers les 5 tables (étape ultérieure).
- Toute modification de `optionSet.js`, de `buildOptions`, du rendu des champs.
- FicheDetailV2 (ne consomme aucune de ces 5 listes).

## Mapping des 5 listes → tables

| Clé dropdown            | Libellé                     | Service généré                          | Champ « code » (value)        | Champ « désignation »          |
|-------------------------|-----------------------------|-----------------------------------------|-------------------------------|--------------------------------|
| `divisions`             | Division (Usine)            | `Cr04e_divisionusinesService`           | `cr04e_division`              | `cr04e_nom1`                   |
| `classes_valorisation`  | Classe de valorisation      | `Cr04e_classedevalorisationsService`    | `cr04e_classevalorisation`    | `cr04e_designation`            |
| `groupes_article`       | Groupes article             | `Cr04e_groupearticledivisionsService`   | `cr04e_groupedarticles`       | `cr04e_designgroupemarch`      |
| `groupes_frais_generaux`| Groupe de frais généraux    | `Cr04e_groupedefraisgenerauxesService`  | `cr04e_groupedefraisgen`      | `cr04e_domainevalorisation`    |
| `familles_produit`      | Hiérarchie produit famille  | `Cr04e_hierarchieproduitfamillesService`| `cr04e_hierarchieproduits`    | `cr04e_description`            |

Tri : par code (`value`) croissant à l'affichage.

## Architecture

### 1. `src/api/sapLists.js` (nouveau)

Registre déclaratif + lecture paginée.

```js
import {
  Cr04e_divisionusinesService,
  Cr04e_classedevalorisationsService,
  Cr04e_groupearticledivisionsService,
  Cr04e_groupedefraisgenerauxesService,
  Cr04e_hierarchieproduitfamillesService,
} from '@/generated';

// key -> { service, valueField, designationField }
export const SAP_LIST_CONFIG = {
  divisions:              { service: Cr04e_divisionusinesService,            valueField: 'cr04e_division',           designationField: 'cr04e_nom1' },
  classes_valorisation:   { service: Cr04e_classedevalorisationsService,     valueField: 'cr04e_classevalorisation', designationField: 'cr04e_designation' },
  groupes_article:        { service: Cr04e_groupearticledivisionsService,    valueField: 'cr04e_groupedarticles',    designationField: 'cr04e_designgroupemarch' },
  groupes_frais_generaux: { service: Cr04e_groupedefraisgenerauxesService,   valueField: 'cr04e_groupedefraisgen',   designationField: 'cr04e_domainevalorisation' },
  familles_produit:       { service: Cr04e_hierarchieproduitfamillesService, valueField: 'cr04e_hierarchieproduits', designationField: 'cr04e_description' },
};

export const SAP_LIST_KEYS = Object.keys(SAP_LIST_CONFIG);

// Pagine via skipToken (même garde-fou que optionSet.listAll), normalise en
// { value, designation }, ignore les lignes sans value, trie par value croissant.
export async function listSapTable(key) {
  const cfg = SAP_LIST_CONFIG[key];
  if (!cfg) throw new Error(`Liste SAP inconnue : ${key}`);
  const { service, valueField, designationField } = cfg;
  const all = [];
  let skipToken;
  let guard = 0;
  do {
    const result = await service.getAll({
      maxPageSize: 5000,
      ...(skipToken ? { skipToken } : {}),
    });
    const rows = result?.data ?? [];
    for (const row of rows) {
      const value = row[valueField];
      if (value == null || value === '') continue;
      all.push({ value: String(value), designation: row[designationField] ?? '' });
    }
    skipToken = result?.skipToken;
    guard += 1;
  } while (skipToken && guard < 100);
  all.sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
  return all;
}
```

### 2. `src/lib/sapLists.js` (nouveau) — hook React Query

```js
import { useQueries } from '@tanstack/react-query';
import { SAP_LIST_KEYS, listSapTable } from '@/api/sapLists';

// Renvoie { divisions: [{value,designation}], classes_valorisation: [...], ... }
// — même forme que useAdminOptions, directement consommable par buildOptions.
export function useSapOptions() {
  const results = useQueries({
    queries: SAP_LIST_KEYS.map((key) => ({
      queryKey: ['sap-list', key],
      queryFn: () => listSapTable(key),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const grouped = Object.fromEntries(SAP_LIST_KEYS.map((k) => [k, []]));
  SAP_LIST_KEYS.forEach((key, i) => {
    grouped[key] = results[i].data ?? [];
  });
  return grouped;
}
```

### 3. `src/lib/adminLists.js`

Retirer les 5 clés de `DROPDOWN_KEYS`. Il reste les 8 listes réellement option-set :

```js
export const DROPDOWN_KEYS = [
  'reseaux',
  'centres_profit',
  'groupes_autorisation',
  'axes_strategiques',
  'secteurs_activite',
  'categories_vif',
  'types_logistique',
  'services_demandeur',
];
```

`useAdminOptions` / `useAdminLists` / `buildOptions` : inchangés.

### 4. `src/pages/Admin.jsx`

- La navigation et le contenu Admin itèrent sur `DROPDOWN_KEYS` → les 5 onglets
  disparaissent automatiquement, plus aucun n'est visible.
- Retirer les 5 entrées correspondantes de `LIST_LABELS` (nettoyage) :
  `divisions`, `groupes_article`, `classes_valorisation`,
  `groupes_frais_generaux`, `familles_produit`.
- Vérifier l'état initial `useState('reseaux')` : `reseaux` reste dans
  `DROPDOWN_KEYS`, donc sélection initiale valide.

### 5. `src/pages/CreerDE.jsx`

- Ajouter `import { useSapOptions } from '@/lib/sapLists';` et
  `const sapOptions = useSapOptions();` à côté de `adminOptions`.
- Le filtre 21/22/27 s'applique désormais à `sapOptions.familles_produit` :
  ```js
  const famillesProduitOptions = sapOptions.familles_produit.filter((o) =>
    ['21', '22', '27'].includes(String(o.value).slice(0, 2)),
  );
  ```
- Repointer les 5 `buildOptions(...)` des dropdowns concernés depuis
  `adminOptions.*` vers `sapOptions.*` :
  - `division`            → `sapOptions.divisions`
  - `classe_valorisation` → `sapOptions.classes_valorisation`
  - `groupe_frais_generaux` → `sapOptions.groupes_frais_generaux`
  - `groupe_article`      → `sapOptions.groupes_article`
  - `famille_produit`     → `famillesProduitOptions` (déjà basé sur sapOptions)
- Les 8 autres dropdowns continuent d'utiliser `adminOptions.*`.

## Flux de données

```
Tables Dataverse SAP ──(service.getAll paginé)──> listSapTable(key)
   └─ normalisation { value, designation } + tri
        └─ useSapOptions() ──> sapOptions.<key>
             └─ buildOptions(sapOptions.<key>, valeurActuelle)
                  └─ SearchableSelect (CreerDE)
```

`buildOptions` ajoute toujours la valeur courante absente de la liste, donc une
DE déjà enregistrée avec un code retiré du référentiel ne perd jamais sa valeur.

## Gestion des erreurs / cas limites

- **Tables vides (avant import)** : `listSapTable` renvoie `[]` ; les dropdowns
  n'affichent que la valeur courante (via `buildOptions`). Pas d'erreur bloquante.
- **Échec de chargement d'une table** : `useQueries` isole l'erreur par liste ;
  les autres dropdowns restent fonctionnels (`data ?? []`).
- **Doublons de code dans une table** : non dédupliqués ici (le référentiel SAP
  est supposé propre) ; comportement identique à l'existant option-set.

## Tests

- `src/api/sapLists` : test unitaire de `listSapTable` (mock service) —
  normalisation, filtre lignes vides, tri, pagination skipToken.
- Vérifier qu'`adminLists.test`/`becpgMapping.test` existants passent toujours
  (les 5 clés retirées ne doivent plus être attendues côté option-set).
- Build (`npm run build`) sans erreur.

## Hors scope (étapes ultérieures)

- Import de fichier vers les 5 tables dans l'onglet Admin.
- Éventuelle section Admin en lecture seule sur ces référentiels.
