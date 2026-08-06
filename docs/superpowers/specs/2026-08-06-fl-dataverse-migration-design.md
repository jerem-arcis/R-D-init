# FL sur Dataverse — migration du stockage et mapping

Date : 2026-08-06
Statut : validé (brainstorming) — à décliner en plan d'implémentation

## Contexte

Aujourd'hui la Fiche de Lancement (FL) vit dans le **localStorage** via le mock
`base44.entities.FicheLancement`. La table Dataverse `cr04e_projet` a été enrichie
(`pac code add-data-source`) pour porter la majorité des champs FL, plus 3 visas
booléens et les lookups centre de profit / hiérarchie. Deux tables filles ont été
ajoutées :

- `new_libellepays` (lookup `new_IDProjet` → projet) : tableau libellé par pays ;
- `cr04e_unitofmeasure` (lookup `cr04e_IDprojet` → projet) : tableau emballages / GTIN.

**Décision structurante : la ligne `cr04e_projet` EST la FL.** Le projet continue
de vivre en phase DE → DL → FL (même enregistrement). La FL lit et écrit
directement dans Dataverse ; on abandonne le localStorage pour la FL. Les données
localStorage actuelles sont du démo jetable → **aucune migration de données**.

## Objectif

Brancher la FL (2 vues + liste + PDF) sur `cr04e_projet` et ses 2 tables filles,
avec une couche de mapping isolée et testable, sans changer l'UI ni le rendu PDF.

## Découpage en phases

1. **Phase 1 — Parent (`cr04e_projet`)** : couche de mapping, lecture/écriture des
   2 vues, liste FL. Débloque le reste.
2. **Phase 2 — Libellé par pays (`new_libellepays`)** : sync ligne par ligne.
3. **Phase 3 — Emballages / GTIN (`cr04e_unitofmeasure`)** : sync ligne par ligne.

Chaque table fille a son module (`listForProjet` + `syncForProjet`), appelé à la
sauvegarde de la FL **après** l'écriture du parent.

---

## Phase 1 — Parent

### Nouveau module `src/api/fiche.js`

Miroir de `src/api/projet.js`. Fonctions pures + accès service :

- `toFicheShape(projet)` : ligne `cr04e_projet` → objet FL (mêmes noms de champs
  qu'aujourd'hui, pour que l'UI et le PDF restent inchangés). Les lookups sont lus
  via le **libellé formaté** (`@OData…FormattedValue`), déjà éprouvé.
- `buildFichePayload(patch, { sapOptions })` : objet FL partiel → payload
  `cr04e_projet` (seuls les champs présents dans `patch`). Les lookups (centre de
  profit, hiérarchie) sont **poussés par leur code**, résolu en `@odata.bind` via
  `lookupBind` (comme `buildProjetPayload`).
- `getFicheById(id)` : lit le projet + `toFicheShape`.
- `updateFiche(id, patch, ctx)` : `buildFichePayload` + `Cr04e_projetsService.update`.
- `listFiches()` : projets en phase FL → liste (voir « Liste FL »).

### Mapping FL ↔ `cr04e_projet` (parent)

| Champ FL | Colonne `cr04e_projet` | Type |
|---|---|---|
| `code_article`, `code_chapeau` | `cr04e_codechapeau` | texte |
| `libelle_article` | `cr04e_nomduproduitdesignation` | texte |
| `code_etude_rd` | `cr04e_codeprojet` | texte |
| `date_demande` | `cr04e_datedelademande` | date |
| `date_envoi_ficher` | `cr04e_dateenvoidelafiche` | date |
| `date_limite_creation_mm01` | `cr04e_datelimitedecreationsouhaitee` | date |
| `libelle_long_40` | `cr04e_libellelong40caracteres` | texte |
| `libelle_caisse` | `cr04e_libellearticlecaisse` | texte |
| `marque` | `cr04e_marque` | texte |
| `secteur_activite` | `cr04e_secteurdactivite` | texte |
| `nomenclature_douaniere` | `cr04e_nomenclaturedouaniere` | texte |
| `origine_fabrication` | `cr04e_originedefabrication` | texte |
| `libelle_etiquette_colis` | `cr04e_libelleproduitsuretiquettecolis` | texte |
| `masque_etiquette_colis` | `cr04e_masquedeletiquettecolis` | texte |
| `designation_client_colis` | `cr04e_designationclientsurcolis` | texte |
| `format_date_etiquette_colis` | `cr04e_formatdateetiquettecolis` | texte |
| `format_dluo_etiquette_colis` | `cr04e_formatdluoetiquettecolis` | texte |
| `type_magasin` | `cr04e_typedemagasinem` | texte |
| `eclatement_groupe_marchandise` | `cr04e_eclatementgroupedemarchandise` | texte |
| `type_usine` | `cr04e_typedusine` | texte |
| `type_palette` | `cr04e_typedesupportpalette` | texte |
| `duree_vie` | `cr04e_dureedevie` | texte |
| `unite_duree_vie` | `cr04e_unitedureedevie` | texte |
| `temps_reception_usine` | `cr04e_tempsdereceptionusinej` | texte |
| `groupe_statistique_article` | `cr04e_oc2groupestatistiquearticle` | texte |
| `groupe_article` | `cr04e_oc2groupedarticle` | texte |
| `groupe_ristourne` | `cr04e_oc2groupederistournes` | texte |
| `groupe_imputation` | `cr04e_oc2groupeimputationarticle` | texte |
| `centre_profit` | `cr04e_Centredeprofit` (lookup `centres_profit`) | code → `@odata.bind` |
| `hierarchie_produit` | `cr04e_Hierarchieproduitfamille` (lookup `familles_produit`) | code → `@odata.bind` |
| `visa_supply_chain` | `cr04e_visasupplychain` | booléen |
| `visa_industriel` | `cr04e_visaindustriel` | booléen |
| `visa_commerce` | `cr04e_visacommerce` | booléen |
| `statut_sap` (== « Création SAP effectuée ») | dérivé de `cr04e_statut_en_cours` | statut |

**Lookups (centre profit, hiérarchie) :** poussés par le code, résolus via
`lookupBind(clé, code, sapOptions[clé])`. `centres_profit` est chargé (≈360 lignes)
→ écriture OK. `familles_produit` est vide aujourd'hui → `lookupBind` renvoie
`null`, l'écriture de la hiérarchie est donc **best-effort** (omise tant que la
table de référence n'est pas importée). La **lecture** reste correcte (libellé
formaté). `buildFichePayload` reçoit `sapOptions` (déjà exposé par `useSapOptions`).

### Visas — version minimale

Uniquement les 3 booléens. On abandonne les dates de visa et les motifs de refus.
`VisaToolbar` bascule chaque visa en vrai/faux ; le « refus » se traduit par un visa
laissé/repassé à faux (sans motif stocké). Les colonnes `refus_*` et `visa_*_date`
ne sont plus utilisées.

### Statut SAP

`statut_sap === 'Création SAP effectuée'` est porté par une valeur dédiée de
`cr04e_statut_en_cours` : ajout de `PROJET_STATUT.fl_sap_cree = 'fl_sap_cree'`.
`toFicheShape` mappe cette valeur → `statut_sap` ; le bouton « Créer l'article dans
SAP » (`FLSynthesisSection`) écrit ce statut via `updateFiche`. Les métadonnées
`cree_sap_par` / `date_creation_sap` sont abandonnées.

### Liste FL (Accueil + badge Layout)

`listFiches()` = projets dont `cr04e_statut_en_cours ∈ { 'dl_validee', 'fl_sap_cree' }`
(exclut DE et DS). Réutilise `listProjets()` (cache `['projets-de']`) + filtre, ou
un `toFicheListShape`. Colonnes Accueil inchangées ; l'**usine** vient de
`cr04e_divisionusinename` et le **type de demande** de `cr04e_typedelademande`
(portés par le projet) — plus besoin d'une DE liée. L'avancement = nombre de visas
vrais (0–3).

### Détail (2 vues)

`FicheDetail` / `FicheDetailV2` : `?id=` devient le **GUID du projet**.
- chargement : `getFicheById(id)` au lieu de `FicheLancement.filter`.
- sauvegarde : `updateFiche(id, patch, { sapOptions })` au lieu de
  `FicheLancement.update`.
- le `useSapOptions()` est déjà présent (ou ajouté) pour fournir `sapOptions` à
  l'écriture des lookups.
- la requête `de-for-fiche` (DE liée) est supprimée : usine / type de demande /
  désignation viennent du projet lui-même. Le PDF reçoit ces infos depuis le projet.

### Suppressions (code devenu inutile)

- `base44.entities.FicheLancement` (def `base44Client.js`, export `entities.js`).
- Matérialisation dans `DemandesEtude.jsx` (la FL = le projet dès `dl_validee`) et
  la page `CreerFL.jsx`.
- `src/lib/useInheritedProjetFields.js` et `src/lib/flFromProjet.js` (l'héritage est
  natif : la FL lit le projet).
- Les champs FL retirés de l'UI (`REMOVED_FIELDS`) n'ont pas de colonne et ne sont
  pas mappés.

### PDF

`generateFichePdf(fiche, contexte)` : `fiche` = sortie de `toFicheShape`, mêmes noms
de champs → template inchangé. Le 2ᵉ argument (ex-`de`) est alimenté par les champs
du projet (qté prévisionnelle annuelle, usine…).

---

## Phase 2 — Libellé par pays (`new_libellepays`)

Module `src/api/ficheLibellePays.js` :

- `listForProjet(projetId)` : lignes `new_libellepays` filtrées sur
  `_new_idprojet_value` → `[{ id, code: new_langue, libelle: new_libelle }]`.
- `syncForProjet(projetId, lignes)` : diff contre l'existant (appariement par
  `new_langue`) → **create** (lookup `new_IDProjet@odata.bind = /cr04e_projets(id)`),
  **update** (libellé changé), **delete** (ligne retirée ou vidée). Une ligne sans
  libellé n'est pas poussée.

Appelé à la sauvegarde de la FL, après l'écriture du parent, quand
`libelle_par_pays` change. `LibelleParPaysTable` reste inchangé (forme
`[{ code, libelle }]`).

---

## Phase 3 — Emballages / GTIN (`cr04e_unitofmeasure`)

Module `src/api/ficheEmballages.js` :

- 5 blocs (`uvc_block`, `element_block`, `couche_block`, `colis_block`,
  `palette_block`) ↔ lignes `cr04e_unitofmeasure`.
- Identité du type d'emballage portée par `cr04e_alternativeunit` (code par type).
  Code map proposé (**à confirmer avec les codes AUoM SAP réels**) :
  `uvc→ST`, `element→PCE`, `couche→LAY`, `colis→CAR`, `palette→PAL`.
- Mapping colonnes : `unite→cr04e_quantitynumerator`,
  `poids_brut→cr04e_grossweight`, `poids_net→cr04e_netweight`,
  `long→cr04e_unitspecificproductlength`, `larg→…width`, `haut→…height`,
  `volume→cr04e_materialvolume`, `gtin→cr04e_globaltradeitemnumber`,
  `cr04e_weightunit='KG'`, `cr04e_volumeunit='M3'` (valeurs à confirmer).
- `listForProjet(projetId)` + `syncForProjet(projetId, blocs)` : appariement par
  `cr04e_alternativeunit` → create / update / delete. Un bloc vide → pas de ligne.

Appelé à la sauvegarde de la FL, après le parent, quand un bloc change.

---

## Isolation & tests

- `src/api/fiche.js`, `ficheLibellePays.js`, `ficheEmballages.js` : fonctions pures
  (`toFicheShape`, `buildFichePayload`, mapping blocs ↔ lignes) **testées** en
  Vitest, indépendamment de Dataverse. Les fonctions d'accès (get/update/list/sync)
  restent minces.
- Tests aller-retour : `buildFichePayload(toFicheShape(projet))` recolle aux
  colonnes ; diff libellés/emballages (create/update/delete) sur cas typiques.

## Hors périmètre

- Migration des données localStorage (démo jetable).
- Traçabilité fine des visas (dates, motifs de refus) et métadonnées SAP détaillées.
- Import de la table de référence hiérarchie (`familles_produit`) — l'écriture de la
  hiérarchie restera best-effort tant qu'elle est vide.
- Refonte de l'UI et du template PDF.
