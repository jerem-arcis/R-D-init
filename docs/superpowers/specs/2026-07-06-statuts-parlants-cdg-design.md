# Statuts parlants + validation CDG (Power Automate) + auto-FL

Date : 2026-07-06
Branche : `dev`

## Contexte

Le statut d'un projet (`cr04e_projet`) vit dans le champ **texte libre**
`cr04e_statut_en_cours` (Dataverse), source de vérité unique lue par l'app.
Les entités `DemandeEtude`, `DeclinaisonLogistique` et `FicheLancement` sont
persistées en **localStorage** (`src/api/base44Client.js`).

Objectifs :

1. Une convention de statuts **parlante par phase** (`de_` / `dl_` / `ds_`)
   distinguant le chemin **DE → DL → FL** du chemin **DS → FL**.
2. La validation DL est **déléguée à CDG via Power Automate** : l'app n'a plus
   de bouton de décision. Dès l'**envoi vers SAP** (côté DE), le projet passe en
   **« en attente de validation CDG »** ; Power Automate écrit ensuite le statut
   final. L'app réagit au changement.
3. **Démarrer la FL automatiquement** quand le projet passe validé.
4. **Simplifier la DL** : suppression de l'étape « En attente de DL » et de
   l'import du fichier DL (la DL se fait désormais dans SAP).

Pas de compatibilité ascendante : les quelques lignes existantes en Dataverse
seront ajustées à la main. Renommage propre. Livraison **étape par étape**,
chaque étape testée et validée par l'utilisateur.

## A. Convention de statuts (table de renommage)

| Ancienne clé | Nouvelle clé | Libellé affiché | Phase / chemin |
|---|---|---|---|
| `brouillon` | `de_brouillon` | Brouillon | DE |
| `en_attente_cc` | `de_attente_cc` | En attente de code chapeau | DE |
| `en_attente_dl` | **supprimé** | — | (voir C) |
| `en_attente_validation_dl` | `dl_attente_validation_cdg` | En attente de validation CDG | DL |
| `validee` | `dl_validee` | Validée | DL → FL |
| `refusee` | `dl_refusee` | Refusée | DL |
| `en_attente_creation_code_chapeau` | `ds_attente_cc` | En attente de code chapeau | DS |
| `ds_brouillon` | `ds_brouillon` *(inchangé)* | Brouillon | DS |
| `ds_validee` | `ds_validee` *(inchangé)* | Validée | DS → FL |

Notes :
- Le statut `en_attente_dl` / « En attente de DL » **disparaît** (l'étape est
  supprimée). Le fallback de `getStatutMeta()` devient `de_brouillon`.

## B. Nouveau parcours (transitions)

```
DE (CreerDE) ── [bouton « Envoyer vers SAP »] ──► écrit  dl_attente_validation_cdg
                                                          (+ flux SAP_SEND)
                       │
                       ▼
dl_attente_validation_cdg     (page DL = simple état d'attente, AUCUN bouton)
   │  CDG décide → Power Automate écrit dans cr04e_statut_en_cours :
   ├── dl_validee   → l'app démarre la FL (voir D)
   └── dl_refusee   → DL refusée (état final, sans motif)
```

### Côté DE — `CreerDE.jsx`
- `handleSubmit` (« Envoyer vers SAP ») : le statut écrit dans `cr04e_projet`
  (`buildProjetPayload` ctx) **et** sur la DE locale passe de `en_attente_dl` à
  **`dl_attente_validation_cdg`** (lignes ~1318 et ~1353).
- `DE_READONLY_STATUTS` : remplacer les anciennes valeurs par
  `['dl_attente_validation_cdg', 'dl_validee', 'dl_refusee']`.
- Écritures DS : `brouillon`→`de_brouillon` (ligne ~1261),
  `en_attente_creation_code_chapeau`→`ds_attente_cc` (lignes ~2097/2121),
  `ds_brouillon` / `ds_validee` inchangés.

### Côté DL — `DL.jsx` (simplification)
Suppression :
- de l'**import de fichier** (zone d'upload, `parseDL`, `handleImport`, table
  des champs extraits, bouton « Changer le fichier ») ;
- de **tous les boutons** de transition (`handleEnvoyerValidation`,
  `handleValider`, `handleRefuser`) ;
- du **flux de refus manuel** (`showRefus`, `motifRefus`, textarea, et le lien
  + modale **« voir le motif »** dans la liste) ;
- de la dépendance à l'entité `DeclinaisonLogistique` dans le flux DL (plus
  créée à l'import puisqu'il n'y a plus d'import).

Ce qui reste :
- **Détail DL** (`?id=` ou `?projet_id=`) : en-tête + **bandeau de statut**
  (En attente de validation CDG / Validée / Refusée). Aucune action.
- **Liste DL** : projets en phase DL, statut lu depuis Dataverse
  (`projet.statut`), **3 onglets/compteurs** : `dl_attente_validation_cdg`,
  `dl_validee`, `dl_refusee`. `DL_PHASE_STATUTS`, `DL_TABS`, `DL_ORDRE`,
  `DL_STATUT_BADGE` mis à jour en conséquence.
- Le lien vers le détail dérive le `localId` depuis les **DE locales**
  (par `projet_id` puis code chapeau), plus depuis `declinaisons`.

## C. Câblage Power Automate

Power Automate écrit dans `cr04e_projet.cr04e_statut_en_cours` la valeur
**exacte** (minuscules, sans accent) :

| Décision CDG | Valeur écrite | Effet app |
|---|---|---|
| Validé | `dl_validee` | DL « Validée » + démarrage FL |
| Refusé | `dl_refusee` | DL « Refusée » (final, sans motif) |

## D. Auto-création de la FL sur `dl_validee`

La FL est en localStorage → pas de trigger serveur. Mécanisme : dans la **liste
DL** (`DLList`, la page réellement consultée quand le statut bascule), un
`useEffect` qui, au chargement, parcourt les lignes et pour chaque projet à
`dl_validee` **avec une DE locale** et **sans FL déjà liée**, crée la FL :

- `FicheLancement.create({ code_article: de.code_chapeau, code_chapeau,
  libelle_article: designation, demande_etude_id: de.id,
  declinaison_logistique_id: null, etat_global: 'en_attente',
  etape_courante: 1 })`
- puis `DemandeEtude.update(de.id, { statut: 'dl_validee', date_validation,
  fiche_lancement_id })`.

**Idempotence (obligatoire)** : ne créer que si la DE locale n'a pas déjà de
`fiche_lancement_id` **et** qu'aucune FL n'existe pour ce `demande_etude_id`
(`FicheLancement.filter`). Garde anti-double-exécution (effet React). Ne jamais
écraser une FL existante.

**Limite assumée** : ne se déclenche que sur un poste disposant de la DE en
local, à l'ouverture de la liste DL. Cohérent avec l'existant (FL locale).

## E. Points d'impact (fichiers)

- `src/lib/deStatus.js` — clés + libellés `STATUTS` (retrait `en_attente_dl`,
  renommages), fallback `getStatutMeta`, `codeChapeauAlert` (`en_attente_cc`
  → `de_attente_cc`).
- `src/api/projet.js` — `PROJET_STATUT` (retrait `en_attente_dl`, renommages),
  défauts `toFormData` / `toListShape`.
- `src/api/ds.js` — `DS_STATUTS` → `['ds_brouillon','ds_attente_cc','ds_validee']`.
- `src/pages/DL.jsx` — simplification majeure (voir B) : retrait import +
  boutons + motif + `DeclinaisonLogistique`, maj badges/onglets/compteurs,
  ajout auto-FL dans la liste.
- `src/pages/TraiterDE.jsx` — checks `en_attente_dl` / `en_attente_validation_dl`
  / `validee` / `refusee` → nouvelles clés (et retrait de `en_attente_dl`).
- `src/pages/DemandesEtude.jsx` — `isDEValidated`, checks CC, `isValideeCount`,
  `DE_TABS`, logique de filtre, compteur refusées.
- `src/pages/CreerDE.jsx` — voir B (statut envoi SAP + DS + readonly).
- `src/pages/Dashboard.jsx` — clés `STAT_CARDS` (retrait `en_attente_dl`),
  défaut `de_brouillon`, filtre « actif » (exclure `dl_refusee`).
- Tests : `deStatus.test.js`, `projet.test.js`, `ds.test.js` (attentes de clés).

Devenus orphelins (usage retiré, fichiers laissés en place, suppression possible
en suivi) : `src/lib/parseDL.js`, `src/lib/xlsxLite.js`, `parseDL.test.js`, et
l'entité `DeclinaisonLogistique` dans `base44Client.js`.

## Stratégie de test

Renommage + simplification mécaniques → chaque fichier vérifiable isolément :
`npm test` (Vitest) après chaque lot + vérification manuelle des écrans
DE / DL / Dashboard. Livraison **étape par étape** validée par l'utilisateur.

## Hors périmètre (YAGNI)

- `ds_refusee` (aucun flux de refus DS) — non ajouté.
- Migration automatique des données Dataverse (faite à la main).
- Suppression physique des libs orphelines `parseDL` / `xlsxLite` et de
  l'entité `DeclinaisonLogistique` (nettoyage possible en suivi).
- Statuts FL dans `cr04e_statut_en_cours` (la FL a ses propres champs).
