# Récapitulatif — Cycle de vie projet DE → Code chapeau → DL → FL

**Date :** 2026-06-18
**Périmètre :** refonte du cycle de vie d'un projet (de la Demande d'Étude à la Déclinaison Logistique), avec génération de la Fiche de Lancement à la validation d'une DL.

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
   │  (Valider la DL → crée la FL)        (ou Refuser)
   ▼                                          ▼
Validée  ──► Fiche de Lancement créée      Refusée
```

Côté **liste des Demandes d'Étude**, dès que le projet passe en phase DL (ou est validé), il est affiché **« Validée »** : le suivi DL se fait dans l'onglet **DL**.

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

Route unique `DL` :
- **Sans `id`** → **liste des DL en cours** (statuts `en_attente_dl` + `en_attente_validation_dl`).
- **Avec `?id=<deId>`** → **détail DL**.

Détail DL (un seul écran, deux temps) :
1. **Importer le fichier** (Excel simulé) → préremplit les champs « type Synthèse FL », crée/maj l'enregistrement `DeclinaisonLogistique`, passe en **`en_attente_validation_dl`** et affiche la synthèse.
2. **Valider la DL → FL** ou **Refuser** :
   - **Valider** → crée une **FicheLancement** liée (`code_article` = code chapeau, `etat_global: en_attente`, `etape_courante: 1`), met la DL et la DE en **`validee`** avec `fiche_lancement_id`.
   - **Refuser** → motif obligatoire, DL + DE en **`refusee`**.
- Bouton **retour** = vrai retour navigateur (`navigate(-1)`).

Nouvelle entité mock **`DeclinaisonLogistique`** (`src/api/base44Client.js`, `src/api/entities.js`), persistée en localStorage comme les autres.

---

## 6. Liste « Demandes d'Étude » (`src/pages/DemandesEtude.jsx`)

- **Onglets DE-scoped** : Brouillon · En attente de code chapeau · Validée · Refusée · Toutes (les statuts DL ne sont pas exposés ici).
- **Affichage « Validée »** pour tout projet en phase DL ou validé (`en_attente_dl`, `en_attente_validation_dl`, `validee`).
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
- Suite complète : **20 tests** verts (`npm run test`).
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
