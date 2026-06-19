# Récapitulatif — Cycle de vie projet DE → Code chapeau → DL → FL

**Date :** 2026-06-18 (mis à jour le 2026-06-19)
**Périmètre :** refonte du cycle de vie d'un projet (de la Demande d'Étude à la Déclinaison Logistique), avec génération de la Fiche de Lancement à la validation d'une DL.
**MàJ 2026-06-19 :** import Excel réel du fichier de DE et découplage de l'état DL vis-à-vis de la DE (historique conservé sur les 3 onglets) — cf. §5.

---

## 1. Vue d'ensemble du flux

Un projet démarre par une **DE** et avance le long d'un pipeline de statuts. Une fois le **code chapeau** reçu, il bascule en **DL** (onglet dédié). La validation d'une DL génère la **FL**.

```
Brouillon
   │  (Envoyer — demande de code chapeau)
   ▼
En attente de code chapeau ───── alertes ADV J+0 / J+6
   │  (saisie du code chapeau reçu)
   ▼
En attente de DL ───────────────┐
   │  (import du fichier DL)     │  onglet « DL »
   ▼                            │  (DL en cours)
En attente de validation DL ────┘
   │  (Valider la DL → crée la FL)        (ou Refuser → motif)
   ▼                                          ▼
DL Validée ──► Fiche de Lancement créée    DL Refusée
   (DE reste « Validée »)                  (DE reste « Validée »)
```

L'état **en cours / validée / refusée** ci-dessus concerne la **DL** (porté par
l'enregistrement `DeclinaisonLogistique`). La **DE** garde son propre historique :
dès qu'un projet passe en phase DL, il est affiché **« Validée »** côté liste des
Demandes d'Étude — **même si la DL est ensuite refusée**. Trois onglets =
trois historiques indépendants : **DE** (étude validée), **DL** (état logistique),
**Fiches de Lancement** (projets à DL validée).

---

## 2. Pipeline de statuts

Source unique : `src/lib/deStatus.js`.

| Clé | Libellé | Phase |
|---|---|---|
| `brouillon` | Brouillon | Création DE |
| `en_attente_code_chapeau` | En attente de code chapeau | DE envoyée, attente retour SAP |
| `en_attente_dl` | En attente de DL | Code chapeau reçu, DL à constituer |
| `en_attente_validation_dl` | En attente de validation DL | Fichier DL importé |
| `validee` | Validée | Projet validé → FL créée |
| `refusee` | Refusée | Projet refusé |

`deStatus.js` expose aussi `codeChapeauAlert(de, today)` → `{ level: 'none'|'j0'|'j6', joursEcoules }`, calculé depuis `date_demande_code_chapeau` (alerte le jour de la demande, renforcée à J+6).

---

## 3. Écran « Créer une DE » (`src/pages/CreerDE.jsx`)

- **Sélection de type** : cartes **DE** et **Autre** uniquement (la carte **DE/DL** a été retirée).
- **Récupération beCPG** par CodePJ : conservée.
- **Pré-remplissage assisté** (import de brief/fichier) : **retiré**.
- **Aperçu pour SAP** : l'ancienne fenêtre rétro MM03 a été remplacée par une **vue de synthèse** au style « Synthèse FL » (cartes Données de base / Ventes / Comptabilité / Calcul du coût). Bouton renommé **« Aperçu pour SAP »**.
- **Envoyer vers SAP** : conservé (flux Power Automate existant).
- **Soumission** : le bouton « Envoyer (demande code chapeau) » crée la DE en **`en_attente_code_chapeau`** et horodate `date_demande_code_chapeau`. « Enregistrer brouillon » reste en `brouillon`.
- **Mode édition** : ouvrir un **brouillon** depuis la liste arrive sur `CreerDE?id=<deId>` avec tous les champs modifiables et tous les boutons ; la sauvegarde **met à jour** la DE existante.

---

## 4. Étape « Code chapeau » (`src/pages/TraiterDE.jsx`)

- Au statut `en_attente_code_chapeau` : affichage de la DE en lecture seule + un encart **Code chapeau**.
- **Saisie manuelle** du code chapeau reçu de SAP, puis un seul bouton **« Valider le code chapeau »** → enregistre le code (`code_chapeau`, `date_code_chapeau`) et passe en **`en_attente_dl`**.
- Le code chapeau **n'est pas refusable** (pas de bouton Refuser à cette étape).
- Une fois en phase DL, un bouton « Ouvrir la Déclinaison Logistique » renvoie vers la page DL.

---

## 5. Déclinaison Logistique (`src/pages/DL.jsx`)

> **Mise à jour 2026-06-19** : import Excel réel (plus de données factices) et
> découplage de l'état DL vis-à-vis de la DE — voir détails ci-dessous.

Route unique `DL` :
- **Sans `id`** → **liste des DL** (en cours **et** finalisées).
- **Avec `?id=<deId>`** → **détail DL**.

### Import réel du fichier Excel

L'import lit **vraiment** le fichier `.xlsm`/`.xlsx` de la DE (plus aucun preset) :
- **`src/lib/xlsxLite.js`** — mini-lecteur sans dépendance : un classeur est une
  archive ZIP, décompressée via `DecompressionStream('deflate-raw')` (natif
  navigateur) ; parsing XML en **fonctions pures** (`parseSharedStrings`,
  `parseSheetCells`, `resolveSheetTarget`).
- **`src/lib/parseDL.js`** — cible l'onglet **« Fiche Demande »** et extrait,
  par ligne renseignée en **colonne G** (libellé), la **valeur DE (col H)** et la
  **valeur DL (col I)**. Nombres formatés, erreurs Excel (`#DIV/0!`…) nettoyées.
- **Bornage** : extraction jusqu'à **« Mise à dispo Client »** inclus
  (en-tête « Dates Rétro-Planning du lancement » exclu, et tout ce qui suit —
  Commentaires faisabilité, Notation — ignoré), puis ajout des **2 lignes DL
  spécifiques** portées par la colonne H : *« pour DL seulement : Date 1ère
  Fabrication »* et *« … Date 1ère livraison »*.
- Les lignes extraites sont stockées dans `champs_dl` (tableau) sur
  l'enregistrement DL et affichées en **table (Ligne · Valeur DE · Valeur DL)**.
- **Changer le fichier** : tant que la DL n'est ni validée ni refusée, un bouton
  « Changer le fichier » permet de ré-importer (régénère `champs_dl`).
- Tests : `src/lib/parseDL.test.js` (parsing, bornage, lignes DL colonne H).

### Cycle de vie découplé DE / DL

L'**état de la DL** (en cours / validée / refusée + motif) est porté par
l'enregistrement **`DeclinaisonLogistique`**, **pas** par la DE :
- **Valider la DL → FL** → crée une **FicheLancement** liée (`code_article` =
  code chapeau, `etat_global: en_attente`, `etape_courante: 1`), DL **`validee`**,
  DE **`validee`** avec `fiche_lancement_id`.
- **Refuser** → motif obligatoire ; seul l'enregistrement DL passe **`refusee`**
  (+ `motif_refus`). **La DE n'est pas touchée et reste « Validée »** (sa partie
  est terminée) → l'historique du projet est conservé.
- Le détail DL lit son état via `dl.statut` (header « Statut DL », alerte de refus,
  boutons figés si finalisée). Bouton **retour** = retour navigateur.

### Liste DL

Source de vérité = enregistrements `DeclinaisonLogistique` (joints aux DE) :
- affiche **En attente de DL** (code chapeau reçu, pas encore importé),
  **En attente de validation DL**, **Validée** (vert), **Refusée** (rouge) ;
- tri : DL en cours d'abord, finalisées ensuite ;
- sur une ligne **Refusée**, lien **« voir le motif »** → **modale** affichant le
  motif (lu sur l'enregistrement DL).

Entité mock **`DeclinaisonLogistique`** (`src/api/base44Client.js`,
`src/api/entities.js`), persistée en localStorage. Le fichier Excel de test
n'est **pas** versionné (`*.xlsm`/`*.xlsx` dans `.gitignore`).

---

## 6. Liste « Demandes d'Étude » (`src/pages/DemandesEtude.jsx`)

- **Onglets DE-scoped** : Brouillon · En attente de code chapeau · Validée · Refusée · Toutes (les statuts DL ne sont pas exposés ici).
- **Affichage « Validée »** pour tout projet en phase DL ou validé (`en_attente_dl`, `en_attente_validation_dl`, `validee`). Reste **« Validée » même si la DL est refusée** (le refus ne touche plus la DE — cf. §5).
- **Alertes code chapeau** : badge `J+x` / `Relance J+x` sur les lignes concernées + carte compteur « Alertes code chapeau ».
- **Cartes stats** : Attente code chapeau · Validées · Refusées · Alertes code chapeau.
- **Routage des lignes** :
  - `brouillon` → `CreerDE?id=` (édition)
  - phase DL → `DL?id=` (détail DL)
  - autres → `TraiterDE?id=`

---

## 7. Navigation (`src/Layout.jsx`)

- Nouvel onglet **« DL »** (icône Package) placé **sous « Demandes d'Étude »**, pointant vers la liste des DL en cours.
- Onglet **« Déclencher le flux »** (test) **retiré** du menu.

---

## 8. Fiche de Lancement — écriture simultanée (`src/lib/ficheSchema.js`)

- Le **verrouillage séquentiel** des sections a été retiré : `isSectionLocked` renvoie toujours `false`.
- `isFieldEditable` n'est plus gouverné par l'ordre du workflow : un champ est éditable tant que **le visa de sa propre section** n'est pas posé (et que SAP n'est pas créé).
- Conséquence : **chaque service peut renseigner sa section en parallèle**. La pose du visa d'une section (ou la création SAP) fige les champs concernés. S'applique aux deux vues FL (sections et fiche unique V2).

---

## 9. Données de démonstration (`src/lib/mockSeed.js`)

- `SEED_FLAG` passé en **`v7`** (re-seed automatique au prochain chargement).
- Les anciens échantillons `de_dl` sont normalisés en `de`.
- Ajout de DE de démonstration sur les statuts in-progress :
  - 2 × `en_attente_code_chapeau` (dont une à J+8 → alerte « Relance »),
  - 1 × `en_attente_dl` (code chapeau reçu).

> Reset complet possible en vidant le localStorage du site.

---

## 10. Tests

- `src/lib/deStatus.test.js` : libellés/ordre des statuts + `codeChapeauAlert` (J+0, J+6, hors statut, date absente).
- `src/lib/parseDL.test.js` *(MàJ 2026-06-19)* : parsing xlsx (chaînes partagées, cellules, résolution de feuille), extraction G/H/I, bornage à « Mise à dispo Client », lignes DL de la colonne H.
- Suite complète : **27 tests** verts (`npm run test`).
- Build de production OK (`npm run build`).

---

## 11. Hors périmètre (volontairement non traité)

- Aucune évolution du type de demande **`autre`** (laissé tel quel).
- Remédiation de la **dette de sécurité** sur les URLs de flux Power Automate (signatures SAS exposées côté client) — documentée dans la spec beCPG du 2026-06-11.
- La page « Déclencher le flux » reste dans le code mais n'est plus accessible via la navigation.

---

## 12. Fichiers de référence

- **Spec :** `docs/superpowers/specs/2026-06-18-de-pipeline-dl-design.md`
- **Plan :** `docs/superpowers/plans/2026-06-18-de-pipeline-dl.md`

## 13. Commits de la session (du plus ancien au plus récent)

1. `Spec: cycle de vie projet DE → code chapeau → DL`
2. `Plan: implémentation cycle de vie DE → code chapeau → DL`
3. `feat(de): module de statuts du pipeline + alerte code chapeau J-0/J+6`
4. `feat(dl): entité mock DeclinaisonLogistique`
5. `feat(de): CreerDE retrait DE/DL + pré-remplissage, aperçu SAP en synthèse, soumission en attente code chapeau`
6. `feat(de): TraiterDE étape code chapeau simulée -> en attente de DL`
7. `feat(dl): page DL avec import simulé + valider/refuser`
8. `feat(de): liste alignée sur le pipeline + alertes code chapeau + routage DL`
9. `chore(seed): DE de démo sur le pipeline + de_dl->de + bump seed v7`
10. `feat(de): édition brouillon, code chapeau en saisie manuelle, onglet liste DL, FL à la validation DL`
11. `feat: DE collapse en Validée hors phase DL, retour DL natif, FL en écriture simultanée, retrait onglet flux`
12. `docs: récapitulatif complet du cycle de vie DE → DL → FL`

### Compléments du 2026-06-19

13. `feat(dl): import Excel réel + suivi du cycle de vie DL`
    — lecteur xlsx/xlsm sans dépendance (`src/lib/xlsxLite.js`), extraction
    réelle des champs G/H/I de l'onglet « Fiche Demande » (`src/lib/parseDL.js`
    + tests), bornage à « Mise à dispo Client » + lignes « pour DL seulement »,
    table des champs extraits, bouton « Changer le fichier », découplage de
    l'état DL vis-à-vis de la DE (refus n'affecte plus la DE), liste DL avec
    états + motif de refus consultable. Fichier Excel de test ignoré
    (`*.xlsm`/`*.xlsx` dans `.gitignore`).
