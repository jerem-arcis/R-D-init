# Task 6 Review — Formulaire DS (CreerDE.jsx)

**Reviewer verdict date:** 2026-06-26
**Build claim:** ✓ built in 5.45s (Vite bundle; see Critical finding — build does not surface runtime errors)

---

## Spec ✅

All required fields, sections, and wiring are present:

| Requirement | Status |
|---|---|
| Bloc Informations générales: Demandeur prérempli | ✅ useEffect + connectedUser from usePowerPlatform |
| Date = jour | ✅ new Date().toISOString().slice(0,10) |
| Service = saisie libre Input | ✅ replaced SearchableSelect with Input |
| Type de demande 7 cas | ✅ TYPES_DEMANDE_AUTRE unchanged (7 items) |
| Panneau CAS_USAGE_EXEMPLES, cas sélectionné mis en avant | ✅ conditional `bg-primary/10` class per selected value |
| Description du besoin (textarea libre) | ✅ new textarea, autre_description |
| Bloc Code d'origine: code article, usine origine, division origine (RO) | ✅ |
| USINES_ORIGINE filtré — négoce seulement type 4/5 | ✅ dsUsinesOrigine filter |
| Cases Besoin VL / nouveau code | ✅ unchanged |
| Bloc Produit: Désignation | ✅ |
| Usine fabrication: négoce figé types 4/5 | ✅ isTypeNegoce → ReadOnlyField "Produit négoce (2820)" |
| Usine fabrication: sinon select USINES_FABRICATION | ✅ |
| Code division fab (RO, auto) | ✅ dsDivisionFab from codeDivisionFabrication |
| Agen conditionnel (pas négoce) → 2 listes AGEN_TYPES + AGEN_CHOIX | ✅ autre_usine_fab === 'Agen' && !isTypeNegoce |
| Activité → Hiérarchie auto (RO) | ✅ dsHierarchie ReadOnlyField |
| Poids net 1 UV | ✅ |
| Type de marque → Secteur (RO) | ✅ dsSecteur ReadOnlyField |
| Bloc Champs calculés: Classe de valorisation + Centre de profit (RO) | ✅ |
| Carte "Autre" → "DS" | ✅ title="DS" |
| formTitle 'autre' → 'Demande Spécifique (DS)' | ✅ |
| DE form unchanged | ✅ only DS/Autre JSX and imports touched |
| Removed constants unreferenced (USINES_FAB, CODE_DIV_BY_USINE, ACTIVITES, TYPES_MARQUE, PRODUITS_AGEN, computeClasseValorisation, computeCentreProfit, computeSecteurActivite, isUsineRequiredType, 4 autre* memos, useMemo import) | ✅ grep confirms zero residual references |

No scope creep found.

---

## Quality: Changes needed

### CRITICAL

**`useEffect` placed before its `useState` dependencies — TDZ ReferenceError on first render**
File: `src/pages/CreerDE.jsx`, lines 390–395

```js
// line 390
useEffect(() => {
  if (formType === 'autre' && connectedUser && !formData.autre_demandeur) {
    setFormData((prev) => ({ ...prev, autre_demandeur: connectedUser }));
  }
}, [formType, connectedUser]);   // ← [formType] evaluated HERE

// ...

const [formType, setFormType] = useState(null);   // line 413 — declared AFTER
const [formData,  setFormData]  = useState({...}); // line 415
```

The dependency array `[formType, connectedUser]` is a plain JavaScript expression evaluated immediately when `useEffect(fn, deps)` is called. At that call site (line 390), `formType` is a `const` binding that is in the temporal dead zone — it is not initialized until `useState` runs at line 413. On any modern JavaScript engine (V8/SpiderMonkey/JSC) that does not transpile `const` to `var`, this throws `ReferenceError: Cannot access 'formType' before initialization` on the very first render of `CreerDE`. The build passes because Vite/esbuild bundles without rendering — the error only surfaces at runtime.

**Fix:** Move the entire `useEffect` block to after line 477 (after the `formData` state declaration). No other change needed; the closure body referencing `formData` and `setFormData` is fine once they are initialized.

Note: the spec prescribed placing this after `useToast()`, which is incorrect. The implementation followed the spec faithfully but should have caught the ordering problem.

---

### IMPORTANT

None.

---

### MINOR

**Dead field `autre_hierarchie` retained in initial formData (line 476)**

```js
autre_hierarchie: ''
```

The old form rendered `autre_hierarchie` as an editable Input. The new DS form replaced it with `dsHierarchie` (a `ReadOnlyField` derived from `computeHierarchieDS`). The field is still initialized but never rendered or read. Harmless, but it is dead state. The task-6-report acknowledges it; clean up when convenient.

---

## Accent scan — PASS

All user-facing strings in the new DS JSX carry correct accents:
- "Désignation article" ✅
- "Hiérarchie de produits" ✅
- "Demande Spécifique (DS)" ✅
- "Demande Spécifique : transfert industriel, négoce, massification…" ✅
- "Produit négoce (2820)" ✅
- "Décrire le besoin…" ✅
- "Code division d'origine" ✅
- "Secteur d'activité" ✅
- "Classe de valorisation" ✅
- "Surgelé / FF STEF / FF Autre" ✅
- CAS_USAGE_EXEMPLES: "négoce", "filiale", "Modification palettisation", "étui", "étiquette" ✅

Strings like `SecteurActivite`, `HierarchieProduitFamille` in the SAP body (line 777–778) are SAP field identifiers, not user-facing labels — no accent needed there.

---

## DE isolation — PASS

The diff touches: imports, initial formData (DS-only fields added/removed), DS computed values block, the `saveMutation.mutate` call (variable rename from `autreCodeDivision`→`dsDivisionFab` etc.), formTitle ternary (autre branch only), TypeCard (autre card only), and the `{formType === 'autre' && ...}` JSX block. The `{formType === 'de' && ...}` JSX block, all DE constants/functions, and `handleSubmit`'s DE branches are untouched. ✅

---

## Summary

**Spec ✅** — Complete and correctly wired.
**Quality: Changes needed** — 1 Critical bug (useEffect TDZ), 1 Minor (dead state field).

The Critical fix is a one-liner relocation: cut lines 390–395 and paste them after line 477. No logic change required.

---

## TDZ Fix Applied — 2026-06-26

**Status:** DONE
**Commit:** e38880a
**Build:** ✓ built in 5.16s
**Confirmation:** `usePowerPlatform`/`connectedUser`/`useEffect` block now sits at lines 471–482, after `formType` (line 401), `formData` (line 403), and `handleChange` (line 467) are all declared. Block appears exactly once.
