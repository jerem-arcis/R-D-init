# DS (Commerce/Marketing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le formulaire « Autre » en **DS** (Demande Spécifique) avec ses règles métier, sa persistance dans `cr04e_projet`, et le workflow 2 acteurs (Commerce crée → ADV pousse vers SAP).

**Architecture:** Règles métier isolées dans un module pur testé (`src/lib/dsRules.js`), réutilisées par le formulaire (`CreerDE.jsx`) et la couche persistance (`src/api/ds.js`). La DS vit dans la table partagée `cr04e_projet`, différenciée par des statuts DS dédiés. L'ADV rouvre une DS depuis Dataverse et déclenche le push SAP existant.

**Tech Stack:** React (JSX), react-router, @tanstack/react-query, Power Apps SDK (`@microsoft/power-apps`), Dataverse via services générés, vitest (tests unitaires node).

## Global Constraints

- Tests unitaires : **vitest**, environnement node, fichiers `src/**/*.test.{js,jsx}`. Lancer : `npm test` (= `vitest run`).
- Build de validation UI : `npm run build` (doit finir par `✓ built`). Pas de harness de test composant dans ce repo → les tâches UI se vérifient par build + checklist manuelle.
- **Aucun commit** n'est poussé sans validation utilisateur explicite (préférence projet). Les `git commit` du plan restent locaux.
- Codes division (référentiel SAP) : Bonloc 2886, Rivesaltes 2866, Aire 2859, Agen 2847, Faux frais STEF Agen 2823, Produit négoce 2820.
- Agen « Faux Frais Autre » → division **2847** (hypothèse à confirmer ; seul FF STEF a 2823).
- 4 colonnes Dataverse à créer côté Jeremy avant le run réel : `cr04e_centredeprofit`, `cr04e_codedivisionorigine`, `cr04e_service`, `cr04e_description` (+ régénérer `src/generated/`). Le code se construit sans elles ; seule la persistance runtime de ces 4 champs en dépend.

---

## File Structure

- `src/lib/dsRules.js` (créer) — règles pures DS : usines/divisions, Agen, activité→hiérarchie, classe valo, centre profit, secteur, listes/constantes.
- `src/lib/dsRules.test.js` (créer) — tests des règles.
- `src/lib/deStatus.js` (modifier) — ajouter les statuts DS.
- `src/api/projet.js` (modifier) — `PROJET_STATUT` (statuts DS) + détection type DS dans `toListShape`.
- `src/api/sapLists.js` (modifier) — helper `codeFromLookupValue` (rétro-résolution GUID→code).
- `src/api/sapLists.test.js` (créer) — test du helper.
- `src/api/ds.js` (créer) — `buildDsPayload`, `createDsFromForm`, `updateDsFromForm`, `getDsById`, `DS_STATUTS`.
- `src/api/ds.test.js` (créer) — test `buildDsPayload`.
- `src/pages/CreerDE.jsx` (modifier) — formulaire DS (règles + UI), persistance, réouverture ADV, push SAP DS.
- `src/pages/DemandesEtude.jsx` (modifier) — badge DS + routage.

---

## Task 1: Module de règles DS (`dsRules.js`)

**Files:**
- Create: `src/lib/dsRules.js`
- Test: `src/lib/dsRules.test.js`

**Interfaces:**
- Produces :
  - `USINES_ORIGINE: string[]`, `USINES_FABRICATION: string[]`, `ACTIVITES: string[]`, `TYPES_MARQUE: string[]`, `AGEN_TYPES: string[]`, `AGEN_CHOIX: string[]`, `TYPES_DEMANDE_NEGOCE: string[]` (= ['4','5'])
  - `codeDivisionOrigine(usine: string): string`
  - `codeDivisionFabrication({ type_demande, usine, agen_type }): string`
  - `computeHierarchieDS(activite: string): string`
  - `computeClasseValoDS({ usine, type_demande, activite }): string`
  - `computeCentreProfitDS({ usine, activite, type_demande, agen_choix }): string`
  - `computeSecteurDS(type_marque: string): string`
  - `isTypeNegoce(type_demande: string): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/lib/dsRules.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  codeDivisionOrigine,
  codeDivisionFabrication,
  computeHierarchieDS,
  computeClasseValoDS,
  computeCentreProfitDS,
  computeSecteurDS,
  isTypeNegoce,
} from './dsRules';

describe('codeDivisionOrigine', () => {
  it('mappe chaque usine d’origine vers son code', () => {
    expect(codeDivisionOrigine('Bonloc')).toBe('2886');
    expect(codeDivisionOrigine('Rivesaltes')).toBe('2866');
    expect(codeDivisionOrigine('Aire')).toBe('2859');
    expect(codeDivisionOrigine('Agen')).toBe('2847');
    expect(codeDivisionOrigine('Faux frais STEF Agen')).toBe('2823');
    expect(codeDivisionOrigine('Produit négoce')).toBe('2820');
  });
  it('vide si inconnu', () => {
    expect(codeDivisionOrigine('')).toBe('');
    expect(codeDivisionOrigine('X')).toBe('');
  });
});

describe('isTypeNegoce', () => {
  it('vrai pour 4 et 5', () => {
    expect(isTypeNegoce('4')).toBe(true);
    expect(isTypeNegoce('5')).toBe(true);
    expect(isTypeNegoce('1')).toBe(false);
  });
});

describe('codeDivisionFabrication', () => {
  it('types négoce 4/5 → 2820 quelle que soit l’usine', () => {
    expect(codeDivisionFabrication({ type_demande: '4', usine: 'Bonloc' })).toBe('2820');
    expect(codeDivisionFabrication({ type_demande: '5', usine: 'Agen' })).toBe('2820');
  });
  it('Agen + Faux Frais STEF → 2823, sinon Agen → 2847', () => {
    expect(codeDivisionFabrication({ type_demande: '1', usine: 'Agen', agen_type: 'Faux Frais STEF' })).toBe('2823');
    expect(codeDivisionFabrication({ type_demande: '1', usine: 'Agen', agen_type: 'Surgelé' })).toBe('2847');
    expect(codeDivisionFabrication({ type_demande: '1', usine: 'Agen', agen_type: 'Faux Frais Autre' })).toBe('2847');
  });
  it('autres usines → leur code', () => {
    expect(codeDivisionFabrication({ type_demande: '1', usine: 'Bonloc' })).toBe('2886');
    expect(codeDivisionFabrication({ type_demande: '6', usine: 'Aire' })).toBe('2859');
  });
});

describe('computeHierarchieDS', () => {
  it('activité → hiérarchie SAP', () => {
    expect(computeHierarchieDS('PATISSERIES')).toBe('22 DE DE DE');
    expect(computeHierarchieDS('TRAITEUR')).toBe('27 DE DE DE');
    expect(computeHierarchieDS('MOCHIS')).toBe('21 DE DE DE');
    expect(computeHierarchieDS('')).toBe('');
  });
});

describe('computeClasseValoDS', () => {
  it('production → 7012, Aire → 2038', () => {
    expect(computeClasseValoDS({ usine: 'Bonloc' })).toBe('7012');
    expect(computeClasseValoDS({ usine: 'Rivesaltes' })).toBe('7012');
    expect(computeClasseValoDS({ usine: 'Agen' })).toBe('7012');
    expect(computeClasseValoDS({ usine: 'Aire' })).toBe('2038');
  });
  it('négoce (4/5) : Traiteur → 2038, Pâtisseries → 2030, Mochis → vide', () => {
    expect(computeClasseValoDS({ type_demande: '4', activite: 'TRAITEUR' })).toBe('2038');
    expect(computeClasseValoDS({ type_demande: '5', activite: 'PATISSERIES' })).toBe('2030');
    expect(computeClasseValoDS({ type_demande: '4', activite: 'MOCHIS' })).toBe('');
  });
});

describe('computeCentreProfitDS', () => {
  it('règles par usine/activité', () => {
    expect(computeCentreProfitDS({ activite: 'MOCHIS' })).toBe('21PF');
    expect(computeCentreProfitDS({ usine: 'Aire' })).toBe('27TDL');
    expect(computeCentreProfitDS({ usine: 'Bonloc' })).toBe('22PF');
    expect(computeCentreProfitDS({ usine: 'Rivesaltes' })).toBe('22PF');
  });
  it('négoce 4/5', () => {
    expect(computeCentreProfitDS({ type_demande: '4', activite: 'PATISSERIES' })).toBe('22HA');
    expect(computeCentreProfitDS({ type_demande: '5', activite: 'TRAITEUR' })).toBe('27HA');
  });
  it('Agen selon le choix', () => {
    expect(computeCentreProfitDS({ usine: 'Agen', agen_choix: 'Pains surprises' })).toBe('27PS');
    expect(computeCentreProfitDS({ usine: 'Agen', agen_choix: 'Assortiments ou plateaux' })).toBe('27CA');
    expect(computeCentreProfitDS({ usine: 'Agen', agen_choix: 'Plaques' })).toBe('27PL');
    expect(computeCentreProfitDS({ usine: 'Agen' })).toBe('27CA');
  });
});

describe('computeSecteurDS', () => {
  it('type de marque → secteur', () => {
    expect(computeSecteurDS('Marque Nationale RHF / Export')).toBe('10');
    expect(computeSecteurDS('Marque Nationale GMS')).toBe('12');
    expect(computeSecteurDS('Marque distributeur')).toBe('15');
    expect(computeSecteurDS('')).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dsRules.test.js`
Expected: FAIL (module `./dsRules` introuvable).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/dsRules.js`:

```js
// Règles métier de la DS (Demande Spécifique), pures et testées. Réutilisées par
// le formulaire (CreerDE.jsx) et la persistance (api/ds.js). Reprend la logique
// auparavant inline dans CreerDE (classe valo / centre profit / secteur) + ajoute
// les règles du scope Commerce/Marketing (usines origine/fabrication, Agen).

export const ACTIVITES = ['PATISSERIES', 'TRAITEUR', 'MOCHIS'];
export const TYPES_MARQUE = ['Marque Nationale RHF / Export', 'Marque Nationale GMS', 'Marque distributeur'];
export const AGEN_TYPES = ['Surgelé', 'Faux Frais STEF', 'Faux Frais Autre'];
export const AGEN_CHOIX = ['Assortiments ou plateaux', 'Pains surprises', 'Plaques'];

// Usines d'origine (avec leur code division). « Produit négoce » n'est proposé
// que pour les types de demande 4 et 5.
const DIVISION_ORIGINE = {
  Bonloc: '2886',
  Rivesaltes: '2866',
  Aire: '2859',
  Agen: '2847',
  'Faux frais STEF Agen': '2823',
  'Produit négoce': '2820',
};
export const USINES_ORIGINE = Object.keys(DIVISION_ORIGINE);
// Usines de fabrication : mêmes sites, hors « Faux frais STEF Agen » (géré via les
// 2 listes Agen) et hors négoce (forcé pour les types 4/5).
export const USINES_FABRICATION = ['Bonloc', 'Rivesaltes', 'Aire', 'Agen'];

export const isTypeNegoce = (t) => ['4', '5'].includes(String(t ?? '').trim());

export const codeDivisionOrigine = (usine) => DIVISION_ORIGINE[usine] || '';

// Division de fabrication (celle envoyée à SAP).
export const codeDivisionFabrication = ({ type_demande, usine, agen_type } = {}) => {
  if (isTypeNegoce(type_demande)) return '2820';
  if (usine === 'Agen') return agen_type === 'Faux Frais STEF' ? '2823' : '2847';
  return DIVISION_ORIGINE[usine] || '';
};

export const computeHierarchieDS = (activite) => {
  if (activite === 'PATISSERIES') return '22 DE DE DE';
  if (activite === 'TRAITEUR') return '27 DE DE DE';
  if (activite === 'MOCHIS') return '21 DE DE DE';
  return '';
};

// Classe de valorisation. Dépôts de production → 7012, Aire → 2038. En négoce
// (4/5) : Traiteur → 2038, Pâtisseries → 2030, Mochis → vide.
export const computeClasseValoDS = ({ usine, type_demande, activite } = {}) => {
  if (['Rivesaltes', 'Bonloc', 'Agen'].includes(usine)) return '7012';
  if (usine === 'Aire') return '2038';
  if (isTypeNegoce(type_demande) && activite === 'TRAITEUR') return '2038';
  if (isTypeNegoce(type_demande) && activite === 'PATISSERIES') return '2030';
  return '';
};

export const computeCentreProfitDS = ({ usine, activite, type_demande, agen_choix } = {}) => {
  if (activite === 'MOCHIS') return '21PF';
  if (usine === 'Aire') return '27TDL';
  if (usine === 'Rivesaltes' || usine === 'Bonloc') return '22PF';
  if (isTypeNegoce(type_demande) && activite === 'PATISSERIES') return '22HA';
  if (isTypeNegoce(type_demande) && activite === 'TRAITEUR') return '27HA';
  if (usine === 'Agen') {
    if (agen_choix === 'Pains surprises') return '27PS';
    if (agen_choix === 'Assortiments ou plateaux') return '27CA';
    if (agen_choix === 'Plaques') return '27PL';
    return '27CA';
  }
  return '';
};

export const computeSecteurDS = (type_marque) => {
  if (type_marque === 'Marque Nationale RHF / Export') return '10';
  if (type_marque === 'Marque Nationale GMS') return '12';
  if (type_marque === 'Marque distributeur') return '15';
  return '';
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dsRules.test.js`
Expected: PASS (tous les `describe`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dsRules.js src/lib/dsRules.test.js
git commit -m "feat(ds): module de regles metier DS (pur, teste)"
```

---

## Task 2: Statuts DS

**Files:**
- Modify: `src/lib/deStatus.js`
- Modify: `src/api/projet.js` (objet `PROJET_STATUT`)
- Test: `src/lib/deStatus.test.js` (créer)

**Interfaces:**
- Produces : `STATUTS.ds_brouillon`, `STATUTS.en_attente_creation_code_chapeau` (existe déjà), `STATUTS.ds_validee` ; `PROJET_STATUT.ds_brouillon`, `PROJET_STATUT.en_attente_creation_code_chapeau`, `PROJET_STATUT.ds_validee`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/deStatus.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { STATUTS, getStatutMeta } from './deStatus';

describe('statuts DS', () => {
  it('expose les 3 statuts DS', () => {
    expect(STATUTS.ds_brouillon?.label).toBe('Brouillon DS');
    expect(STATUTS.en_attente_creation_code_chapeau?.label).toBe('En attente de création de code chapeau');
    expect(STATUTS.ds_validee?.label).toBe('DS validée');
  });
  it('getStatutMeta retombe sur brouillon si inconnu', () => {
    expect(getStatutMeta('zzz').key).toBe('brouillon');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/deStatus.test.js`
Expected: FAIL (`ds_brouillon` / `ds_validee` undefined).

- [ ] **Step 3: Write minimal implementation**

In `src/lib/deStatus.js`, replace the `STATUTS` object so it includes the DS statuses (keep existing keys, add `ds_brouillon` and `ds_validee`, keep `en_attente_creation_code_chapeau`):

```js
export const STATUTS = {
  brouillon: { key: "brouillon", label: "Brouillon", tone: "amber", order: 0 },
  ds_brouillon: { key: "ds_brouillon", label: "Brouillon DS", tone: "amber", order: 0 },
  en_attente_code_chapeau: {
    key: "en_attente_code_chapeau",
    label: "En attente de code chapeau",
    tone: "blue",
    order: 1,
  },
  en_attente_creation_code_chapeau: {
    key: "en_attente_creation_code_chapeau",
    label: "En attente de création de code chapeau",
    tone: "blue",
    order: 1,
  },
  en_attente_dl: {
    key: "en_attente_dl",
    label: "En attente de DL",
    tone: "violet",
    order: 2,
  },
  en_attente_validation_dl: {
    key: "en_attente_validation_dl",
    label: "En attente de validation DL",
    tone: "indigo",
    order: 3,
  },
  validee: { key: "validee", label: "Validée", tone: "emerald", order: 4 },
  ds_validee: { key: "ds_validee", label: "DS validée", tone: "emerald", order: 4 },
  refusee: { key: "refusee", label: "Refusée", tone: "red", order: 5 },
};
```

In `src/api/projet.js`, extend `PROJET_STATUT`:

```js
export const PROJET_STATUT = {
  brouillon: 'brouillon',
  en_attente_code_chapeau: 'en_attente_code_chapeau',
  en_attente_dl: 'en_attente_dl',
  ds_brouillon: 'ds_brouillon',
  en_attente_creation_code_chapeau: 'en_attente_creation_code_chapeau',
  ds_validee: 'ds_validee',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/deStatus.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/deStatus.js src/lib/deStatus.test.js src/api/projet.js
git commit -m "feat(ds): statuts DS (brouillon, attente creation code chapeau, validee)"
```

---

## Task 3: Rétro-résolution lookup (GUID → code)

**Files:**
- Modify: `src/api/sapLists.js`
- Test: `src/api/sapLists.test.js` (créer)

**Interfaces:**
- Consumes : `sapOptions[key]` = `[{ id, value, designation }]` (déjà fourni par `useSapOptions`).
- Produces : `codeFromLookupValue(key, guid, rows): string` — renvoie le `value` (code) de la ligne dont `id === guid`, sinon `''`.

- [ ] **Step 1: Write the failing test**

Create `src/api/sapLists.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { codeFromLookupValue } from './sapLists';

describe('codeFromLookupValue', () => {
  const rows = [
    { id: 'g1', value: '2886', designation: 'Bonloc' },
    { id: 'g2', value: '7012', designation: 'Prod' },
  ];
  it('retrouve le code depuis le GUID', () => {
    expect(codeFromLookupValue('divisions', 'g1', rows)).toBe('2886');
    expect(codeFromLookupValue('divisions', 'g2', rows)).toBe('7012');
  });
  it('vide si GUID absent / vide', () => {
    expect(codeFromLookupValue('divisions', 'gX', rows)).toBe('');
    expect(codeFromLookupValue('divisions', '', rows)).toBe('');
    expect(codeFromLookupValue('divisions', 'g1', [])).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/sapLists.test.js`
Expected: FAIL (`codeFromLookupValue` non exporté).

- [ ] **Step 3: Write minimal implementation**

Append to `src/api/sapLists.js`:

```js
// Rétro-résolution : à partir du GUID d'un lookup (_..._value renvoyé par Dataverse)
// et des lignes déjà chargées ({ id, value }), retrouve le code affiché. Sert à
// réhydrater un formulaire (DE/DS) ouvert depuis Dataverse. '' si introuvable.
export function codeFromLookupValue(key, guid, rows = []) {
  if (!guid) return '';
  const match = rows.find((r) => r.id === guid);
  return match ? String(match.value) : '';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/api/sapLists.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/sapLists.js src/api/sapLists.test.js
git commit -m "feat(sap): helper codeFromLookupValue (retro-resolution lookup)"
```

---

## Task 4: Persistance DS (`api/ds.js`)

**Files:**
- Create: `src/api/ds.js`
- Test: `src/api/ds.test.js`

**Interfaces:**
- Consumes : `dsRules` (calculs), `lookupBind` (sapLists), `Cr04e_projetsService`, `PROJET_STATUT`.
- Produces :
  - `buildDsPayload(formData, { sapOptions, statut }): object` — payload `cr04e_projet`.
  - `createDsFromForm(formData, ctx): Promise<record>`
  - `updateDsFromForm(id, formData, ctx): Promise<record>`
  - `getDsById(id, sapOptions): Promise<formData|null>`
  - `DS_STATUTS: string[]` (les 3 statuts DS, pour la détection liste).

`formData` DS attendu (champs `autre_*`) : `autre_demandeur, autre_date, autre_service, autre_type_demande, autre_description, autre_code_origine, autre_usine_origine, autre_besoin_vl, autre_besoin_nouveau_code, autre_designation, autre_usine_fab, autre_agen_type, autre_agen_choix, autre_activite, autre_poids_net_uv, autre_type_marque, code_chapeau, projet_id`.

- [ ] **Step 1: Write the failing test**

Create `src/api/ds.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildDsPayload, DS_STATUTS } from './ds';

const sapOptions = {
  divisions: [{ id: 'dBon', value: '2886' }, { id: 'dAire', value: '2859' }],
  classes_valorisation: [{ id: 'c7012', value: '7012' }, { id: 'c2038', value: '2038' }],
  familles_produit: [{ id: 'h22', value: '22 DE DE DE' }],
  centres_profit: [{ id: 'cp22', value: '22PF' }],
};

const base = {
  autre_demandeur: 'Jean',
  autre_date: '2026-07-02',
  autre_service: 'Marketing',
  autre_type_demande: '1',
  autre_description: 'Besoin X',
  autre_code_origine: '12345678',
  autre_usine_origine: 'Aire',
  autre_designation: 'Tarte test',
  autre_usine_fab: 'Bonloc',
  autre_activite: 'PATISSERIES',
  autre_poids_net_uv: '0.25',
  autre_type_marque: 'Marque Nationale GMS',
  code_chapeau: '741603',
};

describe('DS_STATUTS', () => {
  it('liste les 3 statuts DS', () => {
    expect(DS_STATUTS).toEqual(['ds_brouillon', 'en_attente_creation_code_chapeau', 'ds_validee']);
  });
});

describe('buildDsPayload', () => {
  it('mappe les champs + calculs + nouvelles colonnes', () => {
    const p = buildDsPayload(base, { sapOptions, statut: 'en_attente_creation_code_chapeau' });
    expect(p.cr04e_demandeur).toBe('Jean');
    expect(p.cr04e_datedelademande).toBe('2026-07-02');
    expect(p.cr04e_typedelademande).toBe('1');
    expect(p.cr04e_nomduproduitdesignation).toBe('Tarte test');
    expect(p.cr04e_poidsnet).toBe(0.25);
    expect(p.cr04e_codeprojet).toBe('12345678'); // code article origine
    expect(p.cr04e_codechapeau).toBe('741603');
    expect(p.cr04e_statut_en_cours).toBe('en_attente_creation_code_chapeau');
    // calculs
    expect(p.cr04e_secteurdactivite).toBe('12'); // GMS
    expect(p.cr04e_codedivisionorigine).toBe('2859'); // Aire origine
    expect(p.cr04e_service).toBe('Marketing');
    expect(p.cr04e_descriptiondubesoin).toBe('Besoin X');
    // lookups résolus
    expect(p['cr04e_DivisionUsine@odata.bind']).toBe('/cr04e_divisionusines(dBon)'); // fab Bonloc
    expect(p['cr04e_Classedevalorisation@odata.bind']).toBe('/cr04e_classedevalorisations(c7012)');
    expect(p['cr04e_Hierarchieproduitfamille@odata.bind']).toBe('/cr04e_hierarchieproduitfamilles(h22)');
    expect(p['cr04e_Centredeprofit@odata.bind']).toBe('/cr04e_centredeprofitcepcts(cp22)'); // Bonloc → 22PF
  });

  it('omet les lookups non résolus et les champs vides', () => {
    const p = buildDsPayload({ autre_designation: 'X' }, { sapOptions, statut: 'ds_brouillon' });
    expect(p['cr04e_DivisionUsine@odata.bind']).toBeUndefined();
    expect(p.cr04e_demandeur).toBeUndefined();
    expect(p.cr04e_statut_en_cours).toBe('ds_brouillon');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/ds.test.js`
Expected: FAIL (module `./ds` introuvable).

- [ ] **Step 3: Write minimal implementation**

Create `src/api/ds.js`:

```js
import { Cr04e_projetsService } from '@/generated';
import { lookupBind, codeFromLookupValue } from '@/api/sapLists';
import {
  codeDivisionOrigine,
  codeDivisionFabrication,
  computeHierarchieDS,
  computeClasseValoDS,
  computeCentreProfitDS,
  computeSecteurDS,
} from '@/lib/dsRules';

export const DS_STATUTS = ['ds_brouillon', 'en_attente_creation_code_chapeau', 'ds_validee'];

const toNumber = (v) => {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};
const trimOrUndef = (v) => {
  const s = (v ?? '').toString().trim();
  return s === '' ? undefined : s;
};

// Valeurs calculées d'une DS à partir de formData (réutilisé par le payload et la
// vue/synthèse). Tout est dérivé des inputs via dsRules.
export function computeDsValues(formData) {
  const ctx = {
    usine: formData.autre_usine_fab,
    type_demande: formData.autre_type_demande,
    activite: formData.autre_activite,
    agen_type: formData.autre_agen_type,
    agen_choix: formData.autre_agen_choix,
  };
  return {
    divisionFab: codeDivisionFabrication(ctx),
    divisionOrigine: codeDivisionOrigine(formData.autre_usine_origine),
    hierarchie: computeHierarchieDS(formData.autre_activite),
    classeValo: computeClasseValoDS(ctx),
    centreProfit: computeCentreProfitDS(ctx),
    secteur: computeSecteurDS(formData.autre_type_marque),
  };
}

// Construit le payload cr04e_projet pour une DS. `sapOptions` sert à résoudre les
// lookups code→GUID. Champs vides et lookups non résolus omis.
export function buildDsPayload(formData, { sapOptions = {}, statut } = {}) {
  const c = computeDsValues(formData);
  const payload = {
    cr04e_demandeur: trimOrUndef(formData.autre_demandeur),
    cr04e_datedelademande: trimOrUndef(formData.autre_date),
    cr04e_typedelademande: trimOrUndef(formData.autre_type_demande),
    cr04e_nomduproduitdesignation: trimOrUndef(formData.autre_designation),
    cr04e_poidsnet: toNumber(formData.autre_poids_net_uv),
    cr04e_codeprojet: trimOrUndef(formData.autre_code_origine),
    cr04e_codechapeau: trimOrUndef(formData.code_chapeau),
    cr04e_secteurdactivite: trimOrUndef(c.secteur),
    cr04e_codedivisionorigine: trimOrUndef(c.divisionOrigine),
    cr04e_service: trimOrUndef(formData.autre_service),
    cr04e_descriptiondubesoin: trimOrUndef(formData.autre_description),
    cr04e_statut_en_cours: trimOrUndef(statut),
  };

  const divBind = lookupBind('divisions', c.divisionFab, sapOptions.divisions);
  if (divBind) payload['cr04e_DivisionUsine@odata.bind'] = divBind;
  const classeBind = lookupBind('classes_valorisation', c.classeValo, sapOptions.classes_valorisation);
  if (classeBind) payload['cr04e_Classedevalorisation@odata.bind'] = classeBind;
  const hierBind = lookupBind('familles_produit', c.hierarchie, sapOptions.familles_produit);
  if (hierBind) payload['cr04e_Hierarchieproduitfamille@odata.bind'] = hierBind;
  const cpBind = lookupBind('centres_profit', c.centreProfit, sapOptions.centres_profit);
  if (cpBind) payload['cr04e_Centredeprofit@odata.bind'] = cpBind;

  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

export async function createDsFromForm(formData, ctx) {
  const result = await Cr04e_projetsService.create(buildDsPayload(formData, ctx));
  return result?.data ?? null;
}

export async function updateDsFromForm(id, formData, ctx) {
  const result = await Cr04e_projetsService.update(id, buildDsPayload(formData, ctx));
  return result?.data ?? null;
}

// Lit une ligne cr04e_projet (DS) et reconstruit le formData DS (type 'autre').
// Les inputs non stockés sont redéduits des valeurs persistées quand c'est possible.
export async function getDsById(id, sapOptions = {}) {
  if (!id) return null;
  const result = await Cr04e_projetsService.get(id);
  const p = result?.data ?? null;
  if (!p) return null;
  const divisionFab = codeFromLookupValue('divisions', p._cr04e_divisionusine_value, sapOptions.divisions);
  const centreProfit = codeFromLookupValue('centres_profit', p._cr04e_centredeprofit_value, sapOptions.centres_profit);
  return {
    projet_id: p.cr04e_projetid,
    type_de: 'autre',
    autre_demandeur: p.cr04e_demandeur ?? '',
    autre_date: (p.cr04e_datedelademande ?? '').slice(0, 10),
    autre_service: p.cr04e_service ?? '',
    autre_type_demande: p.cr04e_typedelademande ?? '',
    autre_description: p.cr04e_descriptiondubesoin ?? '',
    autre_code_origine: p.cr04e_codeprojet ?? '',
    autre_designation: p.cr04e_nomduproduitdesignation ?? '',
    autre_poids_net_uv: p.cr04e_poidsnet ?? '',
    code_chapeau: p.cr04e_codechapeau ?? '',
    statut: p.cr04e_statut_en_cours || 'en_attente_creation_code_chapeau',
    // Valeurs SAP persistées (pour l'aperçu / push ADV) :
    _ds_centre_profit: centreProfit,
    _ds_division_fab: divisionFab,
    _ds_division_origine: p.cr04e_codedivisionorigine ?? '',
    _ds_secteur: p.cr04e_secteurdactivite ?? '',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/api/ds.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/ds.js src/api/ds.test.js
git commit -m "feat(ds): persistance DS dans cr04e_projet (payload + CRUD + reouverture)"
```

---

## Task 5: Détection DS dans la liste (`projet.js`)

**Files:**
- Modify: `src/api/projet.js` (fonction `toListShape`)
- Test: `src/api/projet.test.js` (créer)

**Interfaces:**
- Consumes : `DS_STATUTS` (api/ds).
- Produces : `toListShape` renvoie `type_de: 'ds'` quand `cr04e_statut_en_cours` ∈ `DS_STATUTS`, sinon `'de'`. (La fonction reste interne ; on la teste via un export de test.)

- [ ] **Step 1: Write the failing test**

Create `src/api/projet.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { listShapeForTest } from './projet';

describe('toListShape — type DS', () => {
  it('marque type_de=ds pour un statut DS', () => {
    const row = listShapeForTest({ cr04e_projetid: '1', cr04e_statut_en_cours: 'en_attente_creation_code_chapeau' });
    expect(row.type_de).toBe('ds');
  });
  it('reste de pour un statut DE', () => {
    const row = listShapeForTest({ cr04e_projetid: '2', cr04e_statut_en_cours: 'en_attente_dl' });
    expect(row.type_de).toBe('de');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/projet.test.js`
Expected: FAIL (`listShapeForTest` non exporté).

- [ ] **Step 3: Write minimal implementation**

In `src/api/projet.js`:
1. Add import at top: `import { DS_STATUTS } from '@/api/ds';`
2. Modify `toListShape` so `type_de` is computed and export a test alias. Replace the existing `toListShape` definition:

```js
const toListShape = (p) => ({
  id: p.cr04e_projetid,
  type_de: DS_STATUTS.includes(p.cr04e_statut_en_cours) ? 'ds' : 'de',
  code_projet: p.cr04e_codeprojet ?? '',
  designation_article: p.cr04e_nomduproduitdesignation ?? '',
  demandeur: p.cr04e_demandeur ?? '',
  type_demande_de: p.cr04e_typedelademande ?? '',
  usine_validee: p.cr04e_divisionusinename ?? '',
  statut: p.cr04e_statut_en_cours || PROJET_STATUT.brouillon,
  code_chapeau: p.cr04e_codechapeau ?? '',
  created_date: p.createdon ?? null,
});

// Alias d'export pour les tests (la fonction reste interne par ailleurs).
export const listShapeForTest = toListShape;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/api/projet.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite + commit**

Run: `npx vitest run`
Expected: PASS (toutes les suites).

```bash
git add src/api/projet.js src/api/projet.test.js
git commit -m "feat(ds): detection type DS dans la liste (par statut)"
```

---

## Task 6: Formulaire DS — champs & règles (`CreerDE.jsx`)

**Files:**
- Modify: `src/pages/CreerDE.jsx`

**Interfaces:**
- Consumes : `dsRules` (USINES_ORIGINE, USINES_FABRICATION, ACTIVITES, TYPES_MARQUE, AGEN_TYPES, AGEN_CHOIX, isTypeNegoce, code* / compute*), `usePowerPlatform`.
- Produces : un formulaire DS complet conforme au scope. (Vérification : build + checklist manuelle, pas de test unitaire UI.)

> Cette tâche restructure la section `formType === 'autre'`. Le modèle de champs DS devient : `autre_usine_origine` (origine), `autre_usine_fab` (fabrication, select), `autre_agen_type`, `autre_agen_choix`, `autre_service` (libre), `autre_description` (nouveau). On retire `autre_usine_fabrication_libre` et `autre_produit_agen`.

- [ ] **Step 1: Imports & état initial**

In `src/pages/CreerDE.jsx` :
1. Add import :
```js
import { usePowerPlatform } from '@/PowerProvider';
import {
  USINES_ORIGINE,
  USINES_FABRICATION,
  ACTIVITES as DS_ACTIVITES,
  TYPES_MARQUE as DS_TYPES_MARQUE,
  AGEN_TYPES,
  AGEN_CHOIX,
  isTypeNegoce,
  codeDivisionOrigine,
  codeDivisionFabrication,
  computeHierarchieDS,
  computeClasseValoDS,
  computeCentreProfitDS,
  computeSecteurDS,
} from '@/lib/dsRules';
```
2. In `useState(formData)` initial object, **add** `autre_usine_origine: ''`, `autre_agen_type: ''`, `autre_agen_choix: ''`, `autre_description: ''` and **remove** `autre_usine_fabrication_libre: ''` and `autre_produit_agen: ''`.
3. Remove the now-unused top-level constants `ACTIVITES`, `TYPES_MARQUE`, `PRODUITS_AGEN`, `CODE_DIV_BY_USINE`, `computeClasseValorisation`, `computeCentreProfit`, `computeSecteurActivite`, `isUsineRequiredType` **only if** they are no longer referenced after Task 6 (the « Autre » section is the sole consumer). Keep `USINES_FAB` removal too. Verify with a grep before deleting; if still referenced, defer deletion.

- [ ] **Step 2: Préremplir le demandeur (utilisateur connecté)**

Inside the component, after `const { toast } = useToast();`, add:
```js
const { powerContext } = usePowerPlatform();
const connectedUser =
  powerContext?.user?.fullName ||
  powerContext?.user?.userFullName ||
  powerContext?.user?.displayName ||
  '';
useEffect(() => {
  if (formType === 'autre' && connectedUser && !formData.autre_demandeur) {
    setFormData((prev) => ({ ...prev, autre_demandeur: connectedUser }));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formType, connectedUser]);
```

- [ ] **Step 3: Valeurs calculées DS (remplacer les anciens memos `autre*`)**

Replace the existing `autreCodeDivision`, `autreClasseVal`, `autreCentreProfit`, `autreSecteur` memos with the DS computations:
```js
const dsCtx = {
  usine: formData.autre_usine_fab,
  type_demande: formData.autre_type_demande,
  activite: formData.autre_activite,
  agen_type: formData.autre_agen_type,
  agen_choix: formData.autre_agen_choix,
};
const dsDivisionOrigine = codeDivisionOrigine(formData.autre_usine_origine);
const dsDivisionFab = codeDivisionFabrication(dsCtx);
const dsHierarchie = computeHierarchieDS(formData.autre_activite);
const dsClasseValo = computeClasseValoDS(dsCtx);
const dsCentreProfit = computeCentreProfitDS(dsCtx);
const dsSecteur = computeSecteurDS(formData.autre_type_marque);
const dsUsinesOrigine = USINES_ORIGINE.filter(
  (u) => u !== 'Produit négoce' || isTypeNegoce(formData.autre_type_demande),
);
```

- [ ] **Step 4: Réécrire le JSX de la section `formType === 'autre'`**

Replace the entire `{formType === 'autre' && (<> ... </>)}` block with the following (4 `FormSection`):

```jsx
{formType === 'autre' && (
  <>
    <FormSection title="Informations générales" icon={FileText}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Demandeur" required hint="Prérempli depuis l'utilisateur connecté">
          <Input
            value={formData.autre_demandeur}
            onChange={(e) => handleChange('autre_demandeur', e.target.value)}
            placeholder="Nom et prénom"
            className="h-11"
          />
        </Field>
        <Field label="Date" required>
          <Input
            type="date"
            value={formData.autre_date}
            onChange={(e) => handleChange('autre_date', e.target.value)}
            className="h-11"
          />
        </Field>
        <Field label="Service" required hint="Saisie libre">
          <Input
            value={formData.autre_service}
            onChange={(e) => handleChange('autre_service', e.target.value)}
            placeholder="Service du demandeur"
            className="h-11"
          />
        </Field>
        <Field label="Type de demande" required>
          <Select
            value={formData.autre_type_demande}
            onValueChange={(v) => handleChange('autre_type_demande', v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              {TYPES_DEMANDE_AUTRE.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Panneau d'exemples des cas d'usage */}
      <div className="rounded-xl border border-border bg-secondary/40 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
          Cas d'usage — exemples
        </p>
        <div className="space-y-1.5">
          {CAS_USAGE_EXEMPLES.map((c) => (
            <div
              key={c.value}
              className={cn(
                'rounded-lg px-3 py-2 text-xs border',
                formData.autre_type_demande === c.value
                  ? 'bg-primary/10 border-primary/40 text-foreground'
                  : 'bg-card border-border text-muted-foreground',
              )}
            >
              <span className="font-semibold">{c.value} — {c.titre}</span>
              {c.exemple && <span className="block mt-0.5 italic">{c.exemple}</span>}
            </div>
          ))}
        </div>
      </div>

      <Field label="Description du besoin" hint="Saisie libre">
        <textarea
          value={formData.autre_description}
          onChange={(e) => handleChange('autre_description', e.target.value)}
          placeholder="Décrire le besoin…"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>
    </FormSection>

    <FormSection title="Code d'origine" icon={Layers}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Code article d'origine" hint="Code à 6 ou 8 chiffres">
          <Input
            value={formData.autre_code_origine}
            onChange={(e) => handleChange('autre_code_origine', e.target.value)}
            placeholder="Ex: 12345678"
            maxLength={8}
            className="h-11 font-mono"
          />
        </Field>
        <Field label="Usine de fabrication d'origine" required>
          <Select
            value={formData.autre_usine_origine}
            onValueChange={(v) => handleChange('autre_usine_origine', v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Sélectionner une usine" />
            </SelectTrigger>
            <SelectContent>
              {dsUsinesOrigine.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <ReadOnlyField
          label="Code division d'origine"
          value={dsDivisionOrigine}
          hint="Auto selon l'usine d'origine"
        />
      </div>
      <div className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.autre_besoin_vl}
            onCheckedChange={(v) => handleChange('autre_besoin_vl', !!v)}
          />
          <span className="text-sm font-medium text-foreground">Besoin d'une VL</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.autre_besoin_nouveau_code}
            onCheckedChange={(v) => handleChange('autre_besoin_nouveau_code', !!v)}
          />
          <span className="text-sm font-medium text-foreground">Besoin d'un nouveau code</span>
        </label>
      </div>
    </FormSection>

    <FormSection title="Produit" icon={Settings2}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <Field label="Désignation article" required>
            <Input
              value={formData.autre_designation}
              onChange={(e) => handleChange('autre_designation', e.target.value)}
              placeholder="Désignation complète"
              className="h-11"
            />
          </Field>
        </div>

        {isTypeNegoce(formData.autre_type_demande) ? (
          <ReadOnlyField
            label="Usine de fabrication"
            value="Produit négoce (2820)"
            hint="Forcé pour les types 4 et 5"
          />
        ) : (
          <Field label="Usine de fabrication" required>
            <Select
              value={formData.autre_usine_fab}
              onValueChange={(v) => handleChange('autre_usine_fab', v)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Sélectionner une usine" />
              </SelectTrigger>
              <SelectContent>
                {USINES_FABRICATION.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <ReadOnlyField
          label="Code division"
          value={dsDivisionFab}
          hint="Auto selon l'usine de fabrication"
        />

        {formData.autre_usine_fab === 'Agen' && !isTypeNegoce(formData.autre_type_demande) && (
          <>
            <Field label="Agen — type" required>
              <Select
                value={formData.autre_agen_type}
                onValueChange={(v) => handleChange('autre_agen_type', v)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Surgelé / FF STEF / FF Autre" />
                </SelectTrigger>
                <SelectContent>
                  {AGEN_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Agen — choix" required>
              <Select
                value={formData.autre_agen_choix}
                onValueChange={(v) => handleChange('autre_agen_choix', v)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Assortiments / Pains / Plaques" />
                </SelectTrigger>
                <SelectContent>
                  {AGEN_CHOIX.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}

        <Field label="Activité" required>
          <Select
            value={formData.autre_activite}
            onValueChange={(v) => handleChange('autre_activite', v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {DS_ACTIVITES.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <ReadOnlyField label="Hiérarchie de produits" value={dsHierarchie} hint="Auto selon l'activité" />

        <Field label="Poids net pour 1 UV (en kg)" required>
          <Input
            type="number"
            step="0.001"
            value={formData.autre_poids_net_uv}
            onChange={(e) => handleChange('autre_poids_net_uv', e.target.value)}
            placeholder="0.000"
            className="h-11"
          />
        </Field>

        <Field label="Type de marque" required>
          <Select
            value={formData.autre_type_marque}
            onValueChange={(v) => handleChange('autre_type_marque', v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {DS_TYPES_MARQUE.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <ReadOnlyField label="Secteur d'activité" value={dsSecteur} hint="Auto selon le type de marque" />
      </div>
    </FormSection>

    <FormSection title="Champs calculés (SAP)" icon={Settings2}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ReadOnlyField label="Classe de valorisation" value={dsClasseValo} hint="Selon usine / type / activité" />
        <ReadOnlyField label="Centre de profit" value={dsCentreProfit} hint="Selon usine / activité" />
      </div>
    </FormSection>
  </>
)}
```

- [ ] **Step 5: Constantes de la table d'exemples**

Near `TYPES_DEMANDE_AUTRE`, add:
```js
// Exemples affichés à côté du sélecteur Type de demande (scope Commerce/Marketing).
const CAS_USAGE_EXEMPLES = [
  { value: '1', titre: 'Transfert industriel restant dans nos savoir-faire', exemple: 'Transfert de la TCM de Rivesaltes vers Bonloc / Mi cuit Domino\'s de Bonloc vers Rivesaltes' },
  { value: '2', titre: 'Produit semi-fini fabriqué pour une autre usine (savoir-faire déjà validé)', exemple: 'Semi-fini fabriqué par Agen pour Aire' },
  { value: '3', titre: 'Massification', exemple: '' },
  { value: '4', titre: 'Produits extérieurs négoce', exemple: 'Achat fournisseur externe (canelés, …)' },
  { value: '5', titre: 'Produits fabriqués par une filiale du groupe (hors Boncolac Histo)', exemple: 'Macarons de MagM, produits de Cakesmith, Proper Cornish, etc.' },
  { value: '6', titre: 'Changement produit mineur (< 2% impact financier)', exemple: 'Changement charte étui / Modification étiquette / Changement mineur de MP' },
  { value: '7', titre: 'Modification palettisation mineure (< 2% impact financier)', exemple: 'Ajout/suppression d\'une couche / Palette Europe ↔ grand export' },
];
```

- [ ] **Step 6: Renommer « Autre » → « DS » dans la carte de sélection**

In the selection screen `TypeCard` for « Autre », change `title="Autre"` to `title="DS"` and update its subtitle to: `"Demande Spécifique : transfert industriel, négoce, massification, modifications mineures…"`. In `formTitle`, change the `'autre'` branch label from `'Autre demande'` to `'Demande Spécifique (DS)'`.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: `✓ built`. Si erreur « X is not defined » pour une constante supprimée à l'étape 1, remettre la constante ou retirer sa dernière référence.

- [ ] **Step 8: Commit**

```bash
git add src/pages/CreerDE.jsx
git commit -m "feat(ds): formulaire DS aligne sur la DE (regles scope Commerce/Marketing)"
```

---

## Task 7: Persistance DS dans le formulaire + réouverture ADV + push SAP

**Files:**
- Modify: `src/pages/CreerDE.jsx`

**Interfaces:**
- Consumes : `createDsFromForm`, `updateDsFromForm`, `getDsById`, `DS_STATUTS` (api/ds), `computeDsValues`.
- Produces : actions « Créer la DS » (Commerce) et « Envoyer vers SAP » (ADV) ; chargement d'une DS depuis Dataverse.

- [ ] **Step 1: Imports**

Add:
```js
import { createDsFromForm, updateDsFromForm, getDsById, computeDsValues, DS_STATUTS } from '@/api/ds';
```

- [ ] **Step 2: Charger une DS depuis Dataverse (réouverture ADV)**

The Dataverse open query (added previously for DE) loads via `getProjetById`. Add a DS-aware branch: after the existing `projetDV` query/effect, add:
```js
// Si le projet ouvert est une DS (statut DS), on le recharge au format DS.
const { data: dsDV } = useQuery({
  queryKey: ['ds-dataverse', projetIdParam],
  queryFn: () => getDsById(projetIdParam, sapOptions),
  enabled: !!projetIdParam && !editId,
});
useEffect(() => {
  if (dsDV && DS_STATUTS.includes(dsDV.statut)) {
    setFormType('autre');
    setFormData((prev) => ({ ...prev, ...dsDV }));
    setStep('form');
  }
}, [dsDV]);
```
> Note : `projetDV` (DE) et `dsDV` (DS) lisent la même ligne ; seul celui dont le statut correspond applique le préremplissage (le DE effect ignore les statuts DS, le DS effect ne s'active que sur statut DS). Garder l'effet DE inchangé.

- [ ] **Step 3: Action « Créer la DS » (Commerce)**

Add a handler:
```js
const [isCreatingDs, setIsCreatingDs] = useState(false);
const handleCreateDs = async (statut) => {
  if (isCreatingDs) return;
  setIsCreatingDs(true);
  try {
    const ctx = { sapOptions, statut };
    let projetId = formData.projet_id;
    if (projetId) await updateDsFromForm(projetId, formData, ctx);
    else {
      const created = await createDsFromForm(formData, ctx);
      projetId = created?.cr04e_projetid || '';
    }
    queryClient.invalidateQueries({ queryKey: ['projets-de'] });
    toast({ title: 'DS enregistrée', description: statut === 'ds_brouillon' ? 'Brouillon enregistré.' : 'DS créée — en attente de création de code chapeau.' });
    navigate(createPageUrl('DemandesEtude'));
  } catch (err) {
    toast({ title: 'Échec de l\'enregistrement de la DS', description: err?.message || 'Erreur inconnue.', variant: 'destructive' });
  } finally {
    setIsCreatingDs(false);
  }
};
```

- [ ] **Step 4: Action « Envoyer vers SAP » pour une DS (ADV)**

Add a DS SAP-send that reuses `SAP_SEND_FLOW_URL`:
```js
const triggerSapSendDs = async () => {
  const c = computeDsValues(formData);
  const body = {
    CodeChapeau: formData.code_chapeau || '',
    NomProduit: formData.autre_designation || '',
    HierarchieProduitFamille: (c.hierarchie || '').split(/\s+/)[0] || '',
    SecteurActivite: c.secteur || '',
    PoidsNet: formData.autre_poids_net_uv === '' || formData.autre_poids_net_uv == null ? '' : String(formData.autre_poids_net_uv),
    DivisionUsine: c.divisionFab || '',
    ClasseValorisation: c.classeValo || '',
    CentreProfit: c.centreProfit || '',
    GroupeAutorisation: '',
    GroupeFraisGeneraux: '',
    GroupeArticleDivision: '',
  };
  const res = await fetch(SAP_SEND_FLOW_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
  }
};
const handleDsPushSap = async () => {
  if (isCreatingDs) return;
  setIsCreatingDs(true);
  try {
    await triggerSapSendDs();
    if (formData.projet_id) await updateDsFromForm(formData.projet_id, formData, { sapOptions, statut: 'ds_validee' });
    queryClient.invalidateQueries({ queryKey: ['projets-de'] });
    toast({ title: 'DS envoyée vers SAP', description: 'La DS est passée en « DS validée ».' });
    navigate(createPageUrl('DemandesEtude'));
  } catch (err) {
    toast({ title: 'Échec envoi SAP', description: err?.message || 'Erreur inconnue.', variant: 'destructive' });
  } finally {
    setIsCreatingDs(false);
  }
};
```

- [ ] **Step 5: Barre d'actions DS**

The form's submit bar currently shows « Enregistrer brouillon » + « Envoyer vers SAP ». For `formType === 'autre'`, render DS-specific actions instead. Locate the actions `<div className="flex justify-end gap-3 pt-2">` and wrap its contents conditionally:
```jsx
<div className="flex justify-end gap-3 pt-2">
  {formType === 'autre' ? (
    DS_STATUTS.includes(formData.statut) && formData.projet_id ? (
      // DS ouverte par l'ADV : action push SAP
      <Button type="button" onClick={handleDsPushSap} disabled={isCreatingDs} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        {isCreatingDs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Envoyer vers SAP
      </Button>
    ) : (
      // DS créée par le Commerce
      <>
        <Button type="button" variant="outline" onClick={() => handleCreateDs('ds_brouillon')} disabled={isCreatingDs}>
          <Save className="w-4 h-4 mr-2" /> Enregistrer brouillon
        </Button>
        <Button type="button" onClick={() => handleCreateDs('en_attente_creation_code_chapeau')} disabled={isCreatingDs} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {isCreatingDs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Créer la DS
        </Button>
      </>
    )
  ) : (
    // ... bloc d'actions DE existant (inchangé) ...
  )}
</div>
```
Move the existing DE buttons (Enregistrer brouillon + Envoyer vers SAP) into the `: (` else branch unchanged. The DS form must NOT call `handleSubmit` (it has no code-chapeau gating); ensure the DS buttons are `type="button"`.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/CreerDE.jsx
git commit -m "feat(ds): creation DS (Commerce) + reouverture/push SAP (ADV)"
```

---

## Task 8: Liste — badge DS & routage (`DemandesEtude.jsx`)

**Files:**
- Modify: `src/pages/DemandesEtude.jsx`

**Interfaces:**
- Consumes : `type_de: 'ds'` (de `toListShape`), `DS_STATUTS`.
- Produces : badge « DS », extraction type-aware, routage vers le formulaire DS.

- [ ] **Step 1: Badge DS**

In `TYPE_BADGE`, add an entry:
```js
ds: { label: 'DS', cls: 'bg-teal-100 text-teal-700 border-teal-300' },
```

- [ ] **Step 2: Extraction type-aware pour DS**

Update the helpers so a `ds` row reads its fields (DS stores designation/demandeur/type in the standard columns, like a DE). Change:
```js
const getDesignation = (de) =>
  getType(de) === 'autre' ? de.autre_designation : de.designation_article;
const getDemandeur = (de) =>
  getType(de) === 'autre' ? de.autre_demandeur : de.demandeur;
```
to also handle `ds` (which uses the standard fields):
```js
const getDesignation = (de) =>
  getType(de) === 'autre' ? de.autre_designation : de.designation_article;
const getDemandeur = (de) =>
  getType(de) === 'autre' ? de.autre_demandeur : de.demandeur;
```
(No change needed: DS rows come from `toListShape` with `designation_article`/`demandeur` populated and `type_de: 'ds'`, and `getType` returns `'ds'` ⇒ the `=== 'autre'` branches are skipped, so the standard fields are used. Verify `getType` returns `de.type_de || 'de'` — it does.)

- [ ] **Step 3: Routage DS**

In the row action `target` computation, add a DS branch **before** the generic else:
```js
const target =
  de.statut === 'brouillon'
    ? localId ? `CreerDE?id=${localId}` : 'CreerDE'
    : de.statut === 'ds_brouillon' || de.statut === 'en_attente_creation_code_chapeau'
      ? `CreerDE?projet_id=${de.id}`
      : de.statut === 'en_attente_code_chapeau'
        ? localId ? `CreerDE?id=${localId}` : `CreerDE?projet_id=${de.id}`
        : localId
          ? `DL?id=${localId}`
          : `DL?projet_id=${de.id}`;
```

- [ ] **Step 4: Type filter inclut DS (optionnel mais cohérent)**

In the type filter buttons array (`{ id: 'tous' }, { id: 'de' }, ...`), add `{ id: 'ds', label: 'DS' }`.

- [ ] **Step 5: Build + full test suite**

Run: `npm run build` → `✓ built`.
Run: `npx vitest run` → toutes les suites PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/DemandesEtude.jsx
git commit -m "feat(ds): badge DS + routage liste vers le formulaire DS"
```

---

## Checklist de validation manuelle (après build, `npm run dev`)

1. **Carte « DS »** : la 2e carte s'appelle « DS », titre formulaire « Demande Spécifique (DS) ».
2. **Demandeur** prérempli (en player ; vide en dev local — saisie libre OK).
3. **Service** = champ texte libre. **Description** = zone de texte.
4. **Panneau exemples** : les 7 cas s'affichent ; le cas sélectionné est mis en avant.
5. **Usine origine** : « Produit négoce » apparaît seulement pour types 4/5 ; code division origine auto (Bonloc 2886 … FF STEF Agen 2823, négoce 2820).
6. **Usine fabrication** : types 4/5 → « Produit négoce (2820) » figé ; sinon select. **Agen** → 2 listes (type + choix) ; code division 2823 si FF STEF, sinon 2847.
7. **Activité** → hiérarchie auto (22/27/21). **Type de marque** → secteur (10/12/15). **Classe valo** / **centre profit** auto.
8. **Créer la DS** → toast + retour liste ; ligne avec badge **DS**, statut « En attente de création de code chapeau ».
9. Depuis la liste, **rouvrir la DS** (rôle ADV) → formulaire prérempli, bouton **« Envoyer vers SAP »** ; après envoi → statut « DS validée ».
10. **Brouillon DS** → réouverture en édition.

---

## Reste à faire côté Jeremy (rappel)
1. Créer les 4 colonnes texte sur `cr04e_projet` (`cr04e_centredeprofit`, `cr04e_codedivisionorigine`, `cr04e_service`, `cr04e_description`) + régénérer `src/generated/`.
2. Flux Power Automate d'alerte ADV (déclencheur : création ligne au statut `en_attente_creation_code_chapeau`).
3. Confirmer le code division « Agen Faux Frais Autre » (hypothèse : 2847).
4. (Optionnel) Vérifier que la table SAP `familles_produit` contient « 22/27/21 DE DE DE » pour le round-trip hiérarchie.
```
