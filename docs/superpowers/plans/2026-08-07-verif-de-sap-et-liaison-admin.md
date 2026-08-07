# VERIF_DE + réponse SAP + liaison Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vérifier (VERIF_DE) qu'un code chapeau n'existe pas déjà avant l'envoi SAP d'une DE, exploiter la réponse 200/400 de l'envoi SAP, et corriger la liaison article→code projet de l'Admin.

**Architecture:** `postFlowRaw` (fetch sans lever) extrait de `postFlow` dans `flux.js`. `CreerDE.handleSubmit` gagne une étape VERIF_DE bloquante et lit la réponse de l'envoi SAP. La jointure Admin devient une fonction pure `joinCodeProjet` (clé = article normalisé) testée.

**Tech Stack:** React, Vitest, flux Power Automate via `cr04e_fluxregistre`, service généré `Cr04e_projetsService`.

## Global Constraints

- `postFlow` doit rester **inchangé** pour ses appelants (lève sur `!ok`, header `Accept-Language: en-US`).
- Nouvelle clé de flux **`VERIF_DE`** (registre Dataverse `cr04e_fluxregistre`) — hors code.
- VERIF_DE body = `{ "Numéro": <code chapeau> }` ; `200` = disponible, `400` = existant.
- Code chapeau poussé = `effectiveCode` ; code PJ = `formData.code_projet`.
- Admin : clé de jointure `stripLeadingZeros(referenceproduit)` === `stripLeadingZeros(code_chapeau)` → `code_projet`.
- Tests via `npm test` (vitest run). Français, cohérent avec le repo.

---

### Task 1: `postFlowRaw` dans `flux.js` (+ clé VERIF_DE)

**Files:**
- Modify: `src/api/flux.js`

**Interfaces:**
- Produces:
  - `FLUX.VERIF_DE = 'VERIF_DE'`.
  - `postFlowRaw(cle: string, body?: any) => Promise<Response>` — POST JSON (headers + `Accept-Language: en-US`), **ne lève pas** sur `!res.ok` (lève seulement sur registre/réseau). Le corps est omis si `body === undefined`.
- `postFlow` conserve sa signature et son comportement (lève sur `!ok`), réécrit au-dessus de `postFlowRaw`.

- [ ] **Step 1: Ajouter la clé VERIF_DE**

Dans l'objet `FLUX` :

```js
export const FLUX = {
  BECPG: 'BECPG',
  NOUVEAU_CODE: 'NOUVEAU_CODE',
  VALIDATION: 'VALIDATION',
  SAP_SEND: 'SAP_SEND',
  VL_CODE: 'VL_CODE',
  DOCUMENT: 'DOCUMENT',
  VERIF_DE: 'VERIF_DE',
};
```

- [ ] **Step 2: Extraire `postFlowRaw` et réécrire `postFlow`**

Remplacer la fonction `postFlow` existante par :

```js
// POST JSON vers un flux Power Automate (désigné par sa CLÉ), renvoyant la
// Response BRUTE sans lever sur !res.ok : l'appelant inspecte res.status (utile
// quand 400 est une réponse métier, ex. VERIF_DE « déjà existant »). Lève tout de
// même si le registre ne résout pas la clé ou si le réseau échoue. `body` omis =>
// POST sans corps.
export async function postFlowRaw(cle, body) {
  const url = await getFluxUrl(cle);
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Force la culture EN du run Power Automate : sans ça, « Accept-Language:
      // fr-FR » fait sérialiser les Edm.Decimal (NetWeight) avec une virgule ->
      // SAP renvoie « ungültiger Wert '6,123' » (400).
      'Accept-Language': 'en-US',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

// POST JSON vers un flux, désigné par sa CLÉ. Lève une Error lisible si la réponse
// n'est pas OK, sinon renvoie la Response (à lire selon le besoin). `body` omis =>
// POST sans corps.
export async function postFlow(cle, body) {
  const res = await postFlowRaw(cle, body);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
  }
  return res;
}
```

- [ ] **Step 3: Lint + tests existants**

Run: `npm run lint -- src/api/flux.js && npm test -- src/api`
Expected: aucune erreur ; les tests `src/api/*` passent (appelants `postFlow` intacts).

- [ ] **Step 4: Commit**

```bash
git add src/api/flux.js
git commit -m "feat(flux): postFlowRaw (Response brute) + clé VERIF_DE"
```

---

### Task 2: VERIF_DE + réponse SAP dans `CreerDE.handleSubmit`

**Files:**
- Modify: `src/pages/CreerDE.jsx`

**Interfaces:**
- Consumes: `postFlowRaw`, `FLUX.VERIF_DE`, `FLUX.SAP_SEND` (Task 1).
- Produces: `triggerSapSend(codeChapeau) => Promise<'ok' | 'erreur'>` (renvoie désormais une issue au lieu de rien).

- [ ] **Step 1: Importer `postFlowRaw`**

Ligne 21, remplacer :

```js
import { postFlow, FLUX } from '@/api/flux';
```

par :

```js
import { postFlow, postFlowRaw, FLUX } from '@/api/flux';
```

- [ ] **Step 2: Réécrire `triggerSapSend` pour lire la réponse**

Remplacer la fonction `triggerSapSend` (le bloc `const triggerSapSend = async (codeChapeau) => { ... };`, celui avec `TypeProduit: 'PFIN'`) par :

```js
  const triggerSapSend = async (codeChapeau) => {
    const body = {
      CodeChapeau: codeChapeau || '',
      NomProduit: formData.designation_article || '',
      HierarchieProduitFamille: hierarchieToSpaces(formData.famille_produit),
      SecteurActivite: formData.marque || '',
      PoidsNet: decimalStr(formData.poids_net),
      ZUG: zug === '' || zug == null ? '' : String(Math.round(Number(zug))),
      DivisionUsine: formData.division || '',
      ClasseValorisation: formData.classe_valorisation || '',
      CentreProfit: formData.centre_profit || '',
      GroupeAutorisation: formData.groupe_autorisation || '',
      GroupeFraisGeneraux: formData.groupe_frais_generaux || '',
      GroupeArticleDivision: formData.groupe_article || '',
      TypeProduit: 'PFIN',
      'ProfilFabricRépét': computeProfilFabricRepetDE(formData.division),
      // Codes EAN (bloc « Besoin des codes EAN ») : CAR = carton, ZCO = couche,
      // PAL = palette. Vides si le bloc n'est pas activé.
      EANCAR: formData.ean_carton || '',
      EANZCO: formData.ean_couche || '',
      EANPAL: formData.ean_palette || '',
    };
    try {
      const res = await postFlowRaw(FLUX.SAP_SEND, body);
      if (res.status === 200) {
        toast({ title: 'Envoyé vers SAP', description: 'Tout est bon.' });
        return 'ok';
      }
      if (res.status === 400) {
        toast({
          title: 'Erreur(s) SAP — contactez l\'admin',
          description: `Une ou plusieurs erreurs sur SAP. Article ${codeChapeau || '—'} · PJ ${formData.code_projet || '—'}.`,
          variant: 'destructive',
        });
        return 'erreur';
      }
      const text = await res.text().catch(() => '');
      toast({
        title: 'Envoi SAP échoué',
        description: `HTTP ${res.status}${text ? ` — ${text}` : ''}.`,
        variant: 'destructive',
      });
      return 'erreur';
    } catch (err) {
      toast({
        title: 'Envoi SAP non déclenché',
        description: `L'envoi vers SAP a échoué : ${err?.message || 'erreur inconnue'}.`,
        variant: 'destructive',
      });
      return 'erreur';
    }
  };
```

- [ ] **Step 3: Insérer la vérif VERIF_DE en tête du flux DE**

Dans `handleSubmit`, juste après `const effectiveCode = codeChapeau;` (~ligne 1420) et **avant** le bloc `let projetId = formData.projet_id;`, insérer :

```js
    // VERIF_DE : le code chapeau ne doit pas déjà exister dans SAP. Bloquant :
    // 400 => on stoppe (rien n'est écrit), l'ADV doit demander un nouveau code.
    if (formType === 'de') {
      try {
        const res = await postFlowRaw(FLUX.VERIF_DE, { 'Numéro': effectiveCode });
        if (res.status === 400) {
          toast({
            title: 'Code chapeau déjà existant',
            description: 'Ce code existe déjà dans SAP — demandez un nouveau code chapeau.',
            variant: 'destructive',
          });
          return;
        }
        if (res.status !== 200) {
          const text = await res.text().catch(() => '');
          toast({
            title: 'Vérification impossible',
            description: `VERIF_DE a répondu HTTP ${res.status}${text ? ` — ${text}` : ''}.`,
            variant: 'destructive',
          });
          return;
        }
      } catch (err) {
        toast({
          title: 'Vérification impossible',
          description: `Impossible de vérifier le code auprès de SAP : ${err?.message || 'erreur inconnue'}.`,
          variant: 'destructive',
        });
        return;
      }
    }
```

(Le `return` est dans le `try` de `handleSubmit` : le `finally` remet `isSubmitting=false`.)

- [ ] **Step 4: Gater `saveMutation` sur l'issue de l'envoi SAP**

Remplacer :

```js
    // Envoi vers SAP (ensemble des champs) — non bloquant : on attend l'envoi
    // avant de naviguer, mais un échec ne stoppe pas la DE. Le mail de
    // notification « en attente de DL » (flux VALIDATION) n'est plus déclenché.
    if (formType === 'de') await triggerSapSend(effectiveCode);
    // La DE passe direct en phase DL.
    saveMutation.mutate({
```

par :

```js
    // Envoi vers SAP : on lit la réponse. 400 => on reste sur le formulaire (pas
    // de navigation) pour que l'utilisateur voie l'erreur et prévienne l'admin.
    if (formType === 'de') {
      const outcome = await triggerSapSend(effectiveCode);
      if (outcome !== 'ok') return; // finally remet isSubmitting=false
    }
    // Succès (ou DS) : la DE passe direct en phase DL.
    saveMutation.mutate({
```

- [ ] **Step 5: Lint + build**

Run: `npm run lint -- src/pages/CreerDE.jsx && npm run build`
Expected: aucune erreur ESLint ; build Vite OK.

- [ ] **Step 6: Commit**

```bash
git add src/pages/CreerDE.jsx
git commit -m "feat(de): vérif VERIF_DE avant envoi SAP + gestion réponse 200/400"
```

---

### Task 3: Jointure pure `joinCodeProjet` (Admin)

**Files:**
- Modify: `src/lib/erreursSap.js`
- Test: `src/lib/erreursSap.test.js` (créer si absent)

**Interfaces:**
- Consumes: `stripLeadingZeros` (déjà dans `erreursSap.js`).
- Produces: `joinCodeProjet(creations: object[], projets: object[]) => object[]` — enrichit chaque création avec `codeProjet`, `designation`, `usine`, `demandeur` depuis le projet dont `stripLeadingZeros(code_chapeau)` égale `stripLeadingZeros(referenceRaw || reference)` de la création ; repli sur les valeurs déjà présentes.

- [ ] **Step 1: Écrire le test qui échoue**

Créer/compléter `src/lib/erreursSap.test.js` :

```js
import { describe, it, expect } from 'vitest';
import { joinCodeProjet } from './erreursSap';

const projets = [
  { code_chapeau: '810501', code_projet: 'PJ4987', designation_article: 'Tarte', usine_validee: 'AGEN', demandeur: 'Alice' },
];

describe('joinCodeProjet', () => {
  it('associe le code projet par référence article (match direct)', () => {
    const out = joinCodeProjet([{ reference: '810501', referenceRaw: '810501' }], projets);
    expect(out[0].codeProjet).toBe('PJ4987');
    expect(out[0].designation).toBe('Tarte');
    expect(out[0].usine).toBe('AGEN');
    expect(out[0].demandeur).toBe('Alice');
  });

  it('normalise les zéros de tête du journal (000000810501 -> 810501)', () => {
    const out = joinCodeProjet([{ reference: '810501', referenceRaw: '000000810501' }], projets);
    expect(out[0].codeProjet).toBe('PJ4987');
  });

  it('projet introuvable -> codeProjet vide, repli sur valeurs existantes', () => {
    const out = joinCodeProjet(
      [{ reference: '999', referenceRaw: '999', designation: 'Extrait', usine: 'X', demandeur: 'Bob' }],
      projets,
    );
    expect(out[0].codeProjet).toBe('');
    expect(out[0].designation).toBe('Extrait');
    expect(out[0].usine).toBe('X');
    expect(out[0].demandeur).toBe('Bob');
  });
});
```

- [ ] **Step 2: Lancer le test (échec attendu)**

Run: `npm test -- src/lib/erreursSap.test.js`
Expected: FAIL (`joinCodeProjet is not a function`).

- [ ] **Step 3: Implémenter `joinCodeProjet`**

Ajouter à la fin de `src/lib/erreursSap.js` :

```js
// ---------------------------------------------------------------------------
// Jointure Admin : enrichit chaque création avec les infos de son projet.
// Clé de liaison : l'ARTICLE du journal (referenceproduit) == le code chapeau du
// projet, aux zéros de tête près (le journal préfixe parfois « 00000 », pas la
// table projet). Repli sur les valeurs déjà extraites quand le projet manque.
// ---------------------------------------------------------------------------
export function joinCodeProjet(creations = [], projets = []) {
  const byChapeau = new Map();
  for (const p of projets) {
    const key = stripLeadingZeros(p.code_chapeau);
    if (key) byChapeau.set(key, p);
  }

  return creations.map((c) => {
    const key = stripLeadingZeros(c.referenceRaw || c.reference);
    const projet = key ? byChapeau.get(key) : undefined;
    return {
      ...c,
      codeProjet: projet?.code_projet || '',
      designation: projet?.designation_article || c.designation || '',
      usine: projet?.usine_validee || c.usine || '',
      demandeur: projet?.demandeur || c.demandeur || '',
    };
  });
}
```

- [ ] **Step 4: Lancer le test (succès attendu)**

Run: `npm test -- src/lib/erreursSap.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/erreursSap.js src/lib/erreursSap.test.js
git commit -m "feat(admin): joinCodeProjet — liaison article->code projet (zéros de tête)"
```

---

### Task 4: Brancher `joinCodeProjet` dans le hook

**Files:**
- Modify: `src/lib/useErreursSap.js`

**Interfaces:**
- Consumes: `joinCodeProjet` (Task 3).

- [ ] **Step 1: Remplacer `enrichWithProjet` par `joinCodeProjet`**

Import (ligne 5) :

```js
import { buildCreations, computeKpis, joinCodeProjet } from '@/lib/erreursSap';
```

Supprimer la fonction locale `enrichWithProjet` (le bloc `function enrichWithProjet(creations, projets) { ... }`), et dans le `useMemo` remplacer :

```js
    const enriched = enrichWithProjet(base, projets ?? []);
```

par :

```js
    const enriched = joinCodeProjet(base, projets ?? []);
```

- [ ] **Step 2: Lint + build + suite complète**

Run: `npm run lint -- src/lib/useErreursSap.js && npm test && npm run build`
Expected: aucune erreur ; tous les tests passent ; build OK.

- [ ] **Step 3: Commit**

```bash
git add src/lib/useErreursSap.js
git commit -m "refactor(admin): le hook utilise joinCodeProjet (colonne Code projet renseignée)"
```

---

### Task 5: Vérification globale

- [ ] **Step 1: `npm test`** — tous verts (dont `erreursSap.test.js`).
- [ ] **Step 2: `npm run build`** — OK.
- [ ] **Step 3: `pac code push`** (déploiement) — sur demande utilisateur.

## Prérequis hors code (rappel utilisateur)

- Ajouter la ligne **`VERIF_DE`** (clé + URL du flux) dans la table `cr04e_fluxregistre`, sinon l'étape VERIF échoue en « Vérification impossible ».
- Le flux `SAP_SEND` doit renvoyer explicitement **200** (succès) ou **400** (erreur(s)) dans son action « Réponse ».
