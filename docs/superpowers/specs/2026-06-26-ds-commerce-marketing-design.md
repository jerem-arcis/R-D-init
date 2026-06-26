# Design — DS (Commerce/Marketing) · test 02/07

## Contexte & objectif
Le scope « Commerce/Marketing » correspond au formulaire **« Autre »** existant de `CreerDE.jsx`. On le fait évoluer en **DS** (Demande Spécifique) avec :
- les **règles métier** du scope (usine origine/fabrication, Agen 2 listes, activité→hiérarchie, classe valo, centre profit, type marque→secteur),
- l'alignement **design** sur la DE (continuité visuelle, mêmes `FormSection`),
- la **persistance Dataverse** dans `cr04e_projet` (table partagée avec la DE),
- le **workflow 2 acteurs** : Commerce crée la DS → l'ADV la voit, l'ouvre et la pousse vers SAP.

Hors scope app (côté Jeremy) : le flux Power Automate d'alerte ADV, le flux SAP lui-même (déjà branché pour la DE et réutilisé).

## Décisions validées
- **Persistance** : tout dans `cr04e_projet`, **colonnes typées** (pas de JSON). Différenciation DE/DS par le **statut** (statuts DS dédiés).
- **4 colonnes Dataverse créées** : `cr04e_Centredeprofit` (**lookup** vers la table CEPCT), `cr04e_codedivisionorigine` (texte), `cr04e_service` (texte), `cr04e_descriptiondubesoin` (texte multiligne). Services régénérés. → Le centre de profit se stocke donc comme un lookup (via `sapOptions.centres_profit`), pas en texte.
- **Division** : `cr04e_DivisionUsine` = division de **fabrication** (celle envoyée à SAP). La division d'**origine** va dans la nouvelle `cr04e_codedivisionorigine`.
- **Champs redéduits** (pas de colonne) : activité (← hiérarchie), usine fabrication (← division fabrication), type marque (← secteur), usine origine (← code division origine). Choix VL/nouveau code → logique **code chapeau** (`cr04e_codechapeau`). Code article d'origine → `cr04e_codeprojet`.
- **2 acteurs** : « Créer la DS » (Commerce, pas de push SAP) puis « Envoyer vers SAP » (ADV, à la réouverture).
- **Agen Faux Frais Autre** : division 2847 (seul FF STEF a son code propre 2823).

## Statuts (ajout dans `src/lib/deStatus.js` + `PROJET_STATUT`)
- `ds_brouillon` — « Brouillon DS » (tone amber).
- `en_attente_creation_code_chapeau` — « En attente de création de code chapeau » (tone blue).
- `ds_validee` — « DS validée » (tone emerald), après push SAP par l'ADV.
Ces statuts (DS-only) identifient une DS dans la liste tout au long du cycle.

## Module de règles pur `src/lib/dsRules.js` (+ `dsRules.test.js`)
Déplace/teste les helpers existants et ajoute les nouveaux. Fonctions pures :
- `USINES_ORIGINE` : Bonloc 2886, Rivesaltes 2866, Aire 2859, Agen 2847, **Faux frais STEF Agen 2823**, **Produit négoce 2820** (négoce visible seulement types 4 & 5).
- `codeDivisionOrigine(usine)` → code.
- `codeDivisionFabrication({ type_demande, usine, agen_type })` :
  - types 4/5 → `2820` (négoce) ;
  - Agen + `agen_type === 'Faux Frais STEF'` → `2823`, sinon Agen → `2847` ;
  - sinon code de l'usine.
- `computeHierarchieDS(activite)` : PATISSERIES→`22 DE DE DE`, TRAITEUR→`27 DE DE DE`, MOCHIS→`21 DE DE DE`.
- `computeClasseValoDS({ usine, type_demande, activite })` : prod (Bonloc/Rivesaltes/Agen)→7012, Aire→2038, négoce (4/5) Traiteur→2038 / Pâtisseries→2030, Mochis négoce→'' (repris de l'existant `computeClasseValorisation`).
- `computeCentreProfitDS({ usine, activite, type_demande, agen_choix })` : MOCHIS→21PF, Aire→27TDL, Bonloc/Rivesaltes→22PF, négoce(4/5) Pâtisseries→22HA / Traiteur→27HA, Agen→{Pains surprises→27PS, Assortiments ou plateaux→27CA, Plaques→27PL} (repris de l'existant `computeCentreProfit`).
- `computeSecteurDS(type_marque)` : Marque Nationale RHF/Export→10, GMS→12, distributeur→15.

Listes Agen (2 dropdowns) :
- `AGEN_TYPES` = ['Surgelé', 'Faux Frais STEF', 'Faux Frais Autre'].
- `AGEN_CHOIX` = ['Assortiments ou plateaux', 'Pains surprises', 'Plaques'].

## Formulaire (`CreerDE.jsx`, `formType === 'autre'`/DS)
Renommage **« Autre » → « DS »** (carte de sélection + titres). Mêmes composants/`FormSection` que la DE.

**Bloc Informations générales**
- Demandeur : **prérempli depuis l'utilisateur connecté** (`usePowerPlatform().powerContext.user`, repli saisie libre en dev).
- Date : aujourd'hui (déjà OK).
- Service : **saisie libre** (Input — remplace le SearchableSelect actuel).
- Type de demande : liste 7 cas (déjà OK) **+ panneau latéral d'exemples** (les 7 cas + exemples, cas sélectionné mis en avant).
- **Description du besoin** : nouveau champ texte libre.

**Bloc Code origine**
- Choix VL / nouveau code (existant).
- Code article d'origine (existant).
- Usine d'origine : `USINES_ORIGINE` (négoce visible seulement types 4/5).
- Code division origine : auto (lecture seule).

**Bloc Produit**
- Désignation : libre (existant).
- Usine de fabrication : Bonloc/Rivesaltes/Aire/Agen ; types 4/5 → 2820 négoce auto.
- Code division : auto via `codeDivisionFabrication`. Si **Agen** → 2 listes (`agen_type`, `agen_choix`).
- Activité → **Hiérarchie auto** (lecture seule).
- Poids net pour 1 UV (kg) : saisie (existant).
- Classe de valorisation : auto (lecture seule).
- Centre de profit : auto (lecture seule).
- Type de marque → **Secteur d'activité** auto (lecture seule).

**Actions**
- Commerce : « Enregistrer brouillon » (statut `ds_brouillon`) + **« Créer la DS »** (statut `en_attente_creation_code_chapeau`, écrit Dataverse, **pas** de push SAP).
- ADV (DS rouverte depuis la liste) : bouton **« Envoyer vers SAP »** (réutilise `triggerSapSend`).

## Persistance (`src/api/ds.js`, nouveau)
- `buildDsPayload(formData, { sapOptions, statut })` → payload `cr04e_projet` :
  - scalaires : `cr04e_demandeur`, `cr04e_datedelademande`, `cr04e_typedelademande` (cas), `cr04e_nomduproduitdesignation`, `cr04e_poidsnet`, `cr04e_secteurdactivite` (calculé), `cr04e_codeprojet` (= code article d'origine), `cr04e_codechapeau`, `cr04e_statut_en_cours` ;
  - nouvelles colonnes : `cr04e_codedivisionorigine`, `cr04e_service`, `cr04e_descriptiondubesoin` ;
  - lookups : `DivisionUsine` (fabrication), `Classedevalorisation`, `Hierarchieproduitfamille`, **`Centredeprofit`** (résolus via sapOptions, comme la DE).
- `createDsFromForm` / `updateDsFromForm` (création/maj).
- `getDsById(id)` : lit la ligne et reconstruit le formData DS (type `autre`) ; les lookups sont **rétro-résolus** GUID→code via `sapOptions` (helper réutilisable, utile aussi à la DE). Caveat hiérarchie : « 22/27/21 DE DE DE » doit exister dans la table SAP `familles_produit` pour round-tripper (même dépendance que la DE).

## Liste DE/DS (`DemandesEtude.jsx`)
- Détection DS : statut DS (`ds_brouillon` | `en_attente_creation_code_chapeau` | `ds_validee`). `listProjets`/`toListShape` exposent `type_de: 'ds'` pour ces lignes.
- Badge **DS** (réutilise `TYPE_BADGE`, ajout d'une entrée `ds`).
- Extraction type-aware (désignation, demandeur, type) pour DS.
- Routage : DS `en_attente_creation_code_chapeau` → ouvre `CreerDE?projet_id=<id>` en mode DS (ADV pousse vers SAP) ; `ds_brouillon` → édition.

## Ouverture depuis Dataverse (`CreerDE.jsx`)
- `getDsById` : si la ligne est une DS (statut DS), hydrate `formData` (type `autre`) + recalcule les valeurs dérivées, et affiche le bouton « Envoyer vers SAP » au lieu de « Créer la DS ».

## Alerte ADV (hors app)
Flux Power Automate (Jeremy) déclenché sur création de ligne `cr04e_projet` au statut `en_attente_creation_code_chapeau` → mail à l'ADV. Aucun code app requis.

## Tests
- `dsRules.test.js` : toutes les fonctions pures (usines, divisions, Agen, hiérarchie, classe valo, centre profit, secteur).
- Build + suite vitest verts.

## Reste à faire côté Jeremy
1. ✅ Fait : 4 colonnes créées (`cr04e_Centredeprofit` lookup, `cr04e_codedivisionorigine`, `cr04e_service`, `cr04e_descriptiondubesoin`) + services régénérés.
2. Flux Power Automate d'alerte ADV (déclencheur : création ligne au statut `en_attente_creation_code_chapeau`).
3. Confirmer le code division « Agen Faux Frais Autre » (hypothèse : 2847).
4. (Optionnel) S'assurer que la table SAP `familles_produit` contient « 22/27/21 DE DE DE » pour le round-trip hiérarchie.
