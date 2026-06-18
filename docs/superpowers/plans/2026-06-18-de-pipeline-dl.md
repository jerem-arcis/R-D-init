# Cycle de vie projet DE → code chapeau → DL — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructurer le cycle de vie d'une DE en un pipeline de statuts (brouillon → en attente de code chapeau → en attente de DL → en attente de validation DL → validée/refusée), avec alertes ADV J‑0/J+6, aperçu SAP en vue synthèse, et une nouvelle page DL alimentée par import de fichier.

**Architecture:** App React + Vite, données mock en localStorage via `base44` client, React Query, shadcn/ui. Un module unique `deStatus.js` centralise les statuts + le helper d'alerte (pattern de `launchAlert.js`). Une nouvelle entité mock `DeclinaisonLogistique` et une page `DL` complètent le parcours. Pas de backend réel.

**Tech Stack:** React 18 (JSX), react-router-dom (HashRouter), @tanstack/react-query, Tailwind + shadcn/ui, Vitest (tests purs), lucide-react.

## Global Constraints

- Libellés et copies **en français** (UI existante).
- Pas de migration de données réelle : données mock re-seedées via bump du `SEED_FLAG`.
- Hors périmètre **strict** : aucune création de Fiche de Lancement (FL) à la validation d'une DL. La validation d'une DL met le projet en `validee` et s'arrête là.
- Type de demande `autre` laissé inchangé.
- Tests purs uniquement (Vitest, `environment: node`), pas de tests UI (cohérent avec l'existant). Lancement : `npm run test`.
- Statuts (clés exactes) : `brouillon`, `en_attente_code_chapeau`, `en_attente_dl`, `en_attente_validation_dl`, `validee`, `refusee`.

---

## File Structure

- **Créer** `src/lib/deStatus.js` — définition des statuts (clé, libellé, ton, ordre, icône-name) + helpers `getStatutMeta`, `STATUT_ORDER`, et `codeChapeauAlert`.
- **Créer** `src/lib/deStatus.test.js` — tests purs des helpers.
- **Créer** `src/pages/DL.jsx` — page de Déclinaison Logistique (import + décision).
- **Modifier** `src/api/base44Client.js` — ajouter l'entité `DeclinaisonLogistique`.
- **Modifier** `src/api/entities.js` — exporter `DeclinaisonLogistique`.
- **Modifier** `src/pages.config.js` — enregistrer la page `DL`.
- **Modifier** `src/pages/CreerDE.jsx` — retraits + aperçu synthèse + statut de soumission.
- **Modifier** `src/pages/TraiterDE.jsx` — étape code chapeau (bouton simulé).
- **Modifier** `src/pages/DemandesEtude.jsx` — onglets/stats/badges/routage + alertes.
- **Modifier** `src/lib/mockSeed.js` — DE de démo dans les nouveaux statuts + `de_dl`→`de` + bump flag.

---

## Task 1 : Module de statuts + helper d'alerte (deStatus.js)

**Files:**
- Create: `src/lib/deStatus.js`
- Test: `src/lib/deStatus.test.js`

**Interfaces:**
- Produces:
  - `STATUTS` : objet `{ [cle]: { key, label, tone, order } }`.
  - `STATUT_ORDER` : `string[]` des clés dans l'ordre du pipeline.
  - `getStatutMeta(key) -> { key, label, tone, order }` (fallback sur `brouillon`).
  - `codeChapeauAlert(de, today = new Date()) -> { level: 'none'|'j0'|'j6', joursEcoules: number|null }`.

- [ ] **Step 1: Écrire les tests qui échouent**

```js
// src/lib/deStatus.test.js
import { describe, it, expect } from "vitest";
import { STATUTS, STATUT_ORDER, getStatutMeta, codeChapeauAlert } from "./deStatus";

describe("STATUTS", () => {
  it("expose les 6 statuts du pipeline dans l'ordre", () => {
    expect(STATUT_ORDER).toEqual([
      "brouillon",
      "en_attente_code_chapeau",
      "en_attente_dl",
      "en_attente_validation_dl",
      "validee",
      "refusee",
    ]);
  });
  it("chaque statut a un libellé", () => {
    expect(STATUTS.en_attente_code_chapeau.label).toBe("En attente de code chapeau");
    expect(STATUTS.en_attente_dl.label).toBe("En attente de DL");
    expect(STATUTS.en_attente_validation_dl.label).toBe("En attente de validation DL");
  });
  it("getStatutMeta retombe sur brouillon si clé inconnue", () => {
    expect(getStatutMeta("xxx").key).toBe("brouillon");
  });
});

describe("codeChapeauAlert", () => {
  const mkDe = (statut, dateDemande) => ({ statut, date_demande_code_chapeau: dateDemande });
  it("renvoie none hors statut en_attente_code_chapeau", () => {
    const r = codeChapeauAlert(mkDe("validee", "2026-06-01"), new Date("2026-06-20"));
    expect(r.level).toBe("none");
  });
  it("renvoie none si pas de date", () => {
    const r = codeChapeauAlert(mkDe("en_attente_code_chapeau", null), new Date("2026-06-20"));
    expect(r.level).toBe("none");
  });
  it("renvoie j0 le jour même de la demande", () => {
    const r = codeChapeauAlert(mkDe("en_attente_code_chapeau", "2026-06-20"), new Date("2026-06-20"));
    expect(r.level).toBe("j0");
    expect(r.joursEcoules).toBe(0);
  });
  it("renvoie j0 entre J+1 et J+5", () => {
    const r = codeChapeauAlert(mkDe("en_attente_code_chapeau", "2026-06-15"), new Date("2026-06-20"));
    expect(r.level).toBe("j0");
    expect(r.joursEcoules).toBe(5);
  });
  it("renvoie j6 à partir de J+6", () => {
    const r = codeChapeauAlert(mkDe("en_attente_code_chapeau", "2026-06-14"), new Date("2026-06-20"));
    expect(r.level).toBe("j6");
    expect(r.joursEcoules).toBe(6);
  });
});
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run: `npm run test -- deStatus`
Expected: FAIL (module `./deStatus` introuvable).

- [ ] **Step 3: Implémenter le module**

```js
// src/lib/deStatus.js
// Source unique de vérité du pipeline de statuts d'une DE/projet et des
// alertes ADV liées à l'attente du code chapeau.

export const STATUTS = {
  brouillon: { key: "brouillon", label: "Brouillon", tone: "amber", order: 0 },
  en_attente_code_chapeau: {
    key: "en_attente_code_chapeau",
    label: "En attente de code chapeau",
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
  refusee: { key: "refusee", label: "Refusée", tone: "red", order: 5 },
};

export const STATUT_ORDER = Object.values(STATUTS)
  .sort((a, b) => a.order - b.order)
  .map((s) => s.key);

export const getStatutMeta = (key) => STATUTS[key] || STATUTS.brouillon;

const MS_PER_DAY = 86_400_000;
const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();

// Alerte ADV pour une DE en attente du code chapeau.
// Référence : date_demande_code_chapeau. J+0 dès la demande, J+6 renforcée.
export const codeChapeauAlert = (de, today = new Date()) => {
  if (!de || de.statut !== "en_attente_code_chapeau" || !de.date_demande_code_chapeau) {
    return { level: "none", joursEcoules: null };
  }
  const d = new Date(de.date_demande_code_chapeau);
  if (Number.isNaN(d.getTime())) return { level: "none", joursEcoules: null };
  const joursEcoules = Math.round((startOfDay(today) - startOfDay(d)) / MS_PER_DAY);
  if (joursEcoules < 0) return { level: "none", joursEcoules };
  if (joursEcoules >= 6) return { level: "j6", joursEcoules };
  return { level: "j0", joursEcoules };
};
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npm run test -- deStatus`
Expected: PASS (tous les tests verts).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deStatus.js src/lib/deStatus.test.js
git commit -m "feat(de): module de statuts du pipeline + alerte code chapeau J-0/J+6"
```

---

## Task 2 : Entité mock DeclinaisonLogistique

**Files:**
- Modify: `src/api/base44Client.js` (bloc `entities`, ~lignes 79-84)
- Modify: `src/api/entities.js`

**Interfaces:**
- Produces : `base44.entities.DeclinaisonLogistique` (mêmes méthodes `list/filter/get/create/update/delete` que les autres entités) ; export nommé `DeclinaisonLogistique`.

- [ ] **Step 1: Ajouter l'entité au client mock**

Dans `src/api/base44Client.js`, dans l'objet `entities`, ajouter la ligne après `Query` :

```js
  entities: {
    FicheLancement: createEntity('FicheLancement'),
    DemandeEtude: createEntity('DemandeEtude'),
    CodeEAN: createEntity('CodeEAN'),
    Query: createEntity('Query'),
    DeclinaisonLogistique: createEntity('DeclinaisonLogistique'),
  },
```

- [ ] **Step 2: Exporter l'entité**

Dans `src/api/entities.js`, ajouter après la ligne `CodeEAN` :

```js
export const DeclinaisonLogistique = base44.entities.DeclinaisonLogistique;
```

- [ ] **Step 3: Vérifier que le build ne casse pas**

Run: `npm run test -- deStatus`
Expected: PASS (aucune régression ; pas de test dédié, simple sanity).

- [ ] **Step 4: Commit**

```bash
git add src/api/base44Client.js src/api/entities.js
git commit -m "feat(dl): entité mock DeclinaisonLogistique"
```

---

## Task 3 : CreerDE — retraits + aperçu synthèse + statut de soumission

**Files:**
- Modify: `src/pages/CreerDE.jsx`

**Interfaces:**
- Consumes : rien de nouveau (utilise `formData`, `zug` déjà présents).
- Produces : une DE créée avec `statut: 'en_attente_code_chapeau'` et `date_demande_code_chapeau` à la soumission.

- [ ] **Step 1: Retirer la carte de type DE/DL**

Dans l'écran de sélection (`step === 'selection'`), supprimer le bloc `<TypeCard ... title="DE / DL" ... onClick={() => { setFormType('de_dl'); ... }} />` (≈ lignes 854-863). Passer la grille de `md:grid-cols-3` à `md:grid-cols-2`.

- [ ] **Step 2: Retirer le bandeau « Pré-remplissage assisté »**

Supprimer :
- le grand bloc JSX `Pré-remplissage assisté` (le `<div>` avec `Sparkles`/`Upload`, ≈ lignes 880-940) ;
- les constantes `PREFILL_PRESETS_DE`, `PREFILL_PRESETS_AUTRE` (≈ lignes 115-170) et `const sleep = ...` (≈ ligne 172) ;
- la fonction `handlePrefillFromFile` (≈ lignes 707-726) ;
- les états `const [isPrefilling, setIsPrefilling] = ...` et `const [prefilledFrom, setPrefilledFrom] = ...` (≈ lignes 578-579) ;
- les imports devenus inutiles dans la ligne `lucide-react` : `Upload`, `Sparkles` (garder le reste). Retirer aussi `Monitor` seulement après l'étape 3 si plus utilisé.

- [ ] **Step 3: Remplacer l'aperçu SAP rétro par une vue synthèse**

Supprimer les blocs `SAP_VIEWS` (≈ 399-453), `SapField` (≈ 456-472) et `SapPreviewDialog` (≈ 474-567). Les remplacer par un composant `SapSynthesisDialog` au style Synthèse FL :

```jsx
// ---------- Aperçu SAP : vue synthèse (style Synthèse FL) ----------
const SynthField = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
    <p className="text-sm text-slate-900">{value !== '' && value != null ? value : '—'}</p>
  </div>
);

const SynthCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
      <Icon className="w-4 h-4 text-slate-500" />
      <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
    </div>
    <div className="p-4 grid grid-cols-2 gap-3">{children}</div>
  </div>
);

const SapSynthesisDialog = ({ open, onOpenChange, data, zug }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
      <section className="bg-gradient-to-br from-slate-50 to-violet-50">
        <header className="bg-gradient-to-r from-violet-600 to-violet-700 text-white px-6 py-4 flex items-center gap-3">
          <Monitor className="w-5 h-5" />
          <div>
            <h2 className="text-lg font-bold">Synthèse SAP — aperçu</h2>
            <p className="text-xs text-violet-100">Consolidation des données article — lecture seule, rien n'est écrit dans SAP</p>
          </div>
        </header>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SynthCard title="Données de base" icon={Layers}>
            <SynthField label="Désignation" value={data.designation_article} />
            <SynthField label="Groupe article" value={data.groupe_article} />
            <SynthField label="Poids brut" value={data.poids_brut && `${data.poids_brut} g`} />
            <SynthField label="Poids net" value={data.poids_net && `${data.poids_net} g`} />
            <SynthField label="ZUG" value={zug} />
            <SynthField label="Groupe d'autorisation" value={data.groupe_autorisation} />
          </SynthCard>
          <SynthCard title="Ventes" icon={ShoppingCart}>
            <SynthField label="Client" value={data.client} />
            <SynthField label="Division (usine)" value={data.division} />
            <SynthField label="Secteur d'activité" value={data.marque} />
            <SynthField label="Hiérarchie produit" value={data.famille_produit} />
          </SynthCard>
          <SynthCard title="Comptabilité" icon={FileText}>
            <SynthField label="Division" value={data.division} />
            <SynthField label="Classe de valorisation" value={data.classe_valorisation} />
            <SynthField label="Contrôle prix" value={data.classe_valorisation ? 'S' : ''} />
          </SynthCard>
          <SynthCard title="Calcul du coût" icon={Settings2}>
            <SynthField label="Centre de profit" value={data.centre_profit} />
            <SynthField label="Groupe de frais généraux" value={data.groupe_frais_generaux} />
          </SynthCard>
        </div>
      </section>
    </DialogContent>
  </Dialog>
);
```

Ajouter `ShoppingCart` à l'import `lucide-react` (et conserver `Monitor`, `Layers`, `FileText`, `Settings2` déjà importés). Mettre à jour l'usage en bas du formulaire :

```jsx
<SapSynthesisDialog
  open={sapPreviewOpen}
  onOpenChange={setSapPreviewOpen}
  data={formData}
  zug={zug}
/>
```

- [ ] **Step 4: Passer la soumission sur le nouveau statut**

Remplacer `handleSubmit` (≈ lignes 782-794). Le bouton de soumission crée la DE en `en_attente_code_chapeau` avec horodatage de la demande de code chapeau :

```jsx
const handleSubmit = (e) => {
  e.preventDefault();
  createMutation.mutate({
    ...formData,
    zug,
    type_de: formType,
    code_division_calc: autreCodeDivision,
    classe_valorisation_calc: autreClasseVal,
    centre_profit_calc: autreCentreProfit,
    secteur_activite_calc: autreSecteur,
    statut: 'en_attente_code_chapeau',
    date_demande_code_chapeau: new Date().toISOString(),
  });
};
```

Mettre aussi à jour le libellé du bouton submit (≈ ligne 1488) de « Envoyer à l'ADV » vers « Envoyer (demande code chapeau) » :

```jsx
<Send className="w-4 h-4 mr-2" />
Envoyer (demande code chapeau)
```

`handleSaveBrouillon` reste inchangé (statut `brouillon`).

- [ ] **Step 5: Vérifier le rendu**

Run: `npm run build`
Expected: build OK (aucune référence morte à `SapPreviewDialog`, `PREFILL_PRESETS_*`, `handlePrefillFromFile`, `isPrefilling`, `prefilledFrom`, `Upload`, `Sparkles`).

- [ ] **Step 6: Commit**

```bash
git add src/pages/CreerDE.jsx
git commit -m "feat(de): CreerDE retrait DE/DL + pré-remplissage, aperçu SAP en synthèse, soumission en attente code chapeau"
```

---

## Task 4 : TraiterDE — étape code chapeau (bouton simulé)

**Files:**
- Modify: `src/pages/TraiterDE.jsx`

**Interfaces:**
- Consumes : `getStatutMeta` de `deStatus.js`.
- Produces : transition `en_attente_code_chapeau` → `en_attente_dl` avec `code_chapeau` + `date_code_chapeau`.

- [ ] **Step 1: Importer le helper de statut**

En haut de `TraiterDE.jsx`, ajouter :

```jsx
import { getStatutMeta } from '@/lib/deStatus';
```

- [ ] **Step 2: Remplacer le panneau « Décision ADV » par l'étape code chapeau**

Remplacer la mutation et les handlers de validation EAN/FL par un flux code chapeau simulé. Retirer `handleValider`, l'état `selectedEAN`, `pickedUsine`, les queries `codesEAN`/`updateCodeEANMutation`/`createFLMutation` et leurs usages JSX. Ajouter :

```jsx
const genererCodeChapeau = () => {
  // Code chapeau simulé : préfixe CC + 6 chiffres dérivés de l'horodatage.
  const suffixe = String(Date.now()).slice(-6);
  return `CC-${suffixe}`;
};

const handleCodeChapeauRecu = async () => {
  await updateDEMutation.mutateAsync({
    deId,
    data: {
      statut: 'en_attente_dl',
      code_chapeau: genererCodeChapeau(),
      date_code_chapeau: new Date().toISOString(),
    },
  });
};
```

Le bloc JSX `{!isReadOnly && (<FormSection title="Décision ADV" ...>)}` est remplacé, **uniquement quand `de.statut === 'en_attente_code_chapeau'`**, par :

```jsx
{de.statut === 'en_attente_code_chapeau' && (
  <FormSection title="Code chapeau" icon={CheckCircle2}>
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        En attente du code chapeau pour ce projet. Cliquez ci-dessous une fois le code
        chapeau reçu de SAP pour passer la demande en « En attente de DL ».
      </p>
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border">
        <Button
          variant="outline"
          onClick={() => setShowRefus(true)}
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Refuser
        </Button>
        <Button
          onClick={handleCodeChapeauRecu}
          disabled={updateDEMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Code chapeau reçu
        </Button>
      </div>
      {showRefus && (
        <div className="space-y-3 pt-2 border-t border-border">
          <Label className="text-xs font-semibold text-slate-700">
            Motif de refus <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={motifRefus}
            onChange={(e) => setMotifRefus(e.target.value)}
            placeholder="Expliquer pourquoi cette demande est refusée…"
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setShowRefus(false); setMotifRefus(''); }}>
              Annuler
            </Button>
            <Button
              onClick={handleRefuser}
              disabled={updateDEMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Confirmer le refus
            </Button>
          </div>
        </div>
      )}
    </div>
  </FormSection>
)}
```

`handleRefuser` est conservé tel quel (passe en `refusee`). Retirer l'import et la constante `USINES` devenus inutiles, ainsi que l'import de `Select*` s'il n'est plus utilisé.

- [ ] **Step 3: Mettre à jour les bandeaux d'état en haut**

Remplacer les deux `Alert` de tête (≈ lignes 229-244) pour refléter le nouveau pipeline (afficher le code chapeau quand présent) :

```jsx
{de.code_chapeau && (de.statut === 'en_attente_dl' || de.statut === 'en_attente_validation_dl' || de.statut === 'validee') && (
  <Alert className="bg-emerald-50 border-emerald-200">
    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
    <AlertDescription className="text-emerald-700">
      Code chapeau reçu : <strong>{de.code_chapeau}</strong> — statut : {getStatutMeta(de.statut).label}
    </AlertDescription>
  </Alert>
)}
{de.statut === 'refusee' && (
  <Alert className="bg-red-50 border-red-200">
    <XCircle className="w-4 h-4 text-red-600" />
    <AlertDescription className="text-red-700">
      Demande refusée — Motif : {de.motif_refus}
    </AlertDescription>
  </Alert>
)}
```

Mettre à jour `isReadOnly` (≈ ligne 200) pour ne montrer le panneau d'action que sur `en_attente_code_chapeau` (déjà géré par le `&&` du Step 2, donc `isReadOnly` n'est plus nécessaire — le retirer s'il n'est plus référencé).

- [ ] **Step 4: Vérifier le build**

Run: `npm run build`
Expected: build OK (aucune référence morte à `handleValider`, `selectedEAN`, `pickedUsine`, `codesEAN`, `createFLMutation`, `USINES`).

- [ ] **Step 5: Commit**

```bash
git add src/pages/TraiterDE.jsx
git commit -m "feat(de): TraiterDE étape code chapeau simulée -> en attente de DL"
```

---

## Task 5 : Page DL (import + décision)

**Files:**
- Create: `src/pages/DL.jsx`
- Modify: `src/pages.config.js`

**Interfaces:**
- Consumes : `base44.entities.DeclinaisonLogistique`, `base44.entities.DemandeEtude`, `getStatutMeta`.
- Produces : page route `DL?id=<deId>` ; crée/maj une `DeclinaisonLogistique` ; transitions DE `en_attente_dl` → `en_attente_validation_dl` → `validee`/`refusee`.

- [ ] **Step 1: Enregistrer la page dans la config**

Dans `src/pages.config.js` : ajouter l'import `import DL from './pages/DL';` et l'entrée `"DL": DL,` dans `PAGES`.

- [ ] **Step 2: Créer la page DL**

```jsx
// src/pages/DL.jsx
import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, Upload, CheckCircle2, XCircle, Loader2, FileText, Truck,
  Package, Factory, ShoppingCart,
} from 'lucide-react';
import { getStatutMeta } from '@/lib/deStatus';

// Données de démonstration préremplies lors de l'« import » du fichier DL.
const DL_IMPORT_PRESET = {
  vl: 'VL-2026-0042',
  article_prix: '12,40 €',
  sites_stockage: 'Bonloc / Plateforme Sud',
  dluc_dluo_critique: 21,
  cle_calcul_lot_usine: 'LOT-USINE-A',
  cle_calcul_lot_stockiste: 'LOT-STK-B',
  profil_couverture: 'PC-30',
  delai_securite: 3,
  type_approvisionnement: 'Fabrication interne',
  type_usine: 'Traiteur',
  type_palette: 'Europe 80x120',
  duree_vie: 24,
  unite_duree_vie: 'mois',
  statut_lancement: 'Permanent',
  libelle_long_40: 'Déclinaison logistique standard',
  marque: 'Boncolac',
  secteur_activite: 'GMS',
  canaux_distribution: 'GMS, RHF',
};

const Field = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
    <p className="text-sm text-slate-900">{value !== '' && value != null ? value : '—'}</p>
  </div>
);

const SubSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
      <Icon className="w-4 h-4 text-slate-500" />
      <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
    </div>
    <div className="p-4 grid grid-cols-2 gap-3">{children}</div>
  </div>
);

export default function DL() {
  const [searchParams] = useSearchParams();
  const deId = searchParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRefus, setShowRefus] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');

  const { data: de, isLoading } = useQuery({
    queryKey: ['demande_etude', deId],
    queryFn: () => base44.entities.DemandeEtude.filter({ id: deId }),
    enabled: !!deId,
    select: (data) => data[0] || null,
  });

  const { data: dl } = useQuery({
    queryKey: ['declinaison_logistique', deId],
    queryFn: () => base44.entities.DeclinaisonLogistique.filter({ demande_etude_id: deId }),
    enabled: !!deId,
    select: (data) => data[0] || null,
  });

  const updateDE = useMutation({
    mutationFn: ({ data }) => base44.entities.DemandeEtude.update(deId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['demandes_etude'] }),
  });

  const upsertDL = useMutation({
    mutationFn: async (data) => {
      if (dl) return base44.entities.DeclinaisonLogistique.update(dl.id, data);
      return base44.entities.DeclinaisonLogistique.create({ demande_etude_id: deId, ...data });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['declinaison_logistique', deId] }),
  });

  const handleImport = async (file) => {
    if (!file) return;
    await upsertDL.mutateAsync({
      ...DL_IMPORT_PRESET,
      imported_file: file.name,
      date_import: new Date().toISOString(),
      statut: 'en_attente_validation_dl',
    });
    await updateDE.mutateAsync({ data: { statut: 'en_attente_validation_dl' } });
  };

  const handleValider = async () => {
    await upsertDL.mutateAsync({ statut: 'validee', date_validation: new Date().toISOString() });
    await updateDE.mutateAsync({ data: { statut: 'validee', date_validation: new Date().toISOString() } });
    navigate(createPageUrl('DemandesEtude'));
  };

  const handleRefuser = async () => {
    if (!motifRefus.trim()) { alert('Veuillez saisir un motif de refus'); return; }
    await upsertDL.mutateAsync({ statut: 'refusee', motif_refus: motifRefus, date_refus: new Date().toISOString() });
    await updateDE.mutateAsync({ data: { statut: 'refusee', motif_refus: motifRefus, date_refus: new Date().toISOString() } });
    navigate(createPageUrl('DemandesEtude'));
  };

  const imported = useMemo(
    () => !!dl && (dl.statut === 'en_attente_validation_dl' || dl.statut === 'validee' || dl.statut === 'refusee'),
    [dl]
  );

  if (isLoading || !de) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const designation = de.designation_article || de.autre_designation;
  const isFinal = de.statut === 'validee' || de.statut === 'refusee';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link to={createPageUrl('DemandesEtude')}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-foreground uppercase tracking-tight">
                {designation || 'Déclinaison Logistique'}
              </h1>
              <Badge className="bg-violet-100 text-violet-700 border-violet-300 text-[10px] font-bold uppercase tracking-wider">
                DL
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Code chapeau : <span className="font-mono">{de.code_chapeau || '—'}</span> · Statut : {getStatutMeta(de.statut).label}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {!imported ? (
          <div className="bg-gradient-to-r from-violet-500/5 via-violet-500/10 to-violet-500/5 rounded-xl border-2 border-dashed border-violet-500/30 p-8 text-center">
            <Upload className="w-10 h-10 text-violet-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-foreground">Importer le fichier de Déclinaison Logistique</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Importez le fichier (Excel) : les informations type Synthèse FL seront préremplies.
            </p>
            <label
              htmlFor="dl-file"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-xs font-bold uppercase tracking-wide cursor-pointer bg-violet-600 text-white hover:bg-violet-700 shadow-md"
            >
              <Upload className="w-4 h-4" />
              Importer le fichier
            </label>
            <input
              id="dl-file"
              type="file"
              accept="*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }}
              className="sr-only"
            />
          </div>
        ) : (
          <>
            {dl?.imported_file && (
              <Alert className="bg-violet-50 border-violet-200">
                <CheckCircle2 className="w-4 h-4 text-violet-600" />
                <AlertDescription className="text-violet-700">
                  Fichier importé : <strong>{dl.imported_file}</strong>
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SubSection title="Contrôle de Gestion" icon={FileText}>
                <Field label="Code chapeau" value={de.code_chapeau} />
                <Field label="Libellé" value={dl?.libelle_long_40} />
                <Field label="VL" value={dl?.vl} />
                <Field label="Article prix" value={dl?.article_prix} />
              </SubSection>
              <SubSection title="Supply Chain" icon={Truck}>
                <Field label="Sites de stockage" value={dl?.sites_stockage} />
                <Field label="DLC/DLUO critique" value={dl?.dluc_dluo_critique && `${dl.dluc_dluo_critique} j`} />
                <Field label="Délai de sécurité" value={dl?.delai_securite && `${dl.delai_securite} j`} />
                <Field label="Type d'approvisionnement" value={dl?.type_approvisionnement} />
              </SubSection>
              <SubSection title="Gestion du besoin" icon={Package}>
                <Field label="Clé calcul lot usine" value={dl?.cle_calcul_lot_usine} />
                <Field label="Clé calcul lot stockiste" value={dl?.cle_calcul_lot_stockiste} />
                <Field label="Profil de couverture" value={dl?.profil_couverture} />
              </SubSection>
              <SubSection title="Industriel" icon={Factory}>
                <Field label="Type d'usine" value={dl?.type_usine} />
                <Field label="Type de palette" value={dl?.type_palette} />
                <Field label="Durée de vie" value={dl?.duree_vie && `${dl.duree_vie} ${dl.unite_duree_vie || ''}`} />
              </SubSection>
              <SubSection title="Commerce" icon={ShoppingCart}>
                <Field label="Statut lancement" value={dl?.statut_lancement} />
                <Field label="Marque" value={dl?.marque} />
                <Field label="Secteur" value={dl?.secteur_activite} />
                <Field label="Canaux" value={dl?.canaux_distribution} />
              </SubSection>
            </div>

            {de.statut === 'refusee' && (
              <Alert className="bg-red-50 border-red-200">
                <XCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700">DL refusée — Motif : {de.motif_refus}</AlertDescription>
              </Alert>
            )}

            {!isFinal && !showRefus && (
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRefus(true)} className="border-red-300 text-red-600 hover:bg-red-50">
                  <XCircle className="w-4 h-4 mr-2" /> Refuser
                </Button>
                <Button onClick={handleValider} disabled={updateDE.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Valider la DL
                </Button>
              </div>
            )}

            {!isFinal && showRefus && (
              <div className="space-y-3 bg-card rounded-xl border border-border p-5">
                <Label className="text-xs font-semibold text-slate-700">Motif de refus <span className="text-red-500">*</span></Label>
                <Textarea value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} placeholder="Expliquer le refus…" className="min-h-[100px]" />
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { setShowRefus(false); setMotifRefus(''); }}>Annuler</Button>
                  <Button onClick={handleRefuser} disabled={updateDE.isPending} className="bg-red-600 hover:bg-red-700 text-white">
                    <XCircle className="w-4 h-4 mr-2" /> Confirmer le refus
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Vérifier le build**

Run: `npm run build`
Expected: build OK ; la route `#/DL` est disponible.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DL.jsx src/pages.config.js
git commit -m "feat(dl): page DL avec import simulé + valider/refuser"
```

---

## Task 6 : DemandesEtude — onglets/stats/badges/routage + alertes

**Files:**
- Modify: `src/pages/DemandesEtude.jsx`

**Interfaces:**
- Consumes : `STATUT_ORDER`, `getStatutMeta`, `codeChapeauAlert` de `deStatus.js`.

- [ ] **Step 1: Importer les helpers et définir les tons de badge**

Ajouter en haut :

```jsx
import { STATUTS, getStatutMeta, codeChapeauAlert } from '@/lib/deStatus';
```

Ajouter une table de classes Tailwind par ton (les classes doivent être littérales pour Tailwind) :

```jsx
const TONE_BADGE = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};
```

- [ ] **Step 2: Remplacer `getStatutBadge`**

```jsx
const getStatutBadge = (statut) => {
  const meta = getStatutMeta(statut);
  return <Badge className={TONE_BADGE[meta.tone] || TONE_BADGE.amber}>{meta.label}</Badge>;
};
```

- [ ] **Step 3: Reconstruire les onglets de filtre**

Remplacer le `<TabsList>` (≈ lignes 187-222) par une génération depuis le pipeline + « Toutes » :

```jsx
<TabsList className="bg-card border border-border flex-wrap h-auto">
  {STATUT_ORDER.map((key) => (
    <TabsTrigger
      key={key}
      value={key}
      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
    >
      {STATUTS[key].label}
    </TabsTrigger>
  ))}
  <TabsTrigger
    value="toutes"
    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-xs font-semibold tracking-wide"
  >
    Toutes
  </TabsTrigger>
</TabsList>
```

- [ ] **Step 4: Mettre à jour les cartes stats**

Remplacer les 4 cartes en dur par 3 cartes alignées sur le pipeline (À traiter = `en_attente_code_chapeau`, DL en cours = `en_attente_dl` + `en_attente_validation_dl`, Validées = `validee`) + 1 carte « Alertes code chapeau ». Le compteur d'alertes :

```jsx
const alertCount = demandes.filter((d) => codeChapeauAlert(d).level !== 'none').length;
```

Carte alertes (remplacer la 4ᵉ carte « Refusées ») :

```jsx
<div className="group bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
  <div className="flex items-center gap-3">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center group-hover:scale-110 transition-transform">
      <Clock className="w-6 h-6 text-rose-700" />
    </div>
    <div>
      <p className="text-3xl font-bold text-foreground">{alertCount}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Alertes code chapeau</p>
    </div>
  </div>
</div>
```

Mettre à jour les 3 autres compteurs : `en_attente_code_chapeau`, `(en_attente_dl|en_attente_validation_dl)`, `validee`.

- [ ] **Step 5: Badge d'alerte sur la ligne + routage par statut**

Dans la ligne du tableau, ajouter un badge d'alerte à côté du statut quand `codeChapeauAlert(de).level !== 'none'` :

```jsx
<TableCell>
  <div className="flex items-center gap-2">
    {getStatutBadge(de.statut)}
    {(() => {
      const a = codeChapeauAlert(de);
      if (a.level === 'none') return null;
      return (
        <Badge className={a.level === 'j6' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
          <Clock className="w-3 h-3 mr-1" />
          {a.level === 'j6' ? `Relance J+${a.joursEcoules}` : `J+${a.joursEcoules}`}
        </Badge>
      );
    })()}
  </div>
</TableCell>
```

Remplacer le lien de fin de ligne (≈ lignes 436-444) par un routage selon le statut :

```jsx
<Link to={createPageUrl(
  de.statut === 'en_attente_dl' || de.statut === 'en_attente_validation_dl'
    ? `DL?id=${de.id}`
    : `TraiterDE?id=${de.id}`
)}>
  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10">
    <ChevronRight className="w-5 h-5 text-primary" />
  </Button>
</Link>
```

- [ ] **Step 6: Vérifier le build**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 7: Commit**

```bash
git add src/pages/DemandesEtude.jsx
git commit -m "feat(de): liste alignée sur le pipeline + alertes code chapeau + routage DL"
```

---

## Task 7 : Données de démo (mockSeed) sur le nouveau pipeline

**Files:**
- Modify: `src/lib/mockSeed.js`

- [ ] **Step 1: Neutraliser le type DE/DL et bumper le flag**

Dans `src/lib/mockSeed.js` :
- Changer `const SEED_FLAG = 'mock_seed_v6';` en `'mock_seed_v7';`.
- Les échantillons existants gardent `statut: 'validee'`. Remplacer leur `type_de: s.typeDe` à la création de `de` par une normalisation `de_dl`→`de` :

```js
type_de: s.typeDe === 'de_dl' ? 'de' : s.typeDe,
```

- [ ] **Step 2: Ajouter des DE de démo dans les nouveaux statuts**

Juste avant le `return { des, fiches };` final de `buildSeedData`, pousser quelques DE in-progress (sans FL) pour peupler les onglets et déclencher les alertes :

```js
  // DE de démonstration réparties sur les statuts in-progress du pipeline.
  const isoOffsetDateTime = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };
  const pipelineSamples = [
    // En attente de code chapeau — demande du jour (alerte J+0)
    { statut: 'en_attente_code_chapeau', demande: 0, designation: 'MINI QUICHES LORRAINES 16P', famille: 'Entrees chaudes', demandeur: 'Inès Faure' },
    // En attente de code chapeau — 8 jours (alerte J+6 / relance)
    { statut: 'en_attente_code_chapeau', demande: -8, designation: 'PLATEAU SUSHIS 30P', famille: 'Plats cuisinés', demandeur: 'Karim Benali' },
    // En attente de DL — code chapeau reçu
    { statut: 'en_attente_dl', demande: -12, codeChapeau: 'CC-204815', designation: 'TARTE FINE POMMES', famille: 'Desserts', demandeur: 'Léa Garnier' },
    // En attente de validation DL — fichier importé
    { statut: 'en_attente_validation_dl', demande: -15, codeChapeau: 'CC-204902', designation: 'CLUB SANDWICH POULET', famille: 'Plats cuisinés', demandeur: 'Bruno Mercier' },
  ];
  pipelineSamples.forEach((s, i) => {
    des.push({
      id: uid(),
      created_date: now,
      updated_date: now,
      type_de: 'de',
      code_projet: `PRJ-2026-${String(200 + i).padStart(3, '0')}`,
      axe_strategique: 'Business Courant',
      date_demande: isoDateOffset(s.demande - 2),
      reseau: 'GDM',
      type_demande_de: 'CA Additionnel',
      demandeur: s.demandeur,
      famille_produit: s.famille,
      designation_article: s.designation,
      marque: 'Boncolac',
      poids_net: 250,
      groupe_article: '0001',
      statut: s.statut,
      date_demande_code_chapeau: isoOffsetDateTime(s.demande),
      ...(s.codeChapeau ? { code_chapeau: s.codeChapeau, date_code_chapeau: isoOffsetDateTime(s.demande + 3) } : {}),
    });
  });
```

Ajouter aussi, pour le statut `en_attente_validation_dl`, une DL liée importée. Après la boucle ci-dessus, dans `seedMockDataIfNeeded`/`resetMockDemoData`, on ne crée pas de table DL au seed (la page DL crée la DL au premier import). **Décision** : pour `en_attente_validation_dl` la page DL re-créera la DL à l'ouverture si absente n'est pas souhaitable — donc on laisse l'échantillon `en_attente_validation_dl` SANS DL liée ; la page affichera l'écran d'import. Pour éviter l'incohérence, retirer l'échantillon `en_attente_validation_dl` du tableau `pipelineSamples` (garder les 3 autres).

> Note d'exécution : appliquer ce step en n'incluant **que** les 3 premiers échantillons (`en_attente_code_chapeau` ×2, `en_attente_dl` ×1). L'échantillon `en_attente_validation_dl` est volontairement omis pour rester cohérent avec le modèle (la DL n'existe qu'après import réel).

- [ ] **Step 3: Vérifier le build et les tests**

Run: `npm run build && npm run test`
Expected: build OK, tests verts.

- [ ] **Step 4: Commit**

```bash
git add src/lib/mockSeed.js
git commit -m "chore(seed): DE de démo sur le pipeline + de_dl->de + bump seed v7"
```

---

## Self-Review

- **Spec coverage :** Pipeline (Task 1), entité DL (Task 2), CreerDE retraits/aperçu/soumission (Task 3), alerte J‑0/J+6 (Task 1 helper + Task 6 affichage), TraiterDE code chapeau (Task 4), page DL import+décision (Task 5), liste onglets/stats/routage (Task 6), seed (Task 7). FL hors périmètre respecté (aucune création FL). ✅
- **Placeholders :** aucun TODO/«à compléter» ; tout le code est fourni. ✅
- **Cohérence des types :** `codeChapeauAlert` renvoie `{ level, joursEcoules }` partout ; statuts identiques à la liste des Global Constraints ; `getStatutMeta`/`STATUT_ORDER`/`STATUTS` cohérents entre Task 1, 4 et 6. ✅
