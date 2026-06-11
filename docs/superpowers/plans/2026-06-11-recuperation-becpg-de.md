# Récupération beCPG (CodePJ) dans la création d'une DE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter en haut du formulaire de création d'une DE un encart « CodePJ + Récupérer les informations » qui interroge un flux Power Automate et pré-remplit (en écrasant) les champs du formulaire DE.

**Architecture:** Une fonction pure `mapBeCPGToDE(json)` isolée dans `src/lib/becpgMapping.js` (testée unitairement), un helper `withValue(list, value)` pour injecter les valeurs hors-liste dans les `Select`, et un composant encart `RecupererBeCPG` intégré dans `src/pages/CreerDE.jsx` qui appelle le flux via `fetch` (pattern repris de `DeclencherFlux.jsx`).

**Tech Stack:** React 18, Vite 6, react-query, shadcn/ui (Radix), Tailwind, lucide-react. Tests via Vitest (à ajouter — pas encore présent).

---

## File Structure

- **Créé** : `src/lib/becpgMapping.js` — `mapBeCPGToDE(json)` (mapping pur réponse beCPG → formData partiel) + `withValue(list, value)` (fusion option hors-liste). Aucune dépendance React → testable isolément.
- **Créé** : `src/lib/becpgMapping.test.js` — tests unitaires Vitest du mapping avec le JSON de référence PJ4987.
- **Créé** : `vitest.config.ts` — config de test (environnement node, alias `@`).
- **Modifié** : `package.json` — devDependency `vitest` + script `test`.
- **Modifié** : `src/pages/CreerDE.jsx` — composant `RecupererBeCPG`, intégration en haut du form (types `de`/`de_dl`), fusion des options des `Select`/combobox via `withValue`.

---

## Task 1: Mise en place de Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Installer Vitest**

Run:
```bash
npm install -D vitest
```
Expected: `vitest` ajouté dans `devDependencies`, exit code 0.

- [ ] **Step 2: Ajouter le script `test` dans `package.json`**

Dans `package.json`, section `"scripts"`, ajouter la ligne `test` après `"lint"` :
```json
  "scripts": {
    "dev": "start pac code run && vite",
    "build": "vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "preview": "vite preview"
  },
```

- [ ] **Step 3: Créer `vitest.config.ts`**

Create `vitest.config.ts` (à la racine, à côté de `vite.config.ts`) :
```ts
import { defineConfig } from "vitest/config";
import * as path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
  },
});
```

- [ ] **Step 4: Vérifier que Vitest démarre (aucun test encore)**

Run: `npm test`
Expected: Vitest s'exécute et signale « No test files found » (ou équivalent), sans erreur de config.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: ajout de Vitest pour les tests unitaires"
```

---

## Task 2: Helper `mapBeCPGToDE` + `withValue` (TDD)

**Files:**
- Create: `src/lib/becpgMapping.js`
- Test: `src/lib/becpgMapping.test.js`

- [ ] **Step 1: Écrire les tests qui échouent**

Create `src/lib/becpgMapping.test.js` :
```js
import { describe, it, expect } from "vitest";
import { mapBeCPGToDE, withValue } from "./becpgMapping";

// Réponse de référence renvoyée par le flux Power Automate pour le CodePJ "PJ4987".
const PJ4987 = {
  entities: [
    {
      entity: {
        "cm:name": "Tarte Citron BIO-BNC FS",
        attributes: {
          "bnc:deAxeStrategique_fr": "Business Courant",
          "bcpg:code": "PJ4987",
          "bcpg:plants": [
            { "cm:name": "BONLOC", id: "7f149504", type: "bcpg:plant" },
          ],
          "bnc:deVolumeUV": 30000,
          "pjt:projectHierarchy1": {
            "bcpg:lkvValue": "RMN",
            id: "af1f3871",
            type: "bcpg:linkedValue",
            "bcpg:code": "LNK38",
          },
          "pjt:projectOrigin": "Retravail Produit - CA existant",
          "bnc:dePorteurCommercial": {
            "cm:userName": "laure.bertrand",
            id: "e58b977c",
            type: "cm:person",
          },
          "bnc:deAxeStrategique": "Business Courant",
          "bnc:deClient": "BONCOLAC",
          "bnc:deDateEchantillon": "2025-03-31T22:00:00.000Z",
          "bnc:deDateDemande": "2024-12-17T23:00:00.000Z",
          "bnc:deDateLivraison": "2025-08-31T22:00:00.000Z",
          "bnc:deFamilleProduit": "TARTES",
          "cm:name": "Tarte Citron BIO-BNC FS",
        },
        id: "62da6e6e",
        type: "pjt:project",
        "bcpg:code": "PJ4987",
      },
    },
  ],
};

describe("mapBeCPGToDE", () => {
  it("mappe tous les champs de la réponse PJ4987", () => {
    expect(mapBeCPGToDE(PJ4987)).toEqual({
      code_projet: "PJ4987",
      designation_article: "Tarte Citron BIO-BNC FS",
      date_demande: "2024-12-17",
      date_lancement: "2025-08-31",
      axe_strategique: "Business Courant",
      reseau: "RMN",
      type_demande_de: "Retravail Produit - CA existant",
      demandeur: "laure.bertrand",
      famille_produit: "TARTES",
      marque: "BONLOC",
      client: "BONCOLAC",
      qte_previsionnelle_annuelle: 30000,
    });
  });

  it("tronque les dates ISO en YYYY-MM-DD", () => {
    const out = mapBeCPGToDE(PJ4987);
    expect(out.date_demande).toBe("2024-12-17");
    expect(out.date_lancement).toBe("2025-08-31");
  });

  it("renvoie null quand entities est vide", () => {
    expect(mapBeCPGToDE({ entities: [] })).toBeNull();
  });

  it("renvoie null quand entities est absent", () => {
    expect(mapBeCPGToDE({})).toBeNull();
    expect(mapBeCPGToDE(null)).toBeNull();
  });

  it("n'inclut pas les clés dont la source est absente", () => {
    const minimal = {
      entities: [{ entity: { "bcpg:code": "PJ0001", attributes: {} } }],
    };
    expect(mapBeCPGToDE(minimal)).toEqual({ code_projet: "PJ0001" });
  });
});

describe("withValue", () => {
  it("ajoute la valeur si absente de la liste", () => {
    expect(withValue(["A", "B"], "C")).toEqual(["A", "B", "C"]);
  });

  it("ne duplique pas une valeur déjà présente", () => {
    expect(withValue(["A", "B"], "B")).toEqual(["A", "B"]);
  });

  it("renvoie la liste inchangée pour une valeur vide", () => {
    expect(withValue(["A", "B"], "")).toEqual(["A", "B"]);
    expect(withValue(["A", "B"], undefined)).toEqual(["A", "B"]);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL — `mapBeCPGToDE` / `withValue` introuvables (module `./becpgMapping` inexistant).

- [ ] **Step 3: Écrire l'implémentation minimale**

Create `src/lib/becpgMapping.js` :
```js
// Tronque une date ISO ("2024-12-17T23:00:00.000Z") au format YYYY-MM-DD
// attendu par les <input type="date">. Renvoie undefined si valeur absente.
const toDateInput = (iso) =>
  typeof iso === "string" && iso.length >= 10 ? iso.slice(0, 10) : undefined;

// N'affecte la clé que si la valeur est définie (non null/undefined),
// afin de ne pas écraser un champ avec une valeur absente de la réponse.
const setIf = (target, key, value) => {
  if (value !== undefined && value !== null) target[key] = value;
};

/**
 * Convertit la réponse du flux beCPG en objet partiel de formData de la DE.
 * Retourne null si aucune entité n'est présente (CodePJ introuvable).
 */
export function mapBeCPGToDE(json) {
  const entity = json?.entities?.[0]?.entity;
  if (!entity) return null;

  const a = entity.attributes || {};
  const out = {};

  setIf(out, "code_projet", entity["bcpg:code"]);
  setIf(out, "designation_article", a["cm:name"]);
  setIf(out, "date_demande", toDateInput(a["bnc:deDateDemande"]));
  setIf(out, "date_lancement", toDateInput(a["bnc:deDateLivraison"]));
  setIf(out, "axe_strategique", a["bnc:deAxeStrategique"]);
  setIf(out, "reseau", a["pjt:projectHierarchy1"]?.["bcpg:lkvValue"]);
  setIf(out, "type_demande_de", a["pjt:projectOrigin"]);
  setIf(out, "demandeur", a["bnc:dePorteurCommercial"]?.["cm:userName"]);
  setIf(out, "famille_produit", a["bnc:deFamilleProduit"]);
  setIf(out, "marque", a["bcpg:plants"]?.[0]?.["cm:name"]);
  setIf(out, "client", a["bnc:deClient"]);
  setIf(out, "qte_previsionnelle_annuelle", a["bnc:deVolumeUV"]);

  return out;
}

/**
 * Renvoie `list` augmentée de `value` si celle-ci est non vide et absente.
 * Sert à afficher dans un <Select> une valeur hors de la liste de référence.
 */
export function withValue(list, value) {
  if (!value || list.includes(value)) return list;
  return [...list, value];
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npm test`
Expected: PASS — tous les tests `mapBeCPGToDE` et `withValue` verts.

- [ ] **Step 5: Commit**

```bash
git add src/lib/becpgMapping.js src/lib/becpgMapping.test.js
git commit -m "feat: helper mapBeCPGToDE + withValue avec tests"
```

---

## Task 3: Encart `RecupererBeCPG` et intégration dans `CreerDE.jsx`

**Files:**
- Modify: `src/pages/CreerDE.jsx`

> Pas de test automatisé pour ce composant (le projet n'a pas de testing-library / jsdom configuré ; la logique à risque est déjà couverte par les tests de `mapBeCPGToDE`). Vérification manuelle à l'étape finale.

- [ ] **Step 1: Importer le helper et les icônes nécessaires**

Dans `src/pages/CreerDE.jsx`, ajouter l'import du helper après la ligne `import { useAdminLists } from '@/lib/adminLists';` (ligne 16) :
```jsx
import { mapBeCPGToDE, withValue } from '@/lib/becpgMapping';
```

Dans l'import `lucide-react` existant (ligne 13), ajouter les icônes `Search`, `XCircle` :
```jsx
import { ArrowLeft, Save, Send, FileText, Layers, Settings2, ChevronRight, Upload, Sparkles, Loader2, CheckCircle2, X, Check, ChevronsUpDown, Users, Search, XCircle } from 'lucide-react';
```

- [ ] **Step 2: Ajouter la constante d'URL du flux**

Dans `src/pages/CreerDE.jsx`, juste après la déclaration `const sleep = (ms) => ...` (ligne 169), ajouter :
```jsx
// URL du flux Power Automate qui retourne les données beCPG d'un CodePJ.
const BECPG_FLOW_URL =
  'https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/5a622144c10f44a6becafb2df0f78775/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5BL_-hxk0OMUfcJT9GRVKoh1BX7hkNsag7Qy3KxzpkQ';
```

- [ ] **Step 3: Créer le composant `RecupererBeCPG`**

Dans `src/pages/CreerDE.jsx`, ajouter ce composant juste avant `// ---------- Composant principal ----------` (ligne 268) :
```jsx
// ---------- Encart de récupération beCPG par CodePJ ----------
const RecupererBeCPG = ({ onApply }) => {
  const [codePJ, setCodePJ] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleFetch = async () => {
    const code = codePJ.trim();
    if (!code || status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(BECPG_FLOW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CodePJ: code }),
      });
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new Error('Réponse du flux illisible (JSON invalide).');
      }
      const mapped = mapBeCPGToDE(json);
      if (!mapped) {
        setStatus('error');
        setMessage(`Aucun projet trouvé pour le code « ${code} ».`);
        return;
      }
      const count = onApply(mapped);
      setStatus('success');
      setMessage(`${count} champ(s) renseigné(s) depuis « ${code} ».`);
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'Erreur lors de la récupération des informations.');
    }
  };

  const isLoading = status === 'loading';

  return (
    <div className="bg-gradient-to-r from-violet-500/5 via-violet-500/10 to-violet-500/5 rounded-xl border-2 border-dashed border-violet-500/30 p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 self-start">
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
          ) : status === 'success' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          ) : (
            <Search className="w-6 h-6 text-violet-600" />
          )}
        </div>
        <div className="flex-1 min-w-[220px]">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
            Récupération depuis beCPG
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Saisissez un Code PJ pour pré-remplir automatiquement la demande.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={codePJ}
              onChange={(e) => setCodePJ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFetch();
                }
              }}
              placeholder="Ex: PJ4987"
              className="h-10 max-w-[200px] font-mono"
            />
            <Button
              type="button"
              onClick={handleFetch}
              disabled={isLoading || !codePJ.trim()}
              className="h-10 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Récupérer les informations
            </Button>
          </div>
        </div>
      </div>
      {status === 'success' && message && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {status === 'error' && message && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-700">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="break-words">{message}</span>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Ajouter le handler `handleApplyBeCPG` dans le composant principal**

Dans `CreerDE`, juste après la fonction `handleChange` (ligne 323-325), ajouter :
```jsx
  // Applique les champs récupérés depuis beCPG (écrase les valeurs existantes).
  // Retourne le nombre de champs renseignés pour le message de confirmation.
  const handleApplyBeCPG = (mapped) => {
    setFormData((prev) => ({ ...prev, ...mapped }));
    return Object.keys(mapped).length;
  };
```

- [ ] **Step 5: Insérer l'encart en haut du formulaire (types `de` / `de_dl`)**

Dans le JSX, repérer l'ouverture `<form onSubmit={handleSubmit} className="space-y-6">` (ligne 492). Juste après cette ligne, avant le `<div>` du bloc « Pré-remplissage assisté », insérer :
```jsx
            {(formType === 'de' || formType === 'de_dl') && (
              <RecupererBeCPG onApply={handleApplyBeCPG} />
            )}
```

- [ ] **Step 6: Fusionner les valeurs hors-liste dans les Select et le combobox**

Les valeurs injectées (ex. `famille_produit="TARTES"`, `marque="BONLOC"`) peuvent être hors des listes de référence. Remplacer les sources d'options par leur version fusionnée via `withValue`.

6a. **Axe stratégique** — remplacer `adminLists.axes_strategiques.map((a) => (` (ligne ~584) par :
```jsx
                          {withValue(adminLists.axes_strategiques, formData.axe_strategique).map((a) => (
```

6b. **Réseau** — remplacer `adminLists.reseaux.map((r) => (` (ligne ~599) par :
```jsx
                          {withValue(adminLists.reseaux, formData.reseau).map((r) => (
```

6c. **Type de la demande** — remplacer `TYPES_DEMANDE_DE.map((t) => (` (ligne ~614) par :
```jsx
                          {withValue(TYPES_DEMANDE_DE, formData.type_demande_de).map((t) => (
```

6d. **Hiérarchie produit famille** — remplacer `adminLists.familles_produit.map((f) => (` (ligne ~642) par :
```jsx
                          {withValue(adminLists.familles_produit, formData.famille_produit).map((f) => (
```

6e. **Secteur d'activité** — remplacer `adminLists.secteurs_activite.map((m) => (` (ligne ~657) par :
```jsx
                          {withValue(adminLists.secteurs_activite, formData.marque).map((m) => (
```

6f. **Client (combobox)** — remplacer la prop `options={CLIENTS}` du `ClientCombobox` (ligne ~683) par :
```jsx
                          options={withValue(CLIENTS, formData.client)}
```

- [ ] **Step 7: Vérifier que le lint passe**

Run: `npm run lint`
Expected: aucune erreur sur `src/pages/CreerDE.jsx` ni `src/lib/becpgMapping.js`.

- [ ] **Step 8: Vérification manuelle**

Run: `npm run dev`
Puis dans le navigateur :
1. Aller sur « Nouvelle Demande d'Étude » → choisir le type **DE**.
2. Vérifier que l'encart « Récupération depuis beCPG » s'affiche tout en haut.
3. Saisir `PJ4987`, cliquer « Récupérer les informations ».
4. Vérifier que les champs se remplissent : Code projet = `PJ4987`, Nom du produit = `Tarte Citron BIO-BNC FS`, Date de la demande = `2024-12-17`, Axe stratégique = `Business Courant`, Réseau = `RMN`, Type = `Retravail Produit - CA existant`, Demandeur = `laure.bertrand`, Hiérarchie famille = `TARTES` (valeur ajoutée), Secteur = `BONLOC` (valeur ajoutée), Client = `BONCOLAC`, Date de lancement = `2025-08-31`, Qté prévisionnelle = `30000`.
5. Saisir un code bidon → vérifier le message « Aucun projet trouvé ».

- [ ] **Step 9: Commit**

```bash
git add src/pages/CreerDE.jsx
git commit -m "feat: encart récupération beCPG par CodePJ dans la création d'une DE"
```

---

## Self-Review Notes

- **Couverture spec :** helper de mapping (Task 2) ✔, encart + appel Power Automate (Task 3) ✔, fusion valeurs hors-liste (Task 3 step 6) ✔, écrasement total (Task 3 step 4) ✔, périmètre `de`/`de_dl` (Task 3 step 5) ✔, gestion d'erreurs code introuvable / HTTP / réseau / JSON (Task 3 step 3) ✔, tests `mapBeCPGToDE` (Task 2) ✔.
- **Cohérence des noms :** `mapBeCPGToDE` et `withValue` utilisés de façon identique entre helper, tests et `CreerDE.jsx`.
- **Champs non mappés** (`groupe_article`, `categorie`, `poids_net`) : non touchés, conforme à la spec.
