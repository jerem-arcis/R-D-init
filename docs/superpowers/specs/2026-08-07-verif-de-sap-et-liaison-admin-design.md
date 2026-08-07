# Vérif VERIF_DE avant envoi SAP + liaison article→code projet (Admin) — Design

**Date :** 2026-08-07
**Statut :** validé

## Problème

Deux évolutions autour du cycle de création d'article SAP depuis une DE :

**A. Durcir l'envoi SAP d'une DE.**
Aujourd'hui `CreerDE.handleSubmit` (chemin DE) écrit la ligne `cr04e_projet` puis
appelle `triggerSapSend` en « fire-and-forget » (réponse ignorée). On veut :
1. **Vérifier avant d'envoyer** que le code chapeau qu'on s'apprête à pousser
   n'existe pas déjà dans SAP (flux `VERIF_DE`) ;
2. **Exploiter la réponse** du flux d'envoi SAP (200 / 400) pour informer
   l'utilisateur.

**B. Corriger la liaison article ↔ code projet dans l'Admin.**
L'onglet Admin (« Suivi des créations SAP ») affiche une colonne « Code projet »
toujours vide : la jointure vers `cr04e_projet` est branchée sur un champ du
journal (`cr04e_codechapeau`) presque toujours vide. La bonne clé est l'article.

## Contraintes / faits établis

- **`postFlow`** (`src/api/flux.js`) lève sur `!res.ok` ; il force
  `Accept-Language: en-US` (indispensable pour SAP, cf. décimales). À préserver.
- Flux résolus par clé via le registre `cr04e_fluxregistre`. Nouvelle clé
  **`VERIF_DE`** à créer côté Dataverse (comme `SAP_SEND`).
- **VERIF_DE** attend `{ "Numéro": "<code>" }` (schéma `info.txt`). Réponse :
  `200` = disponible, `400` = déjà existant.
- Le **code chapeau** poussé = `effectiveCode` (déjà résolu en amont : VL ou
  nouveau code). Le **code PJ** = `formData.code_projet`.
- Admin : le journal `cr04e_gestiondeserreurs` porte `cr04e_referenceproduit`
  (l'article) ; la table `cr04e_projet` porte `cr04e_codechapeau` et
  `cr04e_codeprojet`. **Clé de liaison** :
  `cr04e_referenceproduit` (journal) === `cr04e_codechapeau` (projet), puis
  `cr04e_codeprojet`. **Le journal préfixe parfois de `00000` le produit, pas la
  table projet** → normaliser les zéros de tête des deux côtés (`stripLeadingZeros`
  existe déjà dans `erreursSap.js`).

## Partie A — Envoi SAP DE durci

### Architecture

`src/api/flux.js` : extraire **`postFlowRaw(cle, body)`** = le `fetch`
(headers + `Accept-Language`) qui **renvoie la `Response` sans lever sur `!ok`**.
`postFlow` devient un mince wrapper qui appelle `postFlowRaw` puis lève sur `!ok`
→ comportement **inchangé** pour tous les appelants existants.

### Flux `handleSubmit` (chemin DE), nouvel ordre

1. Garde « code chapeau requis » (existant).
2. **VERIF_DE** : `postFlowRaw(FLUX.VERIF_DE, { 'Numéro': effectiveCode })`
   - `res.status === 200` → on continue ;
   - `res.status === 400` → toast destructif « Code chapeau déjà existant dans
     SAP — demandez un nouveau code chapeau. » ; **on stoppe** (rien n'est écrit),
     `isSubmitting=false` ;
   - autre statut / exception (registre, réseau) → toast « Vérification impossible :
     <message> » ; on stoppe.
3. Écriture `cr04e_projet` + `cr04e_divisionprojet` (existant, inchangé).
4. **Envoi SAP** — `triggerSapSend(effectiveCode)` lit la réponse via
   `postFlowRaw(FLUX.SAP_SEND, body)` et renvoie une issue :
   - `200` → **succès** : `saveMutation` (DE → `dl_attente_validation_cdg`,
     persiste + navigue), toast « Envoyé vers SAP — tout est bon. » ; la fiche
     devient grisée via le statut ;
   - `400` → **erreur** : toast destructif « Une ou plusieurs erreurs sur SAP —
     contactez l'admin. Article **{effectiveCode}** · PJ **{formData.code_projet}** »,
     **on NE navigue PAS** (on reste sur le formulaire, fiche éditable) ;
     `isSubmitting=false` ;
   - autre statut / exception → toast « Envoi SAP échoué : <message> », sans
     navigation.

Note : sur `400`, la ligne `cr04e_projet` a déjà été écrite à l'étape 3 (le projet
reste la sortie principale et remonte dans l'Admin/journal d'erreurs). La DE
**locale** n'est pas avancée (pas de `saveMutation`) → le formulaire reste
éditable pour re-tenter ou traiter l'anomalie.

*Prérequis Dataverse* : ligne `VERIF_DE` (clé + URL) dans `cr04e_fluxregistre`.

## Partie B — Admin : liaison article → code projet

### Architecture

Extraire la jointure en **fonction pure testée** dans `src/lib/erreursSap.js` :

```
joinCodeProjet(creations, projets) -> creations enrichies
```

- Indexe les projets par `stripLeadingZeros(projet.code_chapeau)`.
- Pour chaque création, cherche par `stripLeadingZeros(creation.referenceRaw)`
  (repli `creation.reference`, déjà normalisé).
- Pose `codeProjet = projet.code_projet || ''`, et conserve l'enrichissement
  existant (désignation / usine / demandeur depuis le projet, repli sur les
  valeurs du paramètre envoyé).

`src/lib/useErreursSap.js` : `enrichWithProjet` est **remplacé** par un appel à
`joinCodeProjet` (import depuis `erreursSap.js`). Le reste du hook est inchangé.

L'affichage `SuiviCreationsSap.jsx` lit déjà `c.codeProjet` → aucune modif UI.

## Gestion d'erreur (synthèse)

| Étape | Cas | Comportement |
|---|---|---|
| VERIF_DE | 400 | Toast « déjà existant, demandez un nouveau code », stop, rien d'écrit |
| VERIF_DE | réseau/registre | Toast « vérification impossible », stop |
| Envoi SAP | 200 | Succès, save + navigation, fiche grisée |
| Envoi SAP | 400 | Toast « erreurs SAP, contactez l'admin (Article · PJ) », **pas de navigation** |
| Envoi SAP | autre | Toast « envoi échoué », pas de navigation |
| Admin | projet introuvable | `codeProjet` vide (« — »), reste des colonnes inchangé |

## Tests

- `src/lib/erreursSap.test.js` : `joinCodeProjet` — match direct, match avec zéros
  de tête (`000000810501` ↔ `810501`), projet introuvable → `codeProjet` vide,
  conservation désignation/usine/demandeur.
- Partie A : logique surtout I/O + composant (pas de test unitaire dédié). Le
  découpage `postFlowRaw`/`postFlow` garde les appelants existants intacts.

## Hors périmètre (YAGNI)

- Chemin **DS** (`triggerSapSendDs`) : garde `postFlow` (lève→toast). Pas de VERIF
  ni de branchement 200/400 (demande limitée à la DE).
- Pas de rollback du statut `cr04e_projet` sur 400 SAP (le record doit rester
  visible pour l'admin).
- Pas de refonte de l'Admin : seule la clé de jointure change.
