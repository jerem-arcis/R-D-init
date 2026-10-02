# Périmètre société & droits par groupe — design

Date : 2026-10-02 · Branche : `dev`

## Objectif

Préparer l'app à l'arrivée d'autres sociétés dans SAP. La structure SAP Onoré est :
Société → Division, Société → Organisation commerciale → Canal de distribution.
Tout part de la table société : ses groupes de sécurité Entra déterminent qui voit
quelles divisions, quels canaux et quels dossiers, et qui modifie quoi.

Critères de réussite :
- un utilisateur rattaché à une société ne voit que les dossiers, divisions et canaux
  de cette société ;
- dans la FL, chacun ne modifie et ne vise que le bloc de son métier, le reste restant
  visible ;
- l'onglet Admin est réservé aux admins et permet de gérer les quatre référentiels ;
- tant qu'aucun groupe n'est renseigné, l'app se comporte comme aujourd'hui.

## Tables Dataverse (déjà ajoutées à la code app)

| Table | Colonnes utiles | Lien |
|---|---|---|
| `cr04e_societereferentiel` | `cr04e_ste` (code), `cr04e_nomsociete`, `cr04e_groupeadmin`, `cr04e_groupeadv`, `cr04e_groupecommerce`, `cr04e_groupeindustrie`, `cr04e_groupequalite` | racine |
| `cr04e_divisionusine` | `cr04e_division`, `cr04e_nom1`, `cr04e_societe`, `cr04e_type` (texte : `PROD` / `STOCK`) | `cr04e_societe` = `cr04e_ste` |
| `cr04e_organisationcommercialereferentiel` | `cr04e_orgco`, `cr04e_designation`, `cr04e_nomsociete` | `cr04e_nomsociete` = `cr04e_ste`, à défaut = `cr04e_nomsociete` de la société |
| `cr04e_canaldedistributionreferentiel` | `cr04e_canal`, `cr04e_designation`, `cr04e_orgco` | `cr04e_orgco` = `cr04e_orgco` |

Les liens sont des codes texte, comparés après `trim()` et sans tenir compte de la casse.

Connecteur ajouté : `shared_office365groups` (`Office365GroupsService`).

## Décisions

1. **Contenu des colonnes de groupes** : Object ID (GUID) de groupes Entra. Une cellule
   peut contenir plusieurs GUID séparés par `;` ou `,`.
2. **Appartenance** : `Office365GroupsService.ListGroupMembers(groupId, 999)` pour chaque
   GUID distinct ; l'utilisateur est membre si son UPN ou son e-mail figure dans la liste
   (comparaison insensible à la casse). Fonctionne pour les groupes de sécurité et M365.
3. **Règle « groupes vides », par société** :
   - société **ouverte** = ses 5 colonnes sont vides → visible par tous, tous les rôles
     pour tout le monde ;
   - société **cloisonnée** = au moins une colonne remplie → visible uniquement par les
     membres d'au moins un de ses groupes ; une colonne vide signifie « personne n'a ce
     rôle », pas « tout le monde ».
4. **Société d'un dossier** : déduite à la volée de sa division (lookup
   `cr04e_divisionusine`, à défaut `cr04e_codedivisionorigine`). Aucune colonne ajoutée
   sur `cr04e_projet`. Un dossier sans division, ou dont la division n'a pas de société
   connue, est visible par tous.
5. **Dossiers cloisonnés** : listes, tableau de bord et lien direct ne montrent que les
   dossiers de mes sociétés.
6. **Rôles FL** : ADV → bloc Supply Chain (`sc`), Industrie → bloc Industriel (`ind`),
   Commerce → bloc Commerce (`com`), Qualité → aucun bloc pour l'instant, Admin → tous.
   Le droit de viser/refuser suit le droit de modifier. La correspondance est une table
   de configuration, pour ajouter le bloc Qualité plus tard.
7. **DE et DS** : pas de restriction par métier ; tout utilisateur qui voit la société
   peut créer et traiter.
8. **Divisions proposées** :
   - DE : type `PROD`, parmi mes sociétés ;
   - FL : type `STOCK` de la société du dossier ; si elle n'en a aucune, toutes ses
     divisions ; dossier sans société → même règle sur mes sociétés ;
   - DS : comportement actuel, restreint à mes sociétés ;
   - une division sans type n'est ni PROD ni STOCK.
9. **Canaux FL** : canaux des orgCo de la société du dossier, dédoublonnés par code ;
   dossier sans société → canaux de mes sociétés. La catégorie option-set
   `canaux_distrib` est retirée de l'Admin ; la désignation enregistrée dans la table
   fille vient de la nouvelle table.
10. **Valeur hors périmètre déjà enregistrée** : reste affichée, jamais effacée.
11. **Admin** :
    - onglet visible si je suis admin d'au moins une société, ou si aucune société n'a
      de groupe admin renseigné (démarrage) ;
    - quatre listes : Sociétés, Organisations commerciales, Canaux, Divisions, limitées
      aux lignes de mes sociétés administrées ; une société sans groupe admin est
      gérable par n'importe quel admin ;
    - modification seule (pas de création ni de suppression) : désignations, GUID des
      groupes, type de division via menu déroulant (vide / PROD / STOCK) ;
    - les autres listes et le suivi des créations SAP restent communs à tous les admins.
12. **Logo** : hors lot. Le menu affiche le nom de la société quand l'utilisateur n'en
    voit qu'une, « BONCOLAC » sinon.
13. **Erreur de résolution d'un groupe** (groupe supprimé, connecteur en échec) :
    l'utilisateur est considéré non membre de ce groupe et un avertissement s'affiche.
    Une erreur n'ouvre jamais l'accès.
14. **Simulation locale** : hors player Power Apps, `localStorage.perimetre_groupes`
    (liste de GUID) remplace l'appel au connecteur.

## Architecture

| Unité | Rôle | Dépend de |
|---|---|---|
| `src/api/referentiels.js` | Lecture des 4 tables, normalisation, écritures admin | services générés |
| `src/api/groupes.js` | Utilisateur courant + ensemble des GUID dont il est membre | `getContext`, `Office365GroupsService` |
| `src/lib/perimetre.js` | Règles pures : périmètre, filtres, droits | rien |
| `src/lib/PerimetreContext.jsx` | Charge données + groupes, expose `usePerimetre()` | les trois ci-dessus, react-query |
| Écrans | Interrogent `usePerimetre()` | contexte |

### API de `perimetre.js`

```
parseGroupIds(cell) -> string[]
buildPerimetre({ societes, divisions, orgCos, canaux, mesGroupes }) -> perimetre
  perimetre.societes            // toutes, avec { code, nom, ouverte, roles: Set }
  perimetre.mesSocietes         // codes visibles
  perimetre.adminOuvert         // aucune société n'a de groupe admin
  perimetre.isAdmin
societeDeDivision(perimetre, codeDivision) -> code | null
peutVoirDossier(perimetre, codeDivision) -> bool
divisionsPour(perimetre, 'DE' | 'FL' | 'DS', codeDivisionDossier?) -> [{ value, designation, id }]
canauxPour(perimetre, codeDivisionDossier?) -> [{ value, designation }]
peutModifierBloc(perimetre, owner, codeDivisionDossier?) -> bool
societesAdministrables(perimetre) -> codes
```

`roles` vaut `{admin, adv, commerce, industrie, qualite}` au complet pour une société
ouverte. `peutModifierBloc` sur un dossier sans société renvoie `true` si l'utilisateur
a le rôle correspondant (ou admin) dans au moins une de ses sociétés.

## Branchement

- `App.jsx` : `PerimetreProvider` autour des routes ; écran de chargement tant que le
  périmètre n'est pas résolu.
- `Layout.jsx` : entrée Admin conditionnelle, nom de société.
- `Admin.jsx` : garde d'accès + quatre listes référentiel (composant dédié
  `src/components/admin/ReferentielSocietes.jsx`).
- Listes (`Accueil`, `DemandesEtude`, `Dashboard`) : filtre `peutVoirDossier`.
- Détail (`FicheDetailV2`, `TraiterDE`, `CreerDE` en reprise) : accès refusé si hors
  périmètre.
- `CreerDE` / `TraiterDE` : options de division via `divisionsPour('DE')`.
- DS : `divisionsPour('DS')`.
- `FicheDetailV2` : `isFieldEditable` combiné à `peutModifierBloc`, barre de visas
  filtrée, sites de stockage via `divisionsPour('FL')`, canaux via `canauxPour`.
- `ficheCanaux.js` : désignations lues dans la table canaux.

## Tests

Tests unitaires Vitest sur `perimetre.js` : société ouverte / cloisonnée, multi-sociétés,
dossier sans division, division sans type, repli « aucune STOCK », dédoublonnage des
canaux, rôles FL, admin ouvert / réservé, cellule multi-GUID. Tests de `groupes.js` sur
la correspondance UPN/e-mail et le cas d'erreur. La suite existante reste verte.

## Limite connue

Le cloisonnement est appliqué dans l'app. Un accès direct à Dataverse permet toujours de
lire les autres sociétés ; un cloisonnement opposable demandera des rôles de sécurité
Dataverse.

## Hors lot

Logo par société, bloc Qualité de la FL, règles de divisions pour la DS, organisation
commerciale dynamique envoyée à SAP (`computeOrgCommerciale` reste en dur), rôles
Dataverse, droits fins DE/DS (CDG).
