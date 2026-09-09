# Envoi SAP « par ID » pour la DE et la DS — design

Date : 2026-09-09
Statut : proposé (en attente de relecture)

## Contexte

Aujourd'hui l'envoi vers SAP d'une **DE** (`handleSubmit` → `triggerSapSend`) et
d'une **DS** (`handleDsPushSap` → `triggerSapSendDs`) construit un **gros payload**
avec tous les champs et le POST au flux `SAP_SEND`. En cas d'échec, le projet est
remis en brouillon.

La **FL** fonctionne déjà autrement (`FLSynthesisSection` → `sendFlToSap`) : le flux
`SAP_SEND_FL` ne reçoit **que l'ID** (`{ ID: <guid> }`) et **relit lui-même** la
ligne Dataverse et ses tables filles. Sur HTTP 200 l'app promeut le statut ; sur
échec elle laisse la fiche modifiable pour un nouvel essai.

On veut **aligner la DE et la DS sur ce modèle FL**.

## Objectif

Pour la DE et la DS :
1. Tout écrire dans Dataverse **avant** l'envoi (ligne projet + tables annexes).
2. N'envoyer que **l'ID** au flux de création.
3. Après réponse, **l'app** met à jour le statut projet **et** le statut flux.

## Séquence cible (DE et DS)

1. **`VERIF_DE`** (pré-check « code chapeau déjà dans SAP ») — inchangé, premier
   appel côté app. 400 = stop (rien n'est créé).
2. **Écriture Dataverse** :
   - Ligne `cr04e_projet` écrite en **`de_brouillon`** (DE) — la DS existe déjà en
     `ds_attente_cc` au moment de l'envoi ADV.
   - Tables annexes : `cr04e_divisionprojet` (PROD, ou STOCK pour DS 4/5), et toute
     autre table annexe déjà gérée (libellés pays, canaux, sites… selon le cas).
     La ligne `cr04e_divisionprojet` porte aussi le **`ProfilFabricRépét`**
     (`cr04e_profilfabricrepet` : Z006/Z008/Z010 selon la division, cf.
     `computeProfilFabricRepetDE`) — pour DE ET DS, afin que le flux le relise depuis
     la table division. La table expose aussi `cr04e_nomnclntarifdouan` et
     `cr04e_tempsdereception` (à alimenter au besoin, hors périmètre actuel).
   - Les champs calculés sont persistés via `buildProjetPayload` / `buildDsPayload`
     (inchangé).
3. **Envoi** : `postFlowRaw(FLUX.SAP_SEND, { ID: projetId })` — plus de gros payload.
   `triggerSapSend` / `triggerSapSendDs` deviennent des « send { ID } », sur le
   modèle de `sendFlToSap`.
4. **Post-réponse (l'app écrit tout)** :

   | Réponse | Statut flux (`cr04e_fluxenvoiede`) | Statut projet (DE) | Statut projet (DS) |
   |---------|-----------------------------------|--------------------|--------------------|
   | HTTP 200 | `reussi` | `dl_attente_validation_cdg` | `ds_validee` |
   | HTTP 400 / autre | `erreur` | reste `de_brouillon` | reste `ds_attente_cc` |

   Écriture via `updateProjetStatut` (existe) + un écrit du champ flux
   (`cr04e_fluxenvoiede`).

## Points de conception

- **Statut flux écrit par l'app** : valeurs `reussi` / `erreur` (compatibles avec
  `fluxStatut` / `FluxStatutBadge`). Le **détail** des erreurs SAP (table
  `cr04e_gestiondeserreurs`) reste alimenté côté flux/SAP — l'app ne pose que
  `reussi` / `erreur`.
- **Données récupérables en cas d'échec** : comme la ligne est écrite en brouillon
  **avant** l'envoi, un échec laisse tout en base (résout au passage le « DE vide à
  la réouverture »). La ligne est rouverte via `projet_id` (déjà en place).
- **Pas de doublon au renvoi** : `projet_id` est réutilisé (update, pas create) ;
  `ensureDivisionProjet` est idempotent.

## Correction FL — `ficheSitesStockage.syncForProjet`

La sync des sites de stockage supprime aujourd'hui toute ligne `STOCK` absente de la
sélection. On la modifie pour **ne jamais supprimer la ligne `STOCK` de division
`2820`** (celle écrite par la DS, négoce). Les autres sites FL restent gérés
normalement (ajout + retrait des sites que la FL gère). La division négoce `2820`
est une constante (`DIVISION_ORIGINE['Produit négoce']`).

## Fichiers touchés (app)

- `src/pages/CreerDE.jsx` — `handleSubmit` (DE) et `handleDsPushSap` (DS) :
  réordonner (écriture Dataverse → send { ID } → maj statut + flux) ;
  `triggerSapSend` / `triggerSapSendDs` réduits à l'envoi de l'ID.
- `src/api/projet.js` — helper d'écriture du statut flux (`cr04e_fluxenvoiede`), en
  complément de `updateProjetStatut` (ou un seul helper qui pose les deux).
- `src/api/ficheSitesStockage.js` — préserver la ligne `STOCK` 2820.
- Tests : `projet.test.js` (helper statut flux), éventuels tests purs extraits.

## Dépendances hors app (à ta charge)

- Les flux Power Automate `SAP_SEND` (DE) et DS doivent **relire Dataverse par ID**
  (comme `SAP_SEND_FL`) et **ne plus** écrire `cr04e_fluxenvoiede` (l'app s'en
  charge). Tant que ce n'est pas fait, ne pas basculer l'envoi en production.

## Hors périmètre

- Refonte des transitions de statut (on garde l'existant).
- Déplacement de `VERIF_DE` dans le flux (reste côté app).
- Détail/parsing des erreurs SAP (table `gestiondeserreurs`, inchangé).

## Risques / points ouverts

- Si un flux continue d'écrire `cr04e_fluxenvoiede` en parallèle de l'app → valeur
  incohérente. À coordonner (l'app devient seule source).
- La FL affiche la ligne 2820 comme un site de stockage sélectionné ; la préserver
  peut surprendre si l'utilisateur tente de la retirer (elle restera). Acceptable.
