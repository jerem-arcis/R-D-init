# Design — Statut `en_attente_cc` (DE alimentée par l'import projet)

**Date :** 2026-06-29
**Périmètre :** basculer l'étape « attente de code chapeau » d'une source manuelle
(récupération beCPG par CodePJ) vers une source **automatique** : les projets
remontent dans la table `cr04e_projet` au statut `en_attente_cc`, et l'app
préremplit la DE à partir de la ligne projet.

---

## 1. Contexte

Aujourd'hui, créer une DE passe par l'encart **« Récupération depuis beCPG »**
(`src/pages/CreerDE.jsx`) : on saisit un *CodePJ*, un flux Power Automate renvoie
les données beCPG, et le formulaire est prérempli (`mapBeCPGToDE`). Le projet est
ensuite créé au statut `en_attente_code_chapeau`.

Une **partie automatique** est désormais en place : un flux d'import alimente la
table `cr04e_projet` avec des lignes déjà renseignées, au statut **`en_attente_cc`**
(= « En attente de code chapeau »). L'utilisateur ouvre ces lignes depuis l'onglet
dédié de **Demandes d'Étude** ; le clic route déjà vers `CreerDE?projet_id=<guid>`
(préremplissage depuis Dataverse via `getProjetById` → `toFormData`).

Le refresh de la table a ajouté des colonnes, dont **`cr04e_divisionimport`**
(code division, utilisé pour le préremplissage) et `cr04e_hierarchiefamilleimport`
(**non utilisée** : la hiérarchie produit se déduit déjà de la division via
`deRules`).

`en_attente_cc` **remplace** `en_attente_code_chapeau` : même étape du pipeline,
seule la source change (import au lieu de beCPG). Pas de rétro-compatibilité —
l'ancien nom n'est plus utilisé.

## 2. Pipeline résultant

```
brouillon → en_attente_cc → en_attente_dl → en_attente_validation_dl → validee / refusee
```

Seule la clé technique change. Le **libellé reste « En attente de code chapeau »**,
ainsi que la sémantique (alertes ADV J+0/J+6 inchangées).

## 3. Modifications

### Modif 1 — Renommer le statut `en_attente_code_chapeau` → `en_attente_cc`

Renommage net (clé technique uniquement), libellé inchangé. Fichiers :

- `src/lib/deStatus.js`
  - clé `en_attente_cc` dans `STATUTS` (`key: "en_attente_cc"`, `label:
    "En attente de code chapeau"`, `tone`/`order` inchangés) ;
  - `codeChapeauAlert` : la garde teste `de.statut !== "en_attente_cc"`.
- `src/api/projet.js`
  - `PROJET_STATUT.en_attente_cc = 'en_attente_cc'` ;
  - défaut de `toFormData` : `statut: p.cr04e_statut_en_cours || PROJET_STATUT.en_attente_cc`.
- `src/pages/DemandesEtude.jsx`
  - `DE_TABS` : `'en_attente_cc'` ;
  - carte stat (filtre `d.statut === 'en_attente_cc'`) ;
  - routage des lignes (`de.statut === 'en_attente_cc'` → `CreerDE?projet_id=`).
- `src/lib/deStatus.test.js` : assertions mises à jour vers `en_attente_cc`.

**Prérequis flux (hors app) :** le flux d'import doit écrire **exactement** la
chaîne `en_attente_cc` dans `cr04e_statut_en_cours`. Toute ligne restée en
`en_attente_code_chapeau` ne sera plus reconnue (retombe sur le défaut) — accepté,
la table est ré-alimentée par l'import.

### Modif 2 — Préremplir la division depuis `cr04e_divisionimport`

Dans `toFormData` (`src/api/projet.js`), mapper la colonne d'import vers le champ
`division` du formulaire, en convertissant un éventuel **nom de site** en **code**
(comme le fait l'import beCPG) :

```js
division: divisionCodeFromPlant(p.cr04e_divisionimport) || (p.cr04e_divisionimport ?? ''),
```

Conséquence : à l'ouverture, la division (un **code**) est posée. Le `useEffect`
piloté par `formData.division` dans `CreerDE.jsx` applique alors les règles
`deRules` (hiérarchie produit, classe de valorisation, centre de profit, groupe
article). La résolution du lookup `cr04e_DivisionUsine` à l'enregistrement se fait
déjà via `lookupBind('divisions', code, …)` au moment de l'écriture.

**Constat (diagnostic 2026-06-29) :** en pratique le flux écrit le **nom du site**
dans `cr04e_divisionimport` (ex. « RIVESALTES »), pas le code. Sans conversion, la
division ne matche aucune option (les options sont des codes `2886/2866/2847/2859`)
et la cascade `deRules` échoue → hiérarchie/classe valo/centre/groupe article/secteur
restent vides. `divisionCodeFromPlant` convertit `RIVESALTES → 2866` ; si la valeur
est déjà un code, elle est conservée telle quelle.

### Modif 3 — Masquer l'encart « Récupération depuis beCPG »

Dans `src/pages/CreerDE.jsx`, ne plus rendre `<RecupererBeCPG onApply={…} />`
(le bloc conditionnel `formType === 'de'` autour de la ligne ~1098). Le code du
composant et des helpers (`RecupererBeCPG`, `BECPG_FLOW_URL`, `handleApplyBeCPG`,
`persistNewDropdownValues`, imports `becpgMapping`) est **conservé en place**
(masquage simple, réactivable), pas de nettoyage.

## 4. Hors périmètre

- Colonne `cr04e_hierarchiefamilleimport` : non exploitée (hiérarchie déduite de
  la division).
- Construction du flux d'import Power Automate (côté Jeremy).
- Autres colonnes ajoutées au refresh (`cr04e_activite_ds`, `cr04e_service`,
  `cr04e_codedivisionorigine`, `cr04e_descriptiondubesoin`, lookup
  `cr04e_Centredeprofit`) : non câblées par ce lot.

## 5. Tests / validation

- `src/lib/deStatus.test.js` mis à jour (clé `en_attente_cc`, libellé inchangé,
  `codeChapeauAlert`).
- `npm test` et `npm run build` verts.
- Vérif manuelle : un projet importé `en_attente_cc` apparaît dans l'onglet dédié,
  son ouverture préremplit la division (et les champs en cascade), et l'encart
  beCPG n'apparaît plus.
