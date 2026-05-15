# Dashboard Alerting — Design

**Date** : 2026-05-15
**Statut** : approuvé

## Contexte

L'app Boncolac gère des Fiches de Lancement (FL) produit qui doivent cumuler 7 visas successifs (CG → SC → GB → IND → COM → SAP → Export) avant la **date de lancement souhaitée** portée par la Demande d'Étude (DE) parente. Aujourd'hui rien ne signale au pilote qu'une FL approche de sa cible avec des visas manquants. Cette page Dashboard fournit cette vue de pilotage.

## Périmètre (V1)

- Une seule page `/Dashboard`, accessible en tête de la nav.
- Logique d'alerte **simple** : on regarde `date_lancement` (DE liée) et le nombre de visas validés de la FL. Pas de délais cibles par étape (V2).
- Lecture seule. Pas de filtres, pas d'export, pas de notifs.

## Source de données

- `FicheLancement.list()` → toutes les FL
- `DemandeEtude.list()` → toutes les DE
- Jointure client sur `FicheLancement.demande_etude_id = DemandeEtude.id`
- FL sans DE liée ou DE sans `date_lancement` → exclues des alertes, comptées séparément.

## Bucketing

```
joursAvant = floor((date_lancement - aujourd'hui) / jour)
visasValides < 7 :
  joursAvant < 0   → "En retard"      (rouge)
  0 ≤ jA ≤ 3       → "Critique"        (rouge-orange)
  3 < jA ≤ 7       → "Imminent"       (orange)
  7 < jA ≤ 14      → "Cette semaine+" (jaune)
  jA > 14          → "À venir"        (neutre)
visasValides = 7   → "Lancée"         (vert, masquée des alertes)
```

Une fiche est **critique** si bucket ∈ { En retard, Critique, Imminent }.

## Layout (3 zones verticales)

### 1. Hero "Radar du jour"
Bandeau plein largeur, dégradé violet → ambre cohérent avec le thème glossy de l'app.
- Gauche : compteur géant (chiffre XXL) du nombre de fiches critiques + sous-titre.
- Droite : 3 mini-stats inline (`En retard: N` · `J-3: N` · `J-7: N`).
- Si zéro critique → message « Tout est sous contrôle » + check vert.

### 2. Cartes critiques (top 3)
Grille `grid-cols-1 md:grid-cols-3`, jusqu'à 3 fiches les plus urgentes (tri : retard d'abord, puis joursAvant croissant). Chaque carte :
- Bandeau de couleur selon bucket (rouge / orange / jaune).
- Badge `J-2`, `J+1 retard`, etc. en gros.
- Code article + libellé.
- Anneau de progression `N/7 visas`.
- Nom de l'étape bloquante (premier visa non posé).
- Bouton « Ouvrir la fiche » → lien vers `FicheDetail?id=…`.
- Animation d'entrée stagger fade-in.

S'il y a moins de 3 fiches critiques, on complète avec les fiches "Imminent" suivantes. S'il n'y en a aucune, la zone est masquée (le hero "tout sous contrôle" suffit).

### 3. Timeline horizontale
Axe horizontal avec marqueurs `J-14 · J-7 · J-3 · J-1 · AUJOURD'HUI · J+1 · J+7 · J+14`.
- Chaque FL non-terminée avec `date_lancement` connue = pastille positionnée sur l'axe.
- Couleur de la pastille = couleur de bucket.
- Survol → tooltip avec code article, libellé, avancement, date.
- Clic → ouvre la fiche.
- Fiches au-delà de J+14 → groupées dans un petit cluster "+ N autres" à droite.
- Fiches au-delà de J-14 (très en retard) → cluster équivalent à gauche.

### Footer info
Petit compteur discret : « N fiches non planifiées (sans date de lancement) ».

## Fichiers à créer

- `src/pages/Dashboard.jsx` — page principale, fetch + assemblage
- `src/components/dashboard/RadarHero.jsx`
- `src/components/dashboard/CriticalCard.jsx`
- `src/components/dashboard/LaunchTimeline.jsx`
- `src/lib/launchAlert.js` — helpers purs : `computeAlertStatus(fiche, de)`, `BUCKET_CONFIG`, tri par urgence

## Fichiers à modifier

- `src/Layout.jsx` — ajouter "Tableau de bord" en première entrée du `NAV_ITEMS`
- Router (à identifier dans `App.jsx` ou pages index) — déclarer la route `Dashboard`

## Hors scope (V2+)

- Délais cibles par visa avec alerte par étape
- Filtres par métier / par site
- Notifications email / in-app
- Export PDF / Excel
- Drill-down par bucket (cliquer "En retard" → liste filtrée)
