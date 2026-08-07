# Deep-linking généralisé depuis les mails — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ouvrir l'app au bon endroit depuis un lien mail, par **code PJ** : `vue=de` → formulaire DE (SAP), `vue=fl&section=…` → Fiche de Lancement scrollée sur la bonne section.

**Architecture:** Un module pur `deepLinkRoutes.js` mappe les query params vers une URL de page (avec étape de résolution async pour le code PJ). `DeepLink.jsx` orchestre : lecture params (SDK player + repli URL), résolution code PJ → GUID via un helper `getProjetIdByCodePJ`, navigation, erreurs. `FicheDetail.jsx` ajoute des ancres de section et scrolle sur `?section=`. Les pages cibles gardent leur contrat interne (`projet_id` / `id`).

**Tech Stack:** React, react-router-dom (HashRouter), Vitest, SDK `@microsoft/power-apps/app`, service généré `Cr04e_projetsService`.

## Global Constraints

- Routing **HashRouter** ; le player ne propage que des **query params** lus via `getContext().app.queryParams` (async), repli `window.location.search`.
- Une fiche = ligne `cr04e_projet` ; **code PJ = `cr04e_codeprojet`**.
- Cibles internes inchangées : `CreerDE?projet_id=<guid>`, `FicheDetail?id=<guid>`.
- Sections FL valides : `supply_chain`, `industriel`, `commerce`, `synthese`.
- Rétro-compat : `projet_id` (→ CreerDE) et `code_chapeau` (→ DemandesEtude) restent supportés.
- Tests via `npm test` (vitest run). Français dans les libellés/commentaires, cohérent avec le repo.

---

### Task 1: Module pur `deepLinkRoutes.js` + tests

**Files:**
- Create: `src/lib/deepLinkRoutes.js`
- Test: `src/lib/deepLinkRoutes.test.js`

**Interfaces:**
- Produces:
  - `FL_SECTIONS: string[]` — liste blanche des sections.
  - `matchDeepLink(read: (param:string)=>string|undefined) => Route | null`
    où `Route = { ssKey: string, value: string, resolveNeeded: boolean, buildUrl: (resolved: string) => string }`.
  - `read` renvoie la valeur d'un param (ou undefined). Priorité : `code_pj` d'abord, puis repli `projet_id`, puis `code_chapeau`. Le 1er présent gagne.
  - Pour un route `code_pj` : `resolveNeeded=true`, `value` = code PJ, `buildUrl(guid)` construit l'URL finale. `vue` absent ⇒ défaut `fl`.
  - Pour `projet_id`/`code_chapeau` : `resolveNeeded=false`, `buildUrl(v)` utilise `v` directement.
  - `section` invalide/absente ⇒ non ajoutée à l'URL.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/deepLinkRoutes.test.js
import { describe, it, expect } from 'vitest';
import { matchDeepLink, FL_SECTIONS } from './deepLinkRoutes';

// Fabrique un lecteur de params depuis un objet plat.
const reader = (obj) => (p) => obj[p];

describe('FL_SECTIONS', () => {
  it('expose les 4 sections FL', () => {
    expect(FL_SECTIONS).toEqual(['supply_chain', 'industriel', 'commerce', 'synthese']);
  });
});

describe('matchDeepLink — code PJ', () => {
  it('vue=de → CreerDE avec projet_id résolu', () => {
    const r = matchDeepLink(reader({ code_pj: 'PJ4987', vue: 'de' }));
    expect(r.resolveNeeded).toBe(true);
    expect(r.value).toBe('PJ4987');
    expect(r.buildUrl('GUID-1')).toBe('/CreerDE?projet_id=GUID-1');
  });

  it('vue=fl + section valide → FicheDetail avec section', () => {
    const r = matchDeepLink(reader({ code_pj: 'PJ4987', vue: 'fl', section: 'industriel' }));
    expect(r.resolveNeeded).toBe(true);
    expect(r.buildUrl('GUID-1')).toBe('/FicheDetail?id=GUID-1&section=industriel');
  });

  it('vue absent → défaut fl (sans section)', () => {
    const r = matchDeepLink(reader({ code_pj: 'PJ4987' }));
    expect(r.buildUrl('GUID-1')).toBe('/FicheDetail?id=GUID-1');
  });

  it('section inconnue → ignorée', () => {
    const r = matchDeepLink(reader({ code_pj: 'PJ4987', vue: 'fl', section: 'zzz' }));
    expect(r.buildUrl('GUID-1')).toBe('/FicheDetail?id=GUID-1');
  });

  it('ssKey dépend du code et de la vue/section (nouvelle valeur = nouvelle redirection)', () => {
    const a = matchDeepLink(reader({ code_pj: 'PJ1', vue: 'fl', section: 'industriel' }));
    const b = matchDeepLink(reader({ code_pj: 'PJ1', vue: 'fl', section: 'commerce' }));
    expect(a.ssKey).not.toBe(b.ssKey);
  });
});

describe('matchDeepLink — repli legacy', () => {
  it('projet_id → CreerDE direct (pas de résolution)', () => {
    const r = matchDeepLink(reader({ projet_id: 'GUID-9' }));
    expect(r.resolveNeeded).toBe(false);
    expect(r.buildUrl('GUID-9')).toBe('/CreerDE?projet_id=GUID-9');
  });

  it('code_chapeau → DemandesEtude direct', () => {
    const r = matchDeepLink(reader({ code_chapeau: 'CH-42' }));
    expect(r.resolveNeeded).toBe(false);
    expect(r.buildUrl('CH-42')).toBe('/DemandesEtude?code_chapeau=CH-42');
  });

  it('code_pj prioritaire sur projet_id', () => {
    const r = matchDeepLink(reader({ code_pj: 'PJ4987', projet_id: 'GUID-9' }));
    expect(r.resolveNeeded).toBe(true);
    expect(r.value).toBe('PJ4987');
  });

  it('aucun param reconnu → null', () => {
    expect(matchDeepLink(reader({ foo: 'bar' }))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/deepLinkRoutes.test.js`
Expected: FAIL (module introuvable / `matchDeepLink is not a function`).

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/deepLinkRoutes.js
// Table des liens profonds (mails Power Automate) → URL de page interne.
// Pur, sans I/O : `DeepLink.jsx` fournit un lecteur de params et exécute la
// résolution async (code PJ → GUID) et la navigation.

export const FL_SECTIONS = ['supply_chain', 'industriel', 'commerce', 'synthese'];

const enc = encodeURIComponent;

// Construit l'URL FL avec section optionnelle validée.
const flUrl = (guid, section) => {
  const base = `/FicheDetail?id=${enc(guid)}`;
  return FL_SECTIONS.includes(section) ? `${base}&section=${enc(section)}` : base;
};

// Renvoie le 1er route dont le param déclencheur est présent, sinon null.
// Priorité : code_pj (nouveau), puis projet_id / code_chapeau (legacy).
export function matchDeepLink(read) {
  const codePj = read('code_pj');
  if (codePj) {
    const vue = read('vue') === 'de' ? 'de' : 'fl';
    const section = read('section');
    const validSection = FL_SECTIONS.includes(section) ? section : '';
    return {
      ssKey: `deeplink:code_pj:${codePj}:${vue}:${validSection}`,
      value: codePj,
      resolveNeeded: true,
      buildUrl: (guid) =>
        vue === 'de' ? `/CreerDE?projet_id=${enc(guid)}` : flUrl(guid, section),
    };
  }

  const projetId = read('projet_id');
  if (projetId) {
    return {
      ssKey: `deeplink:projet_id:${projetId}`,
      value: projetId,
      resolveNeeded: false,
      buildUrl: (v) => `/CreerDE?projet_id=${enc(v)}`,
    };
  }

  const codeChapeau = read('code_chapeau');
  if (codeChapeau) {
    return {
      ssKey: `deeplink:code_chapeau:${codeChapeau}`,
      value: codeChapeau,
      resolveNeeded: false,
      buildUrl: (v) => `/DemandesEtude?code_chapeau=${enc(v)}`,
    };
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/deepLinkRoutes.test.js`
Expected: PASS (tous les cas).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deepLinkRoutes.js src/lib/deepLinkRoutes.test.js
git commit -m "feat(deeplink): table de routes pure param->URL (code PJ + legacy)"
```

---

### Task 2: Helper de résolution `getProjetIdByCodePJ`

**Files:**
- Modify: `src/api/fiche.js` (ajout d'une fonction exportée, après `getFicheById`)

**Interfaces:**
- Consumes: `Cr04e_projetsService` (déjà importé dans `fiche.js`), `unwrap` (helper local du fichier).
- Produces: `getProjetIdByCodePJ(code: string) => Promise<string|null>` — GUID `cr04e_projetid` de la 1re ligne dont `cr04e_codeprojet` = `code`, ou `null` si introuvable.

- [ ] **Step 1: Add the implementation**

Ajouter dans `src/api/fiche.js`, juste après la fonction `getFicheById` :

```js
// Résout un code PJ (cr04e_codeprojet, humain) vers le GUID de la ligne
// cr04e_projet, pour les liens profonds des mails. Renvoie null si introuvable.
// Le code PJ est supposé unique (top:1). Les apostrophes sont échappées (OData).
export async function getProjetIdByCodePJ(code) {
  const c = (code ?? '').trim();
  if (!c) return null;
  const safe = c.replace(/'/g, "''");
  const result = await Cr04e_projetsService.getAll({
    filter: `cr04e_codeprojet eq '${safe}'`,
    select: ['cr04e_projetid'],
    top: 1,
  });
  const rows = unwrap(result, 'Résolution code PJ') ?? [];
  return rows[0]?.cr04e_projetid ?? null;
}
```

- [ ] **Step 2: Verify the file still parses / imports resolve**

Run: `npm test -- src/api/fiche.test.js`
Expected: PASS (les tests existants de `fiche.js` passent toujours ; aucun cassé par l'ajout).

- [ ] **Step 3: Commit**

```bash
git add src/api/fiche.js
git commit -m "feat(api): getProjetIdByCodePJ (résolution code PJ -> GUID)"
```

---

### Task 3: Réécrire `DeepLink.jsx` (résolution async + erreurs)

**Files:**
- Modify: `src/lib/DeepLink.jsx` (remplacement complet de la logique de dispatch)

**Interfaces:**
- Consumes: `matchDeepLink`, `FL_SECTIONS` (Task 1) ; `getProjetIdByCodePJ` (Task 2) ; `useToast` (`@/components/ui/use-toast`).
- Produces: composant `DeepLink` (default export) inchangé côté montage (déjà rendu dans `App.jsx`).

- [ ] **Step 1: Replace the component body**

Remplacer le contenu de `src/lib/DeepLink.jsx` par :

```jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContext } from '@microsoft/power-apps/app';
import { matchDeepLink } from './deepLinkRoutes';
import { getProjetIdByCodePJ } from '@/api/fiche';
import { useToast } from '@/components/ui/use-toast';

// Lien profond depuis l'e-mail Power Automate. Le player ne propage PAS la query
// string jusqu'à l'iframe : on lit les paramètres via getContext().app.queryParams
// (ASYNCHRONE). Repli window.location.search pour le dev local.
//
// Deux liens par code PJ (résolu ici en GUID) :
//   ?code_pj=<code>&vue=de                 -> /CreerDE?projet_id=<guid>
//   ?code_pj=<code>&vue=fl&section=<sec>   -> /FicheDetail?id=<guid>&section=<sec>
// Repli legacy : ?projet_id=<guid>, ?code_chapeau=<code>.
//
// On ne redirige qu'une fois par valeur (sessionStorage) : sinon chaque F5 relit
// queryParams (toujours présent côté player) et renverrait l'utilisateur sur la
// cible. Une nouvelle valeur (code/vue/section) re-déclenche la redirection.

export default function DeepLink() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    let cancelled = false;

    const alreadyDone = (ssKey, value) => {
      try {
        if (sessionStorage.getItem(ssKey) === value) return true;
        sessionStorage.setItem(ssKey, value);
      } catch {
        // sessionStorage indisponible : on redirige quand même.
      }
      return false;
    };

    const run = async (route) => {
      if (!route || cancelled) return;
      if (alreadyDone(route.ssKey, route.value)) return;

      let resolved = route.value;
      if (route.resolveNeeded) {
        try {
          resolved = await getProjetIdByCodePJ(route.value);
        } catch (err) {
          console.error('DeepLink: résolution code PJ a échoué', err);
          toast({ variant: 'destructive', title: 'Échec de l’ouverture du lien' });
          return;
        }
        if (!resolved) {
          toast({
            variant: 'destructive',
            title: `Code PJ « ${route.value} » introuvable`,
          });
          if (!cancelled) navigate('/Accueil', { replace: true });
          return;
        }
      }
      if (!cancelled) navigate(route.buildUrl(resolved), { replace: true });
    };

    // Repli dev local : query string réelle du navigateur.
    const urlParams = new URLSearchParams(window.location.search);
    const localRoute = matchDeepLink((p) => urlParams.get(p) ?? undefined);
    if (localRoute) {
      run(localRoute);
      return;
    }

    // Player Power Apps : getContext() est asynchrone.
    Promise.resolve(getContext())
      .then((ctx) => matchDeepLink((p) => ctx?.app?.queryParams?.[p]))
      .then((route) => run(route))
      .catch((err) => console.error('DeepLink: getContext a échoué', err));

    return () => {
      cancelled = true;
    };
  }, [navigate, toast]);

  return null;
}
```

- [ ] **Step 2: Lint the file**

Run: `npm run lint -- src/lib/DeepLink.jsx`
Expected: aucune erreur ESLint.

- [ ] **Step 3: Manual reasoning check (no runtime test — dépend du SDK player)**

Relire : repli local (dev) vs player, dédup sessionStorage, repli `/Accueil` sur code introuvable. Confirmer que `matchDeepLink` reçoit bien `undefined` (pas `null`) quand un param manque côté URL (`?? undefined`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/DeepLink.jsx
git commit -m "feat(deeplink): résolution async code PJ + repli Accueil si introuvable"
```

---

### Task 4: Ancres + scroll de section dans `FicheDetail.jsx`

**Files:**
- Modify: `src/pages/FicheDetail.jsx`

**Interfaces:**
- Consumes: `useSearchParams` (déjà importé), `FL_SECTIONS` (Task 1).
- Produces: comportement de scroll ; pas d'export nouveau.

- [ ] **Step 1: Lire le param section**

Sous la ligne `const ficheId = searchParams.get('id');` (~ligne 39), ajouter :

```jsx
  const section = searchParams.get('section');
```

Et ajouter l'import en haut du fichier (près des autres imports `@/lib`) :

```jsx
import { FL_SECTIONS } from '@/lib/deepLinkRoutes';
```

- [ ] **Step 2: Ajouter l'effet de scroll**

Après le `useEffect` qui fait `if (fiche) setLocalFiche(fiche);` (~ligne 59), ajouter :

```jsx
  // Lien profond ?section= : scrolle sur la bonne section une fois la fiche chargée.
  useEffect(() => {
    if (!localFiche || !FL_SECTIONS.includes(section)) return;
    const el = document.getElementById(`section-${section}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ring-2', 'ring-primary', 'rounded-lg');
    const t = setTimeout(() => {
      el.classList.remove('ring-2', 'ring-primary', 'rounded-lg');
    }, 2000);
    return () => clearTimeout(t);
  }, [localFiche, section]);
```

- [ ] **Step 3: Envelopper les 4 sections dans des ancres**

Dans le `<main>` (~lignes 173-189), envelopper chaque section d'un conteneur avec `id` et `scroll-mt` (compense le header sticky) :

```jsx
        <div id="section-supply_chain" className="scroll-mt-28">
          <SupplyChainSection
            fiche={localFiche}
            de={null}
            {...sectionHandlers('supply_chain', 'visa_supply_chain', 'refus_supply_chain')}
          />
        </div>
        <div id="section-industriel" className="scroll-mt-28">
          <IndustrielSection
            fiche={localFiche}
            de={null}
            {...sectionHandlers('industriel', 'visa_industriel', 'refus_industriel')}
          />
        </div>
        <div id="section-commerce" className="scroll-mt-28">
          <CommerceSection
            fiche={localFiche}
            de={null}
            {...sectionHandlers('commerce', 'visa_commerce', 'refus_commerce')}
          />
        </div>
        <div id="section-synthese" className="scroll-mt-28">
          <FLSynthesisSection fiche={localFiche} />
        </div>
```

- [ ] **Step 4: Lint**

Run: `npm run lint -- src/pages/FicheDetail.jsx`
Expected: aucune erreur ESLint.

- [ ] **Step 5: Commit**

```bash
git add src/pages/FicheDetail.jsx
git commit -m "feat(fl): ancres de section + scroll depuis ?section= (lien profond)"
```

---

### Task 5: Vérification globale

- [ ] **Step 1: Suite de tests complète**

Run: `npm test`
Expected: PASS (dont `deepLinkRoutes.test.js`, `fiche.test.js`).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build Vite OK (pas d'erreur d'import).

- [ ] **Step 3: Commit éventuel** (si rien à committer, ignorer)

---

## Documentation environnements (hors code — pour l'utilisateur)

À faire côté Power Platform (rappel, pas dans ce repo) :
1. Créer une **variable d'environnement Texte** `BaseAppUrl` dans la solution = `https://apps.powerapps.com/play/e/{environmentId}/a/{appId}` de chaque environnement.
2. Dans le flux Power Automate qui envoie les mails, construire le lien :
   - DE : `@{variables('BaseAppUrl')}?code_pj=<codePJ>&vue=de`
   - FL : `@{variables('BaseAppUrl')}?code_pj=<codePJ>&vue=fl&section=<section>`
3. L'app React est identique dans les 3 environnements — aucun changement de build.
