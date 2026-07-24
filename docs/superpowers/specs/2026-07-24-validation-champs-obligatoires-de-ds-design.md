# Validation des champs obligatoires — création DE & DS

Date : 2026-07-24
Fichier concerné : `src/pages/CreerDE.jsx` (uniquement)

## Objectif

Empêcher l'envoi d'une DE ou la création d'une DS tant que tous les champs
obligatoires ne sont pas remplis, et afficher sous le bouton la liste des champs
manquants (mise à jour en temps réel).

## Décisions

- **Comportement** : bouton d'envoi désactivé tant qu'il manque des champs +
  liste des champs manquants affichée sous la rangée de boutons.
- **Brouillon** : « Enregistrer brouillon » reste toujours actif (on peut
  sauvegarder un formulaire incomplet).

## Source de vérité

Les champs déjà marqués `required` (astérisque rouge via le composant `Field`,
ligne ~141) dans `CreerDE.jsx`. On réplique cette liste dans une config, en
respectant les conditions déjà codées dans le rendu.

### DE (`formType === 'de'`)

| Clé formData          | Label                          | Condition                          |
|-----------------------|--------------------------------|------------------------------------|
| `code_projet`         | Code projet                    | toujours                           |
| `date_demande`        | Date de la demande             | toujours                           |
| `reseau`              | Réseau                         | toujours                           |
| `demandeur`           | Demandeur                      | toujours                           |
| `division`            | Division (Usine)               | toujours                           |
| `designation_article` | Nom du produit / Désignation   | toujours                           |
| `groupe_article`      | Groupe article (division)      | valeur effective = `groupe_article \|\| deGroupeArticleLocked` (satisfait si verrouillé par la division) |

### DS (`formType === 'autre'`)

| Clé formData         | Label                          | Condition                                   |
|----------------------|--------------------------------|---------------------------------------------|
| `autre_demandeur`    | Demandeur                      | toujours                                    |
| `autre_date`         | Date                           | toujours                                    |
| `autre_service`      | Service                        | toujours                                    |
| `autre_type_demande` | Type de demande                | toujours                                    |
| `autre_usine_origine`| Usine de fabrication d'origine | toujours                                    |
| `autre_designation`  | Désignation article            | toujours                                    |
| `autre_usine_fab`    | Usine de fabrication           | requis sauf négoce (`isTypeNegoce(type)`)   |
| `autre_agen_type`    | Agen — type                    | si `autre_usine_fab === 'Agen'` && !négoce  |
| `autre_agen_choix`   | Agen — choix                   | si `autre_usine_fab === 'Agen'` && !négoce  |
| `autre_activite`     | Activité                       | toujours                                    |
| `autre_poids_net_uv` | Poids net pour 1 UV (en kg)    | toujours                                    |
| `autre_type_marque`  | Type de marque                 | toujours                                    |

## Implémentation

1. **Config** : deux tableaux `REQUIRED_FIELDS_DE` / `REQUIRED_FIELDS_DS`
   `{ key, label, isRequired?(formData) }` (défaut : requis).
2. **Calcul** dans le composant : `missingRequired` (tableau de labels), recalculé
   à chaque rendu selon `formType`, `formData` et les variables calculées
   (`deGroupeArticleLocked`). Champ manquant = valeur effective vide après trim.
3. **Blocage** : ajouter `|| missingRequired.length > 0` à la prop `disabled` de :
   - DE « Envoyer vers SAP » (submit, ~2192)
   - DS « Créer la DS » (`handleCreateDs('ds_attente_cc')`, ~2164)
   - DS « Envoyer vers SAP » ADV (`handleDsPushSap`, ~2151)
   « Enregistrer brouillon » : inchangé.
4. **Message** : encart sous la rangée de boutons (ligne ~2135) listant les
   champs manquants. Affiché seulement hors lecture seule / DS validée et quand
   `missingRequired.length > 0`.

## Hors périmètre

- Aucun changement d'API, de flux SAP, ni de style global.
- La garde « code chapeau requis » (DE) est conservée et coexiste.
