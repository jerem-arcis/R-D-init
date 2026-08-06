# FL sur Dataverse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire de la ligne `cr04e_projet` la source unique de la FL (lecture/écriture Dataverse), avec ses 2 tables filles `new_libellepays` et `cr04e_unitofmeasure`, en remplacement du store localStorage `base44.FicheLancement`.

**Architecture:** Une couche de mapping isolée et testée (`src/api/fiche.js` + 2 modules filles) traduit `cr04e_projet` ↔ objet FL (mêmes noms de champs qu'aujourd'hui → UI/PDF inchangés). Les 2 vues, la liste (Accueil) et la synthèse SAP consomment cette couche. Les tables filles sont synchronisées ligne par ligne (create/update/delete) à la sauvegarde, après le parent.

**Tech Stack:** React 18, @tanstack/react-query, Vitest, services Power Apps générés (`@/generated`), helpers Dataverse existants (`src/api/_odata.js`, `src/api/sapLists.js`).

## Global Constraints

- Visas = 3 booléens uniquement (`cr04e_visasupplychain/industriel/commerce`). Pas de date de visa, pas de motif de refus.
- Statut SAP porté par `cr04e_statut_en_cours` (valeur `fl_sap_cree`). Pas de `cree_sap_par`/`date_creation_sap`.
- Lookups (centre profit, hiérarchie) : écrits **par leur code**, résolus en `@odata.bind` via `lookupBind(clé, code, sapOptions[clé])`. Lecture via libellé formaté `@OData.Community.Display.V1.FormattedValue`.
- `?id=` des pages détail = **GUID du projet** (`cr04e_projetid`).
- Liste FL = projets `cr04e_statut_en_cours ∈ { 'dl_validee', 'fl_sap_cree' }`.
- Pas de migration des données localStorage (démo jetable).
- Forcer `Accept-Language: en-US` déjà géré par `postFlow` (hors périmètre ici).

---

## Phase 1 — Parent (`cr04e_projet`)

### Task 1: Mapping pur `toFicheShape` / `buildFichePayload`

**Files:**
- Create: `src/api/fiche.js`
- Test: `src/api/fiche.test.js`

**Interfaces:**
- Consumes: `lookupBind` de `@/api/sapLists` ; `toNumber`, `trimOrUndef` de `@/api/_odata` ; `FMT` (annotation formatée) local.
- Produces:
  - `toFicheShape(projet) -> ficheObj` (mêmes noms de champs que la FL actuelle, hors tables filles).
  - `buildFichePayload(patch, { sapOptions }) -> payload cr04e_projet` (seuls les champs présents dans `patch`).
  - `FICHE_FIELD_MAP` (objet FLfield -> colonne) pour réutilisation/tests.
  - `PROJET_STATUT_FL = { dl_validee:'dl_validee', fl_sap_cree:'fl_sap_cree' }`.

- [ ] **Step 1: Écrire le test aller-retour + lookups + visas + statut SAP**

```js
import { describe, it, expect } from 'vitest';
import { toFicheShape, buildFichePayload } from './fiche';

const FMT = '@OData.Community.Display.V1.FormattedValue';

describe('toFicheShape', () => {
  it('mappe les champs scalaires + lookups (libellé formaté) + visas + statut SAP', () => {
    const projet = {
      cr04e_projetid: 'g1',
      cr04e_codechapeau: '742001',
      cr04e_nomduproduitdesignation: 'Tarte citron',
      cr04e_codeprojet: 'PJ5976',
      cr04e_dureedevie: '12',
      cr04e_typedusine: 'Z008 - Bonloc',
      cr04e_visacommerce: true,
      cr04e_visaindustriel: false,
      cr04e_statut_en_cours: 'fl_sap_cree',
      [`_cr04e_centredeprofit_value${FMT}`]: '12043',
      [`_cr04e_hierarchieproduitfamille_value${FMT}`]: '22 DE Pât',
    };
    const f = toFicheShape(projet);
    expect(f.id).toBe('g1');
    expect(f.code_article).toBe('742001');
    expect(f.code_chapeau).toBe('742001');
    expect(f.libelle_article).toBe('Tarte citron');
    expect(f.duree_vie).toBe('12');
    expect(f.type_usine).toBe('Z008 - Bonloc');
    expect(f.visa_commerce).toBe(true);
    expect(f.visa_industriel).toBe(false);
    expect(f.centre_profit).toBe('12043');
    expect(f.hierarchie_produit).toBe('22 DE Pât');
    expect(f.statut_sap).toBe('Création SAP effectuée');
  });
});

describe('buildFichePayload', () => {
  const sapOptions = {
    centres_profit: [{ id: 'cep1', value: '12043' }],
    familles_produit: [],
  };
  it('ne mappe que les champs présents et résout le lookup centre profit par code', () => {
    const p = buildFichePayload({ libelle_long_40: 'Libellé', centre_profit: '12043' }, { sapOptions });
    expect(p.cr04e_libellelong40caracteres).toBe('Libellé');
    expect(p['cr04e_Centredeprofit@odata.bind']).toBe('/cr04e_centredeprofitcepcts(cep1)');
    expect(p.cr04e_codechapeau).toBeUndefined();
  });
  it('omet le lookup hiérarchie quand le référentiel est vide (best-effort)', () => {
    const p = buildFichePayload({ hierarchie_produit: '22 DE Pât' }, { sapOptions });
    expect(p['cr04e_Hierarchieproduitfamille@odata.bind']).toBeUndefined();
  });
  it('mappe le visa booléen et le statut SAP', () => {
    expect(buildFichePayload({ visa_commerce: true }).cr04e_visacommerce).toBe(true);
    expect(buildFichePayload({ statut_sap: 'Création SAP effectuée' }).cr04e_statut_en_cours).toBe('fl_sap_cree');
  });
});
```

- [ ] **Step 2: Lancer le test → échoue** (`npx vitest run src/api/fiche.test.js`, module absent).

- [ ] **Step 3: Implémenter `src/api/fiche.js`** — table de mapping (scalaires texte, nombres via `toNumber`, dates telles quelles, booléens visas), lookups via `lookupBind`, statut SAP dérivé. Voir « Détail mapping » ci-dessous.

- [ ] **Step 4: Lancer le test → passe.**

- [ ] **Step 5: Commit** `feat(fl): mapping pur projet <-> fiche (toFicheShape/buildFichePayload)`

**Détail mapping (référence d'implémentation) :**

- Scalaires texte (FL -> colonne) : voir tableau du spec. `trimOrUndef` à l'écriture, `?? ''` à la lecture.
- Nombres : `temps_reception_usine` (`cr04e_tempsdereceptionusinej` est du texte dans le modèle → traiter en texte). Aucun nombre parent hors ceux du projet DE (poids/qté restent gérés par la DE) → tout en texte/`trimOrUndef` sauf visas (booléens).
- Lookups : `centre_profit` -> `['centres_profit','cr04e_Centredeprofit@odata.bind']` ; `hierarchie_produit` -> `['familles_produit','cr04e_Hierarchieproduitfamille@odata.bind']`. Écriture : `lookupBind(clé, code, sapOptions[clé])`, ajouté seulement si non nul.
- Statut SAP : lecture `cr04e_statut_en_cours === 'fl_sap_cree'` -> `statut_sap = 'Création SAP effectuée'` (sinon champ absent). Écriture `patch.statut_sap === 'Création SAP effectuée'` -> `cr04e_statut_en_cours = 'fl_sap_cree'`.

---

### Task 2: Liste FL depuis les projets

**Files:**
- Modify: `src/api/fiche.js` (ajout `toFicheListShape`, `listFiches`)
- Modify: `src/api/projet.js` (ajout `PROJET_STATUT.fl_sap_cree`)
- Test: `src/api/fiche.test.js` (ajout)

**Interfaces:**
- Consumes: `listProjets` de `@/api/projet`.
- Produces: `listFiches() -> Promise<ficheListItem[]>` où `ficheListItem = { id, code_article, libelle_article, usine, type_demande, statut_sap, visas_valides, created_date }`.

- [ ] **Step 1: Test `toFicheListShape`**

```js
import { toFicheListShape } from './fiche';
it('projette une ligne liste FL avec usine/type/visas', () => {
  const item = toFicheListShape({
    cr04e_projetid: 'g1', cr04e_codechapeau: '742001',
    cr04e_nomduproduitdesignation: 'Tarte', cr04e_divisionusinename: 'Bonloc',
    cr04e_typedelademande: 'Création', cr04e_visacommerce: true,
    cr04e_visaindustriel: true, cr04e_visasupplychain: false,
    cr04e_statut_en_cours: 'dl_validee', createdon: '2026-08-01',
  });
  expect(item).toMatchObject({ id: 'g1', code_article: '742001', usine: 'Bonloc', type_demande: 'Création', visas_valides: 2 });
});
```

- [ ] **Step 2: Test → échoue.**
- [ ] **Step 3: Implémenter `toFicheListShape` + `listFiches` (filtre statut ∈ {dl_validee, fl_sap_cree}, tri par createdon desc) ; ajouter `fl_sap_cree` à `PROJET_STATUT`.**
- [ ] **Step 4: Test → passe.**
- [ ] **Step 5: Commit** `feat(fl): liste FL dérivée des projets Dataverse`

---

### Task 3: Accès service `getFicheById` / `updateFiche`

**Files:**
- Modify: `src/api/fiche.js`

**Interfaces:**
- Consumes: `Cr04e_projetsService` de `@/generated` ; `toFicheShape`, `buildFichePayload`.
- Produces:
  - `getFicheById(id) -> Promise<ficheObj|null>` (Phase 1 : parent seul ; étendu Phase 2/3).
  - `updateFiche(id, patch, { sapOptions }) -> Promise<void>` (Phase 1 : parent seul ; étendu Phase 2/3).

- [ ] **Step 1: Implémenter** (thin wrappers ; `getFicheById` = `Cr04e_projetsService.get(id)` -> `toFicheShape` ; `updateFiche` = `buildFichePayload` -> `Cr04e_projetsService.update(id, payload)`. Réutiliser un `unwrap` local calqué sur `projet.js`).
- [ ] **Step 2: Lint** `npx eslint src/api/fiche.js` → 0 erreur.
- [ ] **Step 3: Commit** `feat(fl): getFicheById/updateFiche (accès Dataverse)`

*(Pas de test unitaire : accès service pur, couvert par les fonctions pures et le lint. Le comportement réel se valide en app.)*

---

### Task 4: Brancher `FicheDetailV2` sur Dataverse

**Files:**
- Modify: `src/pages/FicheDetailV2.jsx`

- [ ] **Step 1:** Remplacer la query `['fiche', ficheId]` : `queryFn: () => getFicheById(ficheId)` (retire `base44...filter` et le `select`). Supprimer la query `de-for-fiche` et l'usage de `de` (le PDF reçoit un contexte dérivé du projet : `{ qte_previsionnelle_annuelle, usine }` lus depuis la fiche/projet — champs déjà présents via `toFicheShape` étendu si besoin, sinon `null`). Ajouter `const sap = useSapOptions();`.
- [ ] **Step 2:** `updateMutation.mutationFn = (data) => updateFiche(ficheId, data, { sapOptions: sap })`. Retirer `useInheritedProjetFields` (import + appel).
- [ ] **Step 3:** Lint `npx eslint src/pages/FicheDetailV2.jsx` → 0 erreur.
- [ ] **Step 4: Commit** `feat(fl): vue complète branchée sur cr04e_projet`

---

### Task 5: Brancher `FicheDetail` sur Dataverse

**Files:**
- Modify: `src/pages/FicheDetail.jsx`

- [ ] **Step 1:** Mêmes remplacements qu'en Task 4 (query `getFicheById`, mutation `updateFiche` avec `sapOptions`, retrait `de-for-fiche` + `useInheritedProjetFields`, ajout `useSapOptions`).
- [ ] **Step 2:** Lint → 0 erreur.
- [ ] **Step 3: Commit** `feat(fl): vue par service branchée sur cr04e_projet`

---

### Task 6: Liste Accueil + badge Layout

**Files:**
- Modify: `src/pages/Accueil.jsx`, `src/Layout.jsx`

- [ ] **Step 1:** `Accueil` : `queryFn: listFiches` (clé `['fiches']`). Adapter l'accès aux champs : `usine`/`type_demande` viennent désormais de l'item liste (plus de jointure DE). L'avancement = `visas_valides` (0–3). Lien détail = `?id=${item.id}`.
- [ ] **Step 2:** `Layout` : `queryFn: listFiches` (clé `['fiches']`). `getStaleWaitingTransitions` reçoit la même forme (adapter si nécessaire aux champs présents).
- [ ] **Step 3:** Lint sur les 2 fichiers → 0 erreur.
- [ ] **Step 4: Commit** `feat(fl): liste FL (Accueil + badge) sur Dataverse`

---

### Task 7: Création SAP via `updateFiche`

**Files:**
- Modify: `src/components/fiche/FLSynthesisSection.jsx`

- [ ] **Step 1:** `createSAPMutation.mutationFn` : `updateFiche(fiche.id, { statut_sap: 'Création SAP effectuée' }, { sapOptions })`. Retirer l'écriture `base44` + `cree_sap_par`/`date_creation_sap`. Le composant reçoit `sapOptions` en prop (passé par la vue) ou appelle `useSapOptions()`. Retirer aussi le champ « Code chapeau » déjà supprimé ailleurs (déjà fait). L'invalidation vise `['fiche', fiche.id]` + `['fiches']`.
- [ ] **Step 2:** Lint → 0 erreur.
- [ ] **Step 3: Commit** `feat(fl): création SAP via statut projet`

---

### Task 8: Retrait du store localStorage FL et du code mort

**Files:**
- Modify: `src/api/base44Client.js`, `src/api/entities.js`, `src/pages/DemandesEtude.jsx`
- Delete: `src/pages/CreerFL.jsx`, `src/lib/useInheritedProjetFields.js`, `src/lib/flFromProjet.js`, `src/lib/flFromProjet.test.js`
- Modify: routeur (là où `CreerFL` est enregistrée)

- [ ] **Step 1:** `DemandesEtude` : retirer la matérialisation (`FicheLancement.list`/`create` + `ficheFromProjet`). La FL existe = le projet dès `dl_validee` ; le lien « ouvrir la FL » navigue vers `FicheDetailV2?id=<projetId>`.
- [ ] **Step 2:** Supprimer `FicheLancement` de `base44Client.js` + `entities.js`. Supprimer `CreerFL.jsx`, `useInheritedProjetFields.js`, `flFromProjet.js(.test)`. Retirer la route `CreerFL` et les imports orphelins.
- [ ] **Step 3:** `npx vitest run` (toute la suite) → vert ; `npx eslint src` sur les fichiers touchés → 0 erreur ; `grep` de `FicheLancement`/`ficheFromProjet`/`useInheritedProjetFields` → plus aucune référence applicative.
- [ ] **Step 4: Commit** `refactor(fl): retire le store localStorage et la matérialisation`

---

## Phase 2 — Libellé par pays (`new_libellepays`)

### Task 9: Module `ficheLibellePays.js` (mapping + sync pur)

**Files:**
- Create: `src/api/ficheLibellePays.js`
- Test: `src/api/ficheLibellePays.test.js`

**Interfaces:**
- Produces:
  - `diffLibelles(existants, saisis) -> { toCreate, toUpdate, toDelete }` (pur, testé). `existants = [{ id, code, libelle }]`, `saisis = [{ code, libelle }]`, appariement par `code`, ignore les libellés vides.
  - `listForProjet(projetId) -> Promise<[{ id, code, libelle }]>`.
  - `syncForProjet(projetId, saisis) -> Promise<void>` (create avec `new_IDProjet@odata.bind`, update, delete).

- [ ] **Step 1: Test `diffLibelles`**

```js
import { diffLibelles } from './ficheLibellePays';
it('classe création / mise à jour / suppression par code', () => {
  const d = diffLibelles(
    [{ id: 'r1', code: 'FR', libelle: 'Vieux' }, { id: 'r2', code: 'EN', libelle: 'Old' }],
    [{ code: 'FR', libelle: 'Neuf' }, { code: 'ES', libelle: 'Nuevo' }, { code: 'DE', libelle: '' }],
  );
  expect(d.toUpdate).toEqual([{ id: 'r1', code: 'FR', libelle: 'Neuf' }]);
  expect(d.toCreate).toEqual([{ code: 'ES', libelle: 'Nuevo' }]);
  expect(d.toDelete.map((x) => x.id)).toEqual(['r2']);
});
```

- [ ] **Step 2: Test → échoue.**
- [ ] **Step 3: Implémenter** `diffLibelles` (pur) + `listForProjet` (filtre `_new_idprojet_value`, map `new_langue`/`new_libelle`) + `syncForProjet` (applique le diff via `New_libellepaysesService`).
- [ ] **Step 4: Test → passe.**
- [ ] **Step 5: Commit** `feat(fl): sync libellé par pays (new_libellepays)`

### Task 10: Brancher libellé par pays dans get/update

**Files:**
- Modify: `src/api/fiche.js`

- [ ] **Step 1:** `getFicheById` : après le parent, `fiche.libelle_par_pays = await listForProjet(id)`. `updateFiche` : si `patch.libelle_par_pays` défini, `await syncForProjet(id, patch.libelle_par_pays)` (et ne pas envoyer ce champ au payload parent).
- [ ] **Step 2:** Lint → 0 erreur ; suite Vitest verte.
- [ ] **Step 3: Commit** `feat(fl): libellé par pays lu/écrit avec la FL`

---

## Phase 3 — Emballages / GTIN (`cr04e_unitofmeasure`)

### Task 11: Module `ficheEmballages.js` (mapping + sync pur)

**Files:**
- Create: `src/api/ficheEmballages.js`
- Test: `src/api/ficheEmballages.test.js`

**Interfaces:**
- Produces:
  - `BLOC_UNIT = { uvc_block:'ST', element_block:'PCE', couche_block:'LAY', colis_block:'CAR', palette_block:'PAL' }` (codes AUoM — **à confirmer**).
  - `blocToRow(blocKey, bloc) -> row` et `rowToBloc(row) -> { key, bloc }` (purs, testés).
  - `diffEmballages(existants, blocs) -> { toCreate, toUpdate, toDelete }` (appariement par code unité, ignore blocs vides).
  - `listForProjet(projetId)` / `syncForProjet(projetId, blocs)`.

- [ ] **Step 1: Test `blocToRow` + `diffEmballages`**

```js
import { blocToRow, diffEmballages } from './ficheEmballages';
it('mappe un bloc colis vers une ligne unitofmeasure', () => {
  const r = blocToRow('colis_block', { unite: 6, poids_brut: 2.4, poids_net: 2, long: 300, larg: 200, haut: 150, volume: 0.009, gtin: '3251510000010' });
  expect(r).toMatchObject({
    cr04e_alternativeunit: 'CAR', cr04e_grossweight: '2.4', cr04e_netweight: '2',
    cr04e_unitspecificproductlength: '300', cr04e_unitspecificproductwidth: '200',
    cr04e_unitspecificproductheight: '150', cr04e_materialvolume: '0.009',
    cr04e_globaltradeitemnumber: '3251510000010',
  });
});
it('ignore les blocs vides et supprime les lignes obsolètes', () => {
  const d = diffEmballages([{ id: 'u1', cr04e_alternativeunit: 'PAL' }], { colis_block: { unite: 6 }, palette_block: {} });
  expect(d.toCreate).toHaveLength(1);
  expect(d.toDelete.map((x) => x.id)).toEqual(['u1']);
});
```

- [ ] **Step 2: Test → échoue.**
- [ ] **Step 3: Implémenter** `BLOC_UNIT`, `blocToRow`/`rowToBloc`, `diffEmballages`, `listForProjet`, `syncForProjet` (via `Cr04e_unitofmeasuresService`, lookup `cr04e_IDprojet@odata.bind`). Un bloc est « vide » si toutes ses valeurs (hors clé) sont nulles/vides.
- [ ] **Step 4: Test → passe.**
- [ ] **Step 5: Commit** `feat(fl): sync emballages/GTIN (cr04e_unitofmeasure)`

### Task 12: Brancher emballages dans get/update

**Files:**
- Modify: `src/api/fiche.js`

- [ ] **Step 1:** `getFicheById` : après le parent, charger les lignes et poser `fiche.uvc_block/element_block/couche_block/colis_block/palette_block` via `rowToBloc`. `updateFiche` : si un des 5 blocs est présent dans `patch`, `await syncForProjet(id, blocsCourants)` (et retirer les blocs du payload parent).
- [ ] **Step 2:** Lint → 0 erreur ; suite Vitest verte.
- [ ] **Step 3: Commit** `feat(fl): emballages/GTIN lus/écrits avec la FL`

---

## Self-Review

- **Couverture spec :** parent (T1–T3), 2 vues (T4–T5), liste (T6), SAP (T7), suppressions (T8), libellé pays (T9–T10), emballages (T11–T12). ✓
- **Placeholders :** codes AUoM Phase 3 marqués « à confirmer » avec défaut fonctionnel — mécanisme complet, pas de TODO bloquant.
- **Cohérence des types :** `toFicheShape`/`buildFichePayload` symétriques ; `getFicheById`/`updateFiche` étendus en T10/T12 sans changer leur signature ; `listFiches` -> forme liste consommée par Accueil/Layout.
