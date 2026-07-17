# Spec — Page d'aperçu « Fiche complète FL → SAP »

Date : 2026-07-17 · Statut : validé (design approuvé)

## Contexte

La Fiche de Lancement (FL) actuelle (`src/pages/FicheDetailV2.jsx`) couvre ~60 champs
métier saisis par 4 services (SC/GB/IND/COM). Le mapping SAP réel (fichier
`Mapping_champs_SAP (3).xlsx`, onglet « Mapping FL ») compte **151 champs**, dont
la majorité ne sont **pas** des saisies : constantes, règles conditionnelles,
calculs. Voir `docs/mapping-fl.md` et `docs/mapping-fl.html`.

Aucune règle FL n'est encore codée. On dispose de 6 fonctions DE
(`src/lib/deRules.js`) et 6 DS (`src/lib/dsRules.js`) potentiellement réutilisables.

## But

Une **nouvelle page in-app en lecture seule** qui :
1. montre les 151 champs groupés par vue SAP (aperçu de la FL complète, actuels + nouveaux) ;
2. étiquette chaque champ par **nature** (saisie / constante / règle / calcul) ;
3. affiche le **statut de règle** : « règle qu'on a » (codée/réutilisable) vs « règle qu'il nous faut » (à coder).

Double usage : aperçu des nouveaux champs **et** état des lieux visuel des règles.

## Non-objectifs (YAGNI)

- Pas d'édition, pas d'enregistrement.
- Pas d'envoi SAP, pas de visa.
- **Aucune** modification de l'entité `FicheLancement` ni de `ficheSchema.js`.
- Pas de branchement sur une vraie fiche (page auto-suffisante).

## Architecture

### 1. Données — `src/lib/flMapping.js`

Module généré depuis le xlsx (script one-shot, non commité). Exporte :

- `FL_FIELDS` : tableau des 151 champs. Chaque entrée :
  ```
  { section, cellule, lib, sapField, type, valeur, metier, rule, cat }
  ```
  `cat ∈ { 'SAISIE', 'CONSTANTE', 'REGLE', 'CALCUL', 'WORKFLOW' }`.
- `RULE_STATUS` : map `libellé de règle → 'coded' | 'reusable' | 'todo'`.
  - `coded` : une fonction FL existe (aucune au départ).
  - `reusable` : équivalent DE/DS existe (classe valo, secteur, centre profit…).
  - `todo` : à écrire.
- Helpers : `groupBySection(fields)`, `counts(fields)`, `ruleCounts(fields)`.

La classification `cat` réutilise exactement la logique de `docs/mapping-fl.md`
(WORKFLOW → CALCUL → CONSTANTE(« toujours ») → REGLE(« Si… → ») → SAISIE).

### 2. Page — `src/pages/FicheComplete.jsx`

Structure (stylée comme `FicheDetailV2` : en-tête `bg-card`, sections
`bg-white rounded-xl border`, `max-w-6xl`) :

- **En-tête** : titre + sous-titre + retour Accueil.
- **Bandeau compteurs** : 1 carte par nature (cliquable = filtre) + carte « Règles : X à coder / Y réutilisables ».
- **Barre de filtres** (sticky) : recherche plein-texte, select vue SAP, toggle « à faire seulement ».
- **Sections repliables par vue SAP** : chaque champ = 1 ligne
  `libellé · code SAP (mono) · badge nature · badge statut · valeur/règle`.
- Lecture seule, aucune mutation.

Composant local `FieldRow` + `SectionGroup`. Badges = petits `<span>` Tailwind
(couleurs sémantiques par nature, cohérentes avec `docs/mapping-fl.html`).

### 3. Routing & navigation

- Ajouter la page au registre de routes (`src/pages.config.js` + routeur).
- Lien d'accès : une entrée depuis l'Accueil (et/ou `ViewSwitch`).

## Flux de données

`flMapping.js` (statique) → `FicheComplete` charge `FL_FIELDS`, applique
filtres locaux (état React : `cat`, `section`, `query`, `todoOnly`) → rend les
sections. Aucun appel réseau, aucun état serveur.

## Gestion d'erreurs

Surface réduite (données statiques). Cas vides : message « Aucun champ ne
correspond à ces filtres ». Pas d'états de chargement/erreur réseau.

## Tests

- Test unitaire `flMapping.test.js` : `FL_FIELDS.length === 151`, chaque `cat`
  valide, `counts()` cohérent (ex. total = somme des natures), `ruleCounts()`.
- Pas de test e2e (page de lecture, faible risque).

## Découpage

1. Générer `src/lib/flMapping.js` depuis le xlsx.
2. Test `flMapping.test.js`.
3. `FicheComplete.jsx` (page).
4. Câblage route + lien nav.
5. Vérif (lint + tests + build).
