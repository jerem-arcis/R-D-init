// Héritage projet Dataverse (dl_validee) → Fiche de Lancement.
//
// À la matérialisation automatique d'une FL (cf. DemandesEtude.jsx), on préremplit
// ce que Dataverse connaît déjà pour éviter les ressaisies :
//   - identité : code chapeau / code article / désignation / code projet ;
//   - EAN : générés par la règle GS1 existante (src/lib/ean.js), format FL = tableau ;
//   - secteur d'activité et hiérarchie produit : MÊMES règles que la DE
//     (computeSecteurFromReseau / computeHierarchieDE), mappées code → libellé.

import { buildEANSet } from '@/lib/ean';
import {
  computeSecteurFromReseau,
  divisionCodeFromPlant,
  usineFromDivision,
} from '@/lib/deRules';
import { SECTEURS_ACTIVITE } from '@/lib/ficheSchema';

// Hiérarchie produit : usine → libellé (même découpage que computeHierarchieDE :
// Bonloc/Rivesaltes → 22 Pâtisseries, Agen/Aire → 27 Traiteur).
const HIERARCHIE_PAR_USINE = {
  Bonloc: '22 - Pâtisseries',
  Rivesaltes: '22 - Pâtisseries',
  Agen: '27 - Traiteur',
  Aire: '27 - Traiteur',
};

// Secteur : code SAP (10/12/15, issu de computeSecteurFromReseau) → option de la
// liste FL correspondante (match par préfixe de code). '' si aucune option FL ne
// correspond (ex. code non couvert par la liste actuelle) → laissé à la saisie.
function secteurLabelFromCode(code) {
  if (!code) return '';
  return SECTEURS_ACTIVITE.find((o) => o.trim().startsWith(`${code} `)) || '';
}

// Construit les champs FL hérités d'un projet Dataverse.
// `projet` : ligne au format liste (toListShape) — { code_chapeau, code_projet,
//            designation_article, usine_validee, reseau, ... }.
// `deLocale` : DE locale éventuelle (repli désignation + lien brouillon).
export function ficheFromProjet(projet, deLocale = null) {
  const chapeau = projet?.code_chapeau || '';
  const designation =
    projet?.designation_article ||
    deLocale?.designation_article ||
    deLocale?.autre_designation ||
    '';

  const fields = {
    code_article: chapeau,
    code_chapeau: chapeau,
    libelle_article: designation,
    code_etude_rd: projet?.code_projet || '',
    demande_etude_id: deLocale?.id ?? null,
  };

  // EAN : mêmes règles que la DE (préfixe GS1 325151 + 4 premiers chiffres du code
  // chapeau + niveau + clé). '' si < 4 chiffres → on n'ajoute rien. Format FL : tableau.
  const eans = buildEANSet(chapeau);
  if (eans.ean_couche) {
    fields.ean_couche = [eans.ean_couche];
    fields.ean_carton = [eans.ean_carton];
    fields.ean_palette = [eans.ean_palette];
  }

  // Secteur d'activité : réseau → code (règle DE) → libellé FL.
  const secteur = secteurLabelFromCode(computeSecteurFromReseau(projet?.reseau));
  if (secteur) fields.secteur_activite = secteur;

  // Hiérarchie produit : libellé formaté du lookup Dataverse du projet. Repli sur la
  // règle usine (22/27, même découpage que computeHierarchieDE) si le projet n'en
  // porte pas. (Resynchronisée aussi à l'ouverture — cf. useInheritedProjetFields.)
  const usine = usineFromDivision(divisionCodeFromPlant(projet?.usine_validee));
  const hierarchie = projet?.hierarchie_produit_famille || HIERARCHIE_PAR_USINE[usine] || '';
  if (hierarchie) fields.hierarchie_produit = hierarchie;

  // Centre de profit : libellé formaté du lookup Dataverse du projet.
  if (projet?.centre_profit) fields.centre_profit = projet.centre_profit;

  // Date de la demande : héritée du projet (renseignée à la création de la DE).
  if (projet?.date_demande) fields.date_demande = projet.date_demande;

  return fields;
}
