# Périmètre société & droits par groupe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cloisonner l'app par société SAP (dossiers, divisions, canaux) et limiter l'édition de la FL et l'accès Admin selon les groupes Entra portés par la table société.

**Architecture:** Un module de règles pures (`src/lib/perimetre.js`) alimenté par un contexte React (`PerimetreContext`) qui charge les quatre référentiels Dataverse et l'appartenance aux groupes (connecteur Office 365 Groups). Les écrans n'implémentent aucune règle : ils interrogent `usePerimetre()`.

**Tech Stack:** React 18, Vite, @tanstack/react-query, Vitest (environnement node), services générés Power Apps code app.

**Spec:** `docs/superpowers/specs/2026-10-02-perimetre-societe-droits-design.md`

## Global Constraints

- Branche `dev` uniquement.
- Aucun fichier de `src/generated` n'est modifié à la main.
- Les codes (société, division, orgCo, canal) sont comparés après `trim()` et sans casse.
- Une erreur de résolution de groupe n'ouvre jamais l'accès.
- Une valeur hors périmètre déjà enregistrée reste affichée (`buildOptions(rows, current)`).
- Société sans aucun groupe = ouverte à tous ; rien de renseigné = comportement actuel.
- Textes d'interface en français.

## Review Focus

1. Types de division non renseignés (table pas encore qualifiée) : la liste DE ne doit pas se vider → repli sur les sites de fabrication historiques tant qu'aucune division n'est typée PROD.
2. Division sans société (`cr04e_societe` vide) : visible par tous, dossier rattaché visible par tous.
3. Groupe supprimé ou connecteur en échec : utilisateur non membre, avertissement, pas d'ouverture.
4. Utilisateur membre d'aucun groupe alors que toutes les sociétés sont cloisonnées : listes vides et dossiers sans division seulement, pas de plantage.
5. Cellule de groupes mal saisie (espaces, `;` final, casse du GUID) : tolérée par `parseGroupIds`.

---

### Task 1 : Règles pures `perimetre.js`

**Files:** Create `src/lib/perimetre.js`, `src/lib/perimetre.test.js`

**Produces:**
- `parseGroupIds(cell) -> string[]` (minuscules, sans doublon)
- `allGroupIds(societes) -> string[]`
- `buildPerimetre({ societes, divisions, orgCos, canaux, mesGroupes }) -> perimetre`
- `societeDeDivision(perimetre, codeDivision) -> string | null`
- `peutVoirDossier(perimetre, codeDivision) -> boolean`
- `divisionsPour(perimetre, 'DE' | 'FL' | 'DS', codeDivisionDossier?) -> [{ id, value, designation }]`
- `canauxPour(perimetre, codeDivisionDossier?) -> [{ value, designation }]`
- `peutModifierBloc(perimetre, owner, codeDivisionDossier?) -> boolean`
- `societesAdministrables(perimetre) -> string[]`
- `ROLE_PAR_BLOC = { sc: 'adv', ind: 'industrie', com: 'commerce' }`

Entrées normalisées (produites par la tâche 2) :
`societe = { id, code, nom, groupes: { admin, adv, commerce, industrie, qualite } }` (cellules brutes),
`division = { id, value, designation, societe, type }`,
`orgCo = { id, value, designation, societe }`, `canal = { id, value, designation, orgCo }`.

- [ ] Écrire les tests (cas du tableau « Décisions » de la spec + Review Focus 1, 2, 4, 5)
- [ ] `npx vitest run src/lib/perimetre.test.js` → échec attendu
- [ ] Implémenter
- [ ] Tests verts

### Task 2 : Accès données `referentiels.js` et `groupes.js`

**Files:** Create `src/api/referentiels.js`, `src/api/groupes.js`, `src/api/groupes.test.js` ; modify `src/__test-stubs__/generated.js`

**Produces:**
- `listReferentiels() -> { societes, divisions, orgCos, canaux }`
- `updateSociete(id, { nom, groupes })`, `updateDivision(id, { designation, type })`, `updateOrgCo(id, { designation })`, `updateCanal(id, { designation })`
- `estMembre(membres, user) -> boolean` (pur : objectId, UPN ou e-mail)
- `resoudreMesGroupes(groupIds, user) -> { groupes: string[], erreurs: string[] }`
- `getUtilisateur() -> { objectId, upn, nom }`

- [ ] Tests de `estMembre` et du cas d'erreur de `resoudreMesGroupes` (service injecté)
- [ ] Implémenter, tests verts

### Task 3 : Contexte React

**Files:** Create `src/lib/PerimetreContext.jsx` ; modify `src/App.jsx`

**Produces:** `PerimetreProvider`, `usePerimetre() -> { perimetre, utilisateur, erreurs, isLoading, refetch }`

- [ ] Provider sous `QueryClientProvider`, spinner tant que le périmètre charge
- [ ] Simulation locale via `localStorage.perimetre_groupes`

### Task 4 : Code division dans les formes de liste et de fiche

**Files:** Modify `src/api/projet.js` (`toListShape`), `src/api/fiche.js` (`toFicheListShape`, `toFicheShape`), tests associés

- [ ] Ajouter `division` (code division du dossier) aux trois formes, avec test

### Task 5 : Menu, listes, accès aux dossiers

**Files:** Modify `src/Layout.jsx`, `src/pages/Accueil.jsx`, `src/pages/DemandesEtude.jsx`, `src/pages/Dashboard.jsx` ; create `src/components/AccesRefuse.jsx`

- [ ] Entrée Admin conditionnelle, nom de société
- [ ] Filtre `peutVoirDossier` sur les trois listes (données réelles)

### Task 6 : DE / DS

**Files:** Modify `src/pages/CreerDE.jsx`

- [ ] Divisions DE via `divisionsPour('DE')`, divisions DS via `divisionsPour('DS')`
- [ ] Accès refusé si le dossier rechargé est hors périmètre

### Task 7 : FL

**Files:** Modify `src/pages/FicheDetailV2.jsx`, `src/components/fiche/VisaToolbar.jsx`, `src/components/fiche/CommerceSection.jsx`, `src/components/fiche/SupplyChainSection.jsx`, `src/pages/FicheDetail.jsx`, `src/api/ficheCanaux.js`

- [ ] Édition par bloc (`peutModifierBloc`) et barre de visas en lecture seule hors rôle
- [ ] Sites de stockage via `divisionsPour('FL')`, canaux via `canauxPour`
- [ ] Désignation des canaux lue dans la table référentiel
- [ ] Accès refusé hors périmètre

### Task 8 : Admin

**Files:** Create `src/components/admin/ReferentielsSociete.jsx` ; modify `src/pages/Admin.jsx`, `src/lib/adminLists.js`

- [ ] Garde d'accès
- [ ] Quatre listes en modification seule, type PROD/STOCK en menu déroulant
- [ ] Retrait de `canaux_distrib` des listes option-set

### Task 9 : Vérification

- [ ] `npm test`, `npm run lint`, `npm run build`
