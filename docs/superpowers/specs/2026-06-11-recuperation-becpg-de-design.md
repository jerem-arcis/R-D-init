# Récupération des informations beCPG dans la création d'une DE

**Date :** 2026-06-11
**Statut :** Design validé

## Objectif

Ajouter, en haut du formulaire de création d'une Demande d'Étude (DE), un encart
permettant de saisir un **CodePJ** et de cliquer sur **« Récupérer les informations »**.
Le clic interroge un flux Power Automate qui renvoie les données du projet beCPG
correspondant, puis pré-remplit (en écrasant) les champs du formulaire DE.

## Périmètre

- Concerne les types de formulaire **`de`** et **`de_dl`** uniquement (le JSON
  renvoyé décrit une DE). Le type `autre` n'est pas concerné.
- L'encart est placé **tout en haut** du formulaire, au-dessus du bloc existant
  « Pré-remplissage assisté ».
- Comportement de remplissage : **écrase tous** les champs mappés (pas de
  préservation des valeurs déjà saisies).

## Intégration Power Automate

- **Méthode :** `POST`
- **URL :**
  `https://default77784041615d4839adf5c63961bdfe.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/5a622144c10f44a6becafb2df0f78775/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5BL_-hxk0OMUfcJT9GRVKoh1BX7hkNsag7Qy3KxzpkQ`
- **Headers :** `Content-Type: application/json`
- **Body :** `{ "CodePJ": "<valeur saisie>" }`
- **Réponse attendue :** objet JSON contenant `entities[0].entity` avec un sous-objet
  `attributes` (voir mapping).

Réutilise le pattern `fetch` déjà présent dans `src/pages/DeclencherFlux.jsx`.

## Architecture (Approche A : helper de mapping pur + composant encart)

### 1. Helper `src/lib/becpgMapping.js`

Fonction pure **`mapBeCPGToDE(json)`** : lit `json.entities[0].entity` et retourne un
objet partiel de `formData`. Robuste aux champs absents (optional chaining ; seules
les clés effectivement présentes dans la réponse sont incluses dans l'objet retourné).
Si `entities` est vide ou absent, retourne `null` (= code introuvable).

#### Table de mapping

| Champ `formData`                | Source dans la réponse                              | Exemple PJ4987                |
|---------------------------------|-----------------------------------------------------|------------------------------|
| `code_projet`                   | `entity['bcpg:code']`                               | `"PJ4987"`                   |
| `designation_article`           | `attributes['cm:name']`                             | `"Tarte Citron BIO-BNC FS"`  |
| `date_demande`                  | `attributes['bnc:deDateDemande']` → `YYYY-MM-DD`    | `"2024-12-17"`               |
| `date_lancement`                | `attributes['bnc:deDateLivraison']` → `YYYY-MM-DD`  | `"2025-08-31"`               |
| `axe_strategique`               | `attributes['bnc:deAxeStrategique']`                | `"Business Courant"`         |
| `reseau`                        | `attributes['pjt:projectHierarchy1']['bcpg:lkvValue']` | `"RMN"`                  |
| `type_demande_de`               | `attributes['pjt:projectOrigin']`                   | `"Retravail Produit - CA existant"` |
| `demandeur`                     | `attributes['bnc:dePorteurCommercial']['cm:userName']` | `"laure.bertrand"` (brut, non transformé) |
| `famille_produit`               | `attributes['bnc:deFamilleProduit']`                | `"TARTES"`                   |
| `marque` (Secteur d'activité)   | `attributes['bcpg:plants'][0]['cm:name']`           | `"BONLOC"`                   |
| `client`                        | `attributes['bnc:deClient']`                        | `"BONCOLAC"`                 |
| `qte_previsionnelle_annuelle`   | `attributes['bnc:deVolumeUV']`                      | `30000`                      |

**Non mappés** (laissés vides) : `groupe_article`, `categorie`, `poids_net`.

**Format des dates :** les valeurs ISO (`"2024-12-17T23:00:00.000Z"`) sont tronquées
via `slice(0, 10)` pour correspondre au format des `<input type="date">`
(`YYYY-MM-DD`), cohérent avec le code de pré-remplissage existant.

**`demandeur` :** la valeur `cm:userName` est injectée **brute** (`"laure.bertrand"`),
sans transformation en « Prénom Nom ».

### 2. Composant encart `RecupererBeCPG`

Affiché en haut du formulaire pour `formType` ∈ {`de`, `de_dl`}.

- `Input` pour le CodePJ + bouton **« Récupérer les informations »**.
- États : `idle` / `loading` / `success` / `error`.
- Au clic : `POST` vers l'URL avec `{ CodePJ }`, puis :
  - succès + entité trouvée → `setFormData(prev => ({ ...prev, ...mapped }))` (écrase),
    toast de confirmation indiquant le nombre de champs renseignés.
  - réponse vide / `entities` vide → message « Code PJ introuvable ».
  - `!res.ok` ou erreur réseau → message d'erreur explicite (HTTP / réseau).
- Le bouton est désactivé si le champ CodePJ est vide ou pendant le chargement.

### 3. Fusion des valeurs hors-liste

Plusieurs valeurs renvoyées par l'API n'existent pas dans les listes déroulantes
(ex. `famille_produit` = `"TARTES"` alors que la liste Admin = Traiteur/Mochi/Pâtisseries ;
`marque` = `"BONLOC"`). Décision : **injecter la valeur brute quand même**.

Helper `withValue(list, value)` : renvoie `value && !list.includes(value) ? [...list, value] : list`.
Appliqué aux options des `Select` concernés (`axe_strategique`, `reseau`,
`type_demande_de`, `famille_produit`, `marque`) et au combobox `client`, afin que la
valeur injectée par la récupération s'affiche correctement même hors liste.

## Gestion des erreurs

| Cas                                   | Comportement                                      |
|---------------------------------------|---------------------------------------------------|
| CodePJ vide                           | Bouton désactivé                                  |
| `entities` vide / absent              | Message « Code PJ introuvable », aucun champ modifié |
| `!res.ok` (HTTP ≠ 2xx)                | Message d'erreur avec statut HTTP                 |
| Erreur réseau / exception             | Message d'erreur générique avec détail            |

## Tests

Tests unitaires de `mapBeCPGToDE` avec le JSON de référence PJ4987 :
- vérifie chaque champ mappé (valeurs attendues du tableau ci-dessus) ;
- vérifie la conversion des dates ISO → `YYYY-MM-DD` ;
- vérifie l'extraction des valeurs imbriquées (`reseau` via `bcpg:lkvValue`,
  `demandeur` via `cm:userName`, `marque` via `bcpg:plants[0].cm:name`) ;
- vérifie qu'une réponse `entities: []` renvoie `null` ;
- vérifie qu'un champ source absent n'est pas inclus dans l'objet retourné.

## Fichiers touchés

- **Créé** : `src/lib/becpgMapping.js` (helper `mapBeCPGToDE`, `withValue`).
- **Créé** : test associé pour `mapBeCPGToDE`.
- **Modifié** : `src/pages/CreerDE.jsx` (composant encart `RecupererBeCPG`, intégration
  en haut du form, fusion des options de `Select`/combobox via `withValue`).
