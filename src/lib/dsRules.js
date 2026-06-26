// Regles metier de la DS (Demande Specifique), pures et testees. Reutilisees par
// le formulaire (CreerDE.jsx) et la persistance (api/ds.js). Reprend la logique
// auparavant inline dans CreerDE (classe valo / centre profit / secteur) + ajoute
// les regles du scope Commerce/Marketing (usines origine/fabrication, Agen).

export const ACTIVITES = ['PATISSERIES', 'TRAITEUR', 'MOCHIS'];
export const TYPES_MARQUE = ['Marque Nationale RHF / Export', 'Marque Nationale GMS', 'Marque distributeur'];
export const AGEN_TYPES = ['Surgelé', 'Faux Frais STEF', 'Faux Frais Autre'];
export const AGEN_CHOIX = ['Assortiments ou plateaux', 'Pains surprises', 'Plaques'];

// Usines d'origine (avec leur code division). "Produit negoce" n'est propose
// que pour les types de demande 4 et 5.
const DIVISION_ORIGINE = {
  Bonloc: '2886',
  Rivesaltes: '2866',
  Aire: '2859',
  Agen: '2847',
  'Faux frais STEF Agen': '2823',
  'Produit négoce': '2820',
};
export const USINES_ORIGINE = Object.keys(DIVISION_ORIGINE);
// Usines de fabrication : memes sites, hors "Faux frais STEF Agen" (gere via les
// 2 listes Agen) et hors negoce (force pour les types 4/5).
export const USINES_FABRICATION = ['Bonloc', 'Rivesaltes', 'Aire', 'Agen'];

export const TYPES_DEMANDE_NEGOCE = ['4', '5'];

export const isTypeNegoce = (t) => ['4', '5'].includes(String(t ?? '').trim());

export const codeDivisionOrigine = (usine) => DIVISION_ORIGINE[usine] || '';

// Division de fabrication (celle envoyee a SAP).
export const codeDivisionFabrication = ({ type_demande, usine, agen_type } = {}) => {
  if (isTypeNegoce(type_demande)) return '2820';
  if (usine === 'Agen') return agen_type === 'Faux Frais STEF' ? '2823' : '2847';
  return DIVISION_ORIGINE[usine] || '';
};

export const computeHierarchieDS = (activite) => {
  if (activite === 'PATISSERIES') return '22 DE DE DE';
  if (activite === 'TRAITEUR') return '27 DE DE DE';
  if (activite === 'MOCHIS') return '21 DE DE DE';
  return '';
};

// Classe de valorisation. Depots de production -> 7012, Aire -> 2038. En negoce
// (4/5) : Traiteur -> 2038, Patisseries -> 2030, Mochis -> vide.
export const computeClasseValoDS = ({ usine, type_demande, activite } = {}) => {
  if (['Rivesaltes', 'Bonloc', 'Agen'].includes(usine)) return '7012';
  if (usine === 'Aire') return '2038';
  if (isTypeNegoce(type_demande) && activite === 'TRAITEUR') return '2038';
  if (isTypeNegoce(type_demande) && activite === 'PATISSERIES') return '2030';
  return '';
};

export const computeCentreProfitDS = ({ usine, activite, type_demande, agen_choix } = {}) => {
  if (activite === 'MOCHIS') return '21PF';
  if (usine === 'Aire') return '27TDL';
  if (usine === 'Rivesaltes' || usine === 'Bonloc') return '22PF';
  if (isTypeNegoce(type_demande) && activite === 'PATISSERIES') return '22HA';
  if (isTypeNegoce(type_demande) && activite === 'TRAITEUR') return '27HA';
  if (usine === 'Agen') {
    if (agen_choix === 'Pains surprises') return '27PS';
    if (agen_choix === 'Assortiments ou plateaux') return '27CA';
    if (agen_choix === 'Plaques') return '27PL';
    return '27CA';
  }
  return '';
};

export const computeSecteurDS = (type_marque) => {
  if (type_marque === 'Marque Nationale RHF / Export') return '10';
  if (type_marque === 'Marque Nationale GMS') return '12';
  if (type_marque === 'Marque distributeur') return '15';
  return '';
};
