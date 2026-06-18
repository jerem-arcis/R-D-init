# Cycle de vie projet : DE → code chapeau → DL

**Date :** 2026-06-18
**Statut :** Design validé

## Objectif

Restructurer le cycle de vie d'un projet (qui démarre par une **Demande d'Étude / DE**)
en une suite de statuts pilotés par l'ADV, jusqu'à la **Déclinaison Logistique (DL)**.
On introduit un nouveau pipeline de statuts, un système d'alerte ADV (J‑0 / J+6) en
attente du code chapeau, et une nouvelle page **DL** alimentée par un import de fichier
(Excel simulé).

Cette itération couvre **toute la mécanique DE → code chapeau → DL → validé/refusé**.
Elle **ne couvre pas** la suite (création de la Fiche de Lancement à la validation d'une DL).

## Périmètre

### Inclus
- Pipeline de statuts centralisé et appliqué à toute l'app DE.
- Écran **CreerDE** : retrait carte DE/DL, retrait « Pré-remplissage assisté »,
  remplacement de l'« Aperçu SAP » rétro par une **vue synthèse** style Synthèse FL,
  conservation de « Envoyer vers SAP » et de la récupération beCPG.
- Alertes ADV **J‑0 / J+6** sur le statut « En attente de code chapeau ».
- **TraiterDE** : étape « code chapeau » via bouton simulé.
- Nouvelle entité **`DeclinaisonLogistique`** + nouvelle page **DL** avec import + décision.
- Liste **DemandesEtude** : onglets/filtres, cartes stats et routage alignés sur le pipeline.

### Hors périmètre (étapes ultérieures, à ne PAS implémenter maintenant)
- Création / génération d'une **Fiche de Lancement (FL)** lorsqu'une DL est validée.
  À la validation d'une DL, le projet passe simplement en `validee` et s'arrête là.
- Remédiation de la dette de sécurité sur les URLs de flux (voir spec beCPG du 2026-06-11).
- Toute évolution du type de demande **`autre`** (laissé tel quel).

## Pipeline de statuts

Source unique de vérité : nouveau fichier **`src/lib/deStatus.js`** exportant la
définition de chaque statut (clé, libellé, ton/couleur, ordre, icône) + helpers.

| Clé | Libellé | Signification |
|---|---|---|
| `brouillon` | Brouillon | DE en cours de saisie, pas encore soumise |
| `en_attente_code_chapeau` | En attente de code chapeau | DE soumise/envoyée SAP, on attend le code chapeau |
| `en_attente_dl` | En attente de DL | Code chapeau reçu, DL à constituer |
| `en_attente_validation_dl` | En attente de validation DL | Fichier DL importé, en attente de décision |
| `validee` | Validée | Projet validé (fin de l'itération courante) |
| `refusee` | Refusée | Projet refusé |

Remarques de migration :
- Les anciens statuts (`a_traiter_adv`) sont remplacés. Le helper de badge dans
  `DemandesEtude` et `TraiterDE` lit désormais `deStatus.js`.
- Aucune migration de données réelle requise (mock localStorage ; données de démo
  re-seedées). Le seed (`mockSeed.js`) sera mis à jour pour produire des DE réparties
  sur les nouveaux statuts.

## Écran CreerDE

1. **Carte DE/DL retirée** de l'écran de sélection : il reste **DE** et **Autre**.
   Le code lié au `formType === 'de_dl'` est supprimé (le type `de` couvre le besoin).
2. **Bandeau « Pré-remplissage assisté » retiré** : suppression du bloc d'import de
   fichier, des constantes `PREFILL_PRESETS_DE` / `PREFILL_PRESETS_AUTRE`, de
   `handlePrefillFromFile`, des états `isPrefilling` / `prefilledFrom` et du `sleep` associé.
3. **Aperçu SAP → vue synthèse** : le composant rétro (`SAP_VIEWS`, `SapField`,
   `SapPreviewDialog`, look MM03) est remplacé par un nouveau **`SapSynthesisDialog`**
   inspiré de `FLSynthesisSection` :
   - En-tête en dégradé (titre « Synthèse SAP — aperçu », mention lecture seule).
   - Sous-cartes regroupant les champs déjà calculés : **Données de base**
     (groupe article, poids brut/net, ZUG, groupe autorisation), **Ventes**
     (client, division, secteur d'activité), **Comptabilité** (division, classe de
     valorisation), **Calcul du coût** (centre de profit, groupe frais généraux).
   - Réutilise les sous-composants `Field` / `SubSection` au style Synthèse FL
     (pas le rendu rétro). Aucune écriture réelle dans SAP (aperçu).
4. **« Envoyer vers SAP » conservé** (flux Power Automate existant `SAP_FLOW_URL`).
5. **Soumission** : le bouton de soumission crée la DE en statut
   **`en_attente_code_chapeau`** et horodate **`date_demande_code_chapeau`**
   (= maintenant). « Enregistrer brouillon » reste en `brouillon`.
   La récupération beCPG par CodePJ est **inchangée**.

## Alertes ADV J‑0 / J+6

Helper pur dans `src/lib/deStatus.js` (ou un module dédié `codeChapeauAlert.js`) :

```
codeChapeauAlert(de, today) -> { level: 'none'|'j0'|'j6', joursEcoules } 
```

- Calculé uniquement pour les DE en statut `en_attente_code_chapeau`.
- Référence : **`date_demande_code_chapeau`** (date de la demande du code chapeau).
- `joursEcoules = today - date_demande_code_chapeau` (en jours pleins).
- **J‑0** : alerte le jour même de la demande (`joursEcoules >= 0`).
- **J+6** : alerte renforcée si `joursEcoules >= 6` et toujours en attente.
- Fonctions de présentation pures et testées (Vitest), à l'image de `launchAlert.js`.

**Affichage** : dans la liste **DemandesEtude** — badge/encart sur les lignes
concernées + un compteur d'alertes en tête de liste. *(Pas d'ajout au Dashboard.)*

## TraiterDE — étape code chapeau

Au statut `en_attente_code_chapeau`, le panneau de décision actuel (sélecteur usine +
code EAN + « Valider » / « Valider + créer FL ») est **remplacé** par :

- Un encart « Code chapeau » avec un **bouton simulé « Code chapeau reçu »**.
- Au clic : génération d'un **code chapeau simulé** (format proche de l'existant,
  ex. `CC-<aléatoire>` ou dérivé de la désignation), enregistré sur la DE
  (`code_chapeau`, `date_code_chapeau`), statut → **`en_attente_dl`**.
- En lecture seule pour les statuts terminaux.

L'affichage des informations de la DE (sections lecture seule) est conservé.
L'ancienne logique EAN/`CodeEAN` et la création de FL de cette étape sont retirées
de ce parcours (la FL est hors périmètre ; l'entité `CodeEAN` n'est plus utilisée ici).

## Entité DeclinaisonLogistique + page DL

### Entité `DeclinaisonLogistique`
Créée via le client mock (`base44.entities`), persistée en localStorage comme les autres.
Champs :
- `demande_etude_id` (lien vers la DE)
- `statut` (`en_attente_validation_dl` après import, puis `validee` / `refusee`)
- `imported_file` (nom du fichier importé), `date_import`
- Champs « type Synthèse FL » préremplis par l'import (contrôle de gestion, supply
  chain, gestion du besoin, industriel, commerce) — sous-ensemble pertinent calqué
  sur les champs de `FLSynthesisSection`.
- `motif_refus`, `date_validation` / `date_refus`.

### Page `DL`
Route `DL?id=<deId>` (ajout dans `pages.config`). Accessible depuis la liste
DemandesEtude quand le projet est en `en_attente_dl` ou `en_attente_validation_dl`.

Un **seul écran, deux actions** :
1. **Importer le fichier** (input fichier, Excel simulé) : préremplit les champs DL
   « type Synthèse FL » (presets de démonstration), crée/maj l'enregistrement
   `DeclinaisonLogistique`, affiche la **vue synthèse** (réutilise le style Synthèse FL),
   passe la DE + la DL en **`en_attente_validation_dl`**.
2. **Valider** / **Refuser** (disponibles une fois importé) :
   - Valider → DE + DL en `validee`, horodatage. *(Pas de création FL — hors périmètre.)*
   - Refuser → saisie d'un motif → DE + DL en `refusee`.

## Liste DemandesEtude

- **Onglets de filtre** et **cartes statistiques** reconstruits depuis `deStatus.js`
  (un onglet par statut pertinent + « Toutes »).
- **Badge de statut** via le helper centralisé.
- **Encart/compteur d'alertes** code chapeau (J‑0 / J+6).
- **Routage de la ligne** selon le statut :
  - `en_attente_code_chapeau` → **TraiterDE** (bouton code chapeau)
  - `en_attente_dl` / `en_attente_validation_dl` → **DL**
  - statuts terminaux → page détail en lecture seule (TraiterDE ou DL selon l'avancement).

## Tests

- `deStatus.js` : libellés/ordre, et `codeChapeauAlert` (cas J‑0, J+6, hors statut,
  date absente) — tests purs Vitest comme `launchAlert.test`/`becpgMapping.test`.
- Pas de test d'intégration UI requis pour cette itération (cohérent avec l'existant).

## Fichiers impactés (indicatif)

- **Nouveaux** : `src/lib/deStatus.js`, `src/lib/deStatus.test.js`,
  `src/pages/DL.jsx`, composant `SapSynthesisDialog` (dans `CreerDE.jsx` ou extrait).
- **Modifiés** : `src/pages/CreerDE.jsx`, `src/pages/TraiterDE.jsx`,
  `src/pages/DemandesEtude.jsx`, `src/api/entities.js`, `src/api/base44Client.js`
  (entité `DeclinaisonLogistique`), `src/lib/mockSeed.js`, `src/pages.config` (route DL).
