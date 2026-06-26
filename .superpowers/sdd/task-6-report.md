# Task 6 Report — Formulaire DS (CreerDE.jsx)

**Branch:** feat/ds-commerce-marketing  
**Date:** 2026-06-26  
**Build:** ✓ built in 5.45s  

---

## Constants & memos REMOVED (no longer referenced after task)

| Identifier | Type | Reason removed |
|---|---|---|
| `USINES_FAB` | `const` array | Only used in old Autre JSX (usine fab select). Replaced by `USINES_FABRICATION` from dsRules. |
| `CODE_DIV_BY_USINE` | `const` object | Only used in old `autreCodeDivision` memo and old Autre JSX. Replaced by `codeDivisionOrigine()`/`codeDivisionFabrication()` from dsRules. |
| `ACTIVITES` | `const` array | Only used in old Autre JSX (activité select). Replaced by `DS_ACTIVITES` alias from dsRules. |
| `TYPES_MARQUE` | `const` array | Only used in old Autre JSX (type marque select). Replaced by `DS_TYPES_MARQUE` alias from dsRules. |
| `PRODUITS_AGEN` | `const` array | Only used in old Autre JSX (produit Agen select). Replaced by `AGEN_CHOIX` from dsRules. |
| `computeClasseValorisation` | helper fn | Only used by `autreClasseVal` memo. Replaced by `computeClasseValoDS` from dsRules. |
| `computeCentreProfit` | helper fn | Only used by `autreCentreProfit` memo. Replaced by `computeCentreProfitDS` from dsRules. |
| `computeSecteurActivite` | helper fn | Only used by `autreSecteur` memo. Replaced by `computeSecteurDS` from dsRules. |
| `isUsineRequiredType` | helper fn | Only used in old Autre JSX and `autreCodeDivision` memo. Logic replaced by `isTypeNegoce` + direct select per field. |
| `autreCodeDivision` | useMemo | Replaced by `dsDivisionFab` (plain const). |
| `autreClasseVal` | useMemo | Replaced by `dsClasseValo` (plain const). |
| `autreCentreProfit` | useMemo | Replaced by `dsCentreProfit` (plain const). |
| `autreSecteur` | useMemo | Replaced by `dsSecteur` (plain const). |
| `useMemo` (React import) | import | Was only used by the 4 removed Autre memos; removed from React import. |

---

## Constants & variables KEPT

| Identifier | Type | Reason kept |
|---|---|---|
| `TYPES_DEMANDE_AUTRE` | `const` array | Still used in new DS form (Type de demande select). |
| `TYPES_DEMANDE_DE` | `const` array | Used by DE form. |
| `autre_hierarchie` | formData field | Kept in initial state (harmless; no longer rendered). |
| All DE-related constants/functions | various | Not touched — DE form unchanged. |

---

## Fields added to formData initial state

- `autre_usine_origine: ''` — usine d'origine (code division origine auto)
- `autre_agen_type: ''` — type Agen (Surgelé / FF STEF / FF Autre)
- `autre_agen_choix: ''` — choix Agen (Assortiments / Pains surprises / Plaques)
- `autre_description: ''` — description du besoin (textarea libre)

## Fields removed from formData initial state

- `autre_usine_fabrication_libre` — was a free-text field for fabrication usine; replaced by `autre_usine_fab` select
- `autre_produit_agen` — replaced by `autre_agen_choix` (same data, cleaner name)

---

## Accent verification

Strings verified intact in new JSX:
- "Désignation article" ✓
- "Hiérarchie de produits" ✓  
- "Demande Spécifique (DS)" ✓
- "Demande Spécifique : transfert industriel, négoce, massification, modifications mineures…" ✓
- "Produit négoce (2820)" ✓
- "Décrire le besoin…" ✓
- "Sélectionner une usine" ✓
- "Prérempli depuis l'utilisateur connecté" ✓
- "Code division d'origine" ✓
- "Secteur d'activité" ✓
- "Classe de valorisation" ✓
- "Surgelé / FF STEF / FF Autre" ✓
- "Assortiments / Pains / Plaques" ✓
- CAS_USAGE_EXEMPLES titles: "Pâtisseries" not in titles (activités), but "négoce", "filiale", "Modification palettisation" — all accents ✓

---

## Summary of JSX changes

- Selection screen: TypeCard `title="Autre"` → `title="DS"`, subtitle updated
- Form title: `'Autre demande'` → `'Demande Spécifique (DS)'`
- 4 FormSections replacing old 4 sections:
  1. **Informations générales** — Demandeur (prefilled), Date, Service (free text), Type de demande + CAS_USAGE_EXEMPLES panel + Description textarea
  2. **Code d'origine** — Code article, Usine origine (dsUsinesOrigine filtered), Code division origine (ReadOnly), VL/nouveau-code checkboxes
  3. **Produit** — Désignation, Usine fab (select or locked négoce), Code division (ReadOnly), Agen type+choix (conditional), Activité, Hiérarchie (ReadOnly), Poids net, Type de marque, Secteur (ReadOnly)
  4. **Champs calculés (SAP)** — Classe de valorisation, Centre de profit (both ReadOnly)

- DS computations now plain `const` (not `useMemo`) referencing `dsRules` exports
- `handleSubmit` references updated to new DS variable names (`dsDivisionFab`, `dsClasseValo`, `dsCentreProfit`, `dsSecteur`) — build passes, Task 7 handlers NOT implemented per spec
