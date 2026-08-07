# Deep-linking généralisé depuis les mails — Design

**Date :** 2026-08-07
**Statut :** validé

## Problème

Des mails (envoyés par Power Automate) contiennent des liens qui doivent ouvrir
l'app Code App Power Apps **directement au bon endroit**, en un clic :

1. **Lien DE** — pour un projet « en attente de code chapeau », ouvrir le
   formulaire DE (`CreerDE`) afin de compléter et d'envoyer vers SAP.
2. **Lien FL** — ouvrir la Fiche de Lancement (`FicheDetail`) et **scroller
   directement sur une section précise** (industriel, commerce…).

L'existant (`src/lib/DeepLink.jsx`) ne gère que `projet_id` (→ `CreerDE`) et
`code_chapeau` (→ board `DemandesEtude`), par GUID. Il faut **généraliser** :
identifier par **code PJ** (`cr04e_codeprojet`, humain) et supporter la section FL.

## Contraintes techniques

- **Code App** (SDK `@microsoft/power-apps/app`), routing **HashRouter**.
- Le player Power Apps **ne propage pas** la query string jusqu'à l'iframe : les
  paramètres se lisent via `getContext().app.queryParams` (asynchrone). Repli
  `window.location.search` en dev local. → un seul type de paramètre exploitable :
  des **query params** (pas de segment de path).
- Une fiche = une ligne `cr04e_projet`. Le **code PJ** vit dans `cr04e_codeprojet`
  (= `code_etude_rd` côté FL). `FicheDetail` s'ouvre par `?id=<cr04e_projetid>`,
  `CreerDE` par `?projet_id=<cr04e_projetid>`.
- Le SDK généré (`Cr04e_projetsService.getAll`) accepte `filter`/`select`/`top`
  (`IGetAllOptions`) → résolution code PJ → GUID possible par requête OData.

## Contrat des liens (émis par Power Automate)

Deux liens, tous deux par **code PJ**, distingués par `vue` :

| Usage | Query params | Destination interne |
|---|---|---|
| Lien DE | `?code_pj=PJ4987&vue=de` | `/CreerDE?projet_id=<guid>` |
| Lien FL | `?code_pj=PJ4987&vue=fl&section=industriel` | `/FicheDetail?id=<guid>&section=<section>` |

- `section` ∈ `supply_chain` \| `industriel` \| `commerce` \| `synthese`
  (optionnel ; absent ou inconnu = haut de fiche).
- **Rétro-compatibilité :** les params existants `projet_id` (→ `CreerDE`) et
  `code_chapeau` (→ `DemandesEtude`) restent supportés en repli, pour ne pas
  casser les mails / flux déjà en circulation.

Décision : discriminateur `vue=de|fl` (lisible, une seule résolution) plutôt que
des noms de params distincts (`de_code_pj` / `fl_code_pj`).

## Architecture

`DeepLink.jsx` reste le **seul** point d'entrée. On étend sa table `ROUTES` pour
supporter une **étape de résolution asynchrone** : un route peut déclarer un
`resolve(value) → guid`. Le flux :

```
queryParams → 1er param reconnu → (resolve code PJ → GUID) → navigate(URL page existante)
```

Les pages `CreerDE` / `FicheDetail` **ne changent pas** leur contrat interne
(toujours `projet_id` / `id`). Toute la nouveauté est concentrée dans `DeepLink`
+ un helper API + les ancres de section.

### Unités

1. **`src/lib/deepLinkRoutes.js`** (pur, testé) — table des routes et logique de
   mapping `(param, value, allParams) → { navigateTo, needsResolve }`. Aucune I/O.
   Validation de `section` contre la liste blanche.
2. **`src/api/fiche.js` → `getProjetIdByCodePJ(code)`** — requête
   `Cr04e_projetsService.getAll({ filter: "cr04e_codeprojet eq '<code>'", select:['cr04e_projetid'], top:1 })`,
   renvoie le GUID ou `null`. Échappe les apostrophes du code.
3. **`src/lib/DeepLink.jsx`** — orchestration : lecture params (SDK + repli URL),
   résolution async, garde-fou anti-refresh (sessionStorage par valeur, existant),
   navigation, gestion d'erreur.
4. **`src/pages/FicheDetail.jsx`** — ancres `id` sur les 4 sections + scroll vers
   `?section=` au chargement de la fiche.

## Section FL dans FicheDetail

- Chaque section reçoit un conteneur avec `id` stable : `section-supply_chain`,
  `section-industriel`, `section-commerce`, `section-synthese`.
- `useEffect` déclenché quand `fiche` est chargée **et** `section` présente :
  `document.getElementById(...)?.scrollIntoView({ behavior:'smooth', block:'start' })`
  + surlignage transitoire (classe retirée après ~2 s). Section inconnue = ignorée.
- Le header étant `sticky`, le scroll `block:'start'` doit tenir compte de sa
  hauteur (léger `scroll-margin-top` sur les conteneurs de section).

## Gestion d'erreur

- **Code PJ introuvable** (`getProjetIdByCodePJ` → `null`) → toast
  « Code PJ « PJ4987 » introuvable » + repli sur `/Accueil` (pas d'écran blanc).
- **Échec réseau de résolution** → `console.error` + toast + on reste sur place
  (pas de redirection).
- **Section inconnue** → ignorée, fiche ouverte en haut.

## Environnements / Power Automate

- **App React : aucune dépendance** à l'environnement — elle ne lit que des params.
  Le même build tourne en dev / recette / prod.
- **Base du lien** (`https://apps.powerapps.com/play/e/{env}/a/{app}`) **change**
  par environnement (`environmentId` + `appId` distincts) → stockée dans une
  **variable d'environnement Texte** de la solution, consommée par le flux :
  `@{variables('BaseAppUrl')}?code_pj=…&vue=fl&section=…`. Recommandé (non bloquant
  pour l'app) pour un ALM 3 environnements propre.

## Tests

- `src/lib/deepLinkRoutes.test.js` : mapping param→cible pour `code_pj+vue=de`,
  `code_pj+vue=fl+section`, repli `projet_id`/`code_chapeau`, section invalide
  ignorée, param inconnu → aucune route.
- Pas de test d'I/O réseau (résolution Dataverse).

## Hors périmètre (YAGNI)

- Pas de segment de path `/FicheDetail/industriel` (le player ne l'émet pas).
- Pas de résolution multi-résultats : le code PJ est supposé unique (`top:1`).
- Pas de modification du flux Power Automate dans ce repo (vit dans la solution).
