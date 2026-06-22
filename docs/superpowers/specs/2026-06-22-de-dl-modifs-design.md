# Modifications DE / DL + génération du code chapeau SAP

Date : 2026-06-22
Statut : conception validée (en attente revue spec)

## Contexte

Application Power Apps Code app (React + Vite) gérant le cycle Demande d'Étude (DE)
→ Déclinaison Logistique (DL) → Fiche de Lancement (FL). Cette itération apporte
quatre lots de modifications :

1. Ajout d'un bloc « Article d'origine » dans le formulaire DE.
2. Nettoyage des boutons d'action SAP de la DE.
3. Passage du flux DL à des étapes séquentielles sur le même écran.
4. Conception du flux Power Automate générant le prochain code chapeau via OData SAP.

Fichiers principaux concernés :
- `src/pages/CreerDE.jsx` (lots 1 et 2)
- `src/pages/DL.jsx` (lot 3)
- `src/lib/deStatus.js` (référence des statuts, pas de changement attendu)
- Flux Power Automate externe (lot 4, hors repo)

## Lot 1 — Bloc « Article d'origine » dans la DE

Nouveau `<FormSection title="Article d'origine">` inséré **juste après** la section
Produit (après la ligne 943 de `CreerDE.jsx`), visible uniquement quand
`formType === 'de'`.

Contenu et comportement :

- Case à cocher **« Besoin d'une VL »** (`besoin_vl`).
  - Quand cochée : révèle un champ **« Code d'article d'origine »** (`code_vl`),
    saisie 6 ou 8 chiffres, `maxLength={8}`, classe `font-mono` (même rendu que le
    champ équivalent du bloc « autre », lignes 1002-1014).
- Bouton **« Besoin d'un nouveau code »** (`besoin_nouveau_code` / action) :
  - Déclenche un flux Power Automate via `handleDemanderNouveauCode`, calqué sur
    `handleSendToSAP` : état `isRequestingCode`, notif de succès inline discrète,
    gestion d'erreur via `toast`.
  - Constante `NOUVEAU_CODE_FLOW_URL` ajoutée en tête de fichier (placeholder), avec
    le même `TODO` de sécurité que les autres flux (URL SAS exposée côté client).

**Exclusivité VL / nouveau code** : les deux sont mutuellement exclusifs.
- Cocher « Besoin d'une VL » désactive le bouton « Besoin d'un nouveau code ».
- Déclencher / activer « Besoin d'un nouveau code » décoche et désactive « Besoin
  d'une VL » (et masque le champ code).
- Implémentation : un état `origine_mode` (`'vl' | 'nouveau_code' | null`) pilote
  l'affichage et l'activation, plutôt que deux booléens indépendants.

Nouveaux champs `formData` (séparés des champs `autre_*` pour ne pas polluer la
variante « autre ») :
- `besoin_vl: false`
- `code_vl: ''`
- `besoin_nouveau_code: false`

Ces champs sont persistés avec la DE (brouillon et soumission) comme les autres
champs `formData`.

## Lot 2 — Boutons d'action de la DE

Dans le bloc d'action (`CreerDE.jsx` lignes 1191-1240) :

- **Retirer de l'UI** les boutons « Aperçu pour SAP » et « Envoyer vers SAP »
  (le `<div className="mr-auto …">` lignes 1192-1222).
- **Conserver en réserve** le code associé : `handleSendToSAP`, `SapSynthesisDialog`,
  états `sapSent` / `sapPreviewOpen` / `isSendingSAP`, import `SAP_FLOW_URL`. On retire
  uniquement le rendu des boutons et l'aperçu, pas les fonctions (réutilisables plus
  tard). Tolérer les avertissements « unused » éventuels ou les annoter.
- Bouton submit : libellé **« Valider la DE »** (au lieu de « Envoyer (demande code
  chapeau) »). La logique `handleSubmit` (statut `en_attente_code_chapeau`) est
  inchangée.

## Lot 3 — Flux DL séquentiel (même écran)

Dans `DL.jsx` (`DLDetail`) :

- **Statut initial** : `handleImport` met DL **et** DE à `en_attente_dl` (au lieu de
  `en_attente_validation_dl`). C'est le statut de départ d'une DL.
- **Détection « importé »** : `imported` se base sur la présence du fichier
  (`!!dl?.imported_file`) au lieu du statut, pour afficher le tableau des champs dès
  l'import, y compris au statut `en_attente_dl`.
- **Bouton « Envoyer en validation »** : affiché quand `dlStatut === 'en_attente_dl'`.
  Nouveau `handleEnvoyerValidation` qui met DL + DE à `en_attente_validation_dl`.
- **Boutons « Refuser » / « Valider la DL → FL »** : affichés **uniquement** quand
  `dlStatut === 'en_attente_validation_dl'` (et non final). La logique `handleValider`
  (création FL) et `handleRefuser` est inchangée.

Récapitulatif des transitions de statut DL :

```
(import fichier)        → en_attente_dl              [bouton: Envoyer en validation]
Envoyer en validation   → en_attente_validation_dl   [boutons: Refuser | Valider → FL]
Valider la DL → FL      → validee                     (+ création FicheLancement)
Refuser                 → refusee                     (+ motif_refus)
```

Les statuts existent déjà dans `src/lib/deStatus.js` et `DL_STATUT_BADGE` /
`DL_ORDRE` de `DL.jsx` : aucun ajout de statut nécessaire.

## Lot 4 — Génération du code chapeau via Power Automate + OData SAP

Hors repo : conception du flux Power Automate. Le code chapeau est un numéro de
produit SAP au format 18 caractères zéro-paddés, ex. `000000000000905415`.

Logique du flux :

1. **List records** (connecteur OData/SAP, entité Produit) :
   - `$orderby` = champ date de création décroissant (ex. `CreationDate desc`).
   - `$top` = 1.
   - `$select` = champ code produit uniquement (`Product`).
2. Lire la valeur du plus récent (`000000000000905415`).
3. Incrémenter : `int(last) + 1` → `905416`.
4. Re-padder à 18 caractères : `concat('000000000000000000', string(n))` puis
   `substring(...)` sur les 18 derniers caractères → `000000000000905416`.
5. **Create record** OData avec le nouveau `Product`.

À fournir par l'utilisateur pour finaliser : **nom exact de l'entité OData** et
**nom du champ date de création**. Les expressions Power Automate précises
(`add`, `int`, `concat`, `substring`) et le corps JSON seront livrés ensuite.

Côté front, le bouton « Besoin d'un nouveau code » (lot 1) pointera vers ce flux via
`NOUVEAU_CODE_FLOW_URL`.

## Hors périmètre

- Remplacement du mock `base44Client.js` (localStorage) par Dataverse réel.
- Sécurisation des URL de flux SAS (proxy authentifié) — déjà tracé en TODO existant.
- Toute modification de la FL au-delà de sa création existante.
