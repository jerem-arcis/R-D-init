// Regles metier de la DS (Demande Simplifiee), pures et testees. Reutilisees par
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

// Libellé affiché (et non un code) pour le « Code division d'origine » lorsque
// l'usine d'origine est « Produit négoce » : un produit de négoce n'a pas de
// division d'origine. Champ verrouillé côté formulaire, valeur persistée vide.
export const LABEL_DIVISION_ORIGINE_NEGOCE = 'pas de code - usine négoce';

// En négoce, pas de code division d'origine (rien n'est persisté ni poussé).
export const codeDivisionOrigine = (usine) =>
  usine === 'Produit négoce' ? '' : DIVISION_ORIGINE[usine] || '';

// Division de fabrication (celle envoyee a SAP).
export const codeDivisionFabrication = ({ type_demande, usine, agen_type } = {}) => {
  if (isTypeNegoce(type_demande)) return '2820';
  if (usine === 'Agen') return agen_type === 'Faux Frais STEF' ? '2823' : '2847';
  return DIVISION_ORIGINE[usine] || '';
};

// Type de produit SAP (TypeProduit / cr04e_typedeproduit) d'une DS : « Aire » est
// du négoce (NEGO), tout le reste est du produit fini (PFIN). Miroir de la règle
// DE Aire→NEGO/sinon PFIN (cf. computeGroupeAutorisationDE dans deRules.js), mais
// clé sur le NOM de l'usine de fabrication et non sur la division.
export const computeTypeProduitDS = (usineFab) =>
  String(usineFab ?? '').trim() === 'Aire' ? 'NEGO' : 'PFIN';

// ---- Re-déduction inverse (réouverture d'une DS depuis Dataverse) ----
// On ne persiste que les valeurs SAP calculées : on retrouve les saisies à partir
// d'elles. Sert à repeupler les listes déroulantes à la réouverture d'un brouillon.

// code division origine -> nom de l'usine d'origine.
const DIVISION_TO_USINE_ORIGINE = Object.fromEntries(
  Object.entries(DIVISION_ORIGINE).map(([usine, code]) => [code, usine]),
);
export const usineOrigineFromDivision = (code) =>
  DIVISION_TO_USINE_ORIGINE[String(code ?? '').trim()] || '';

// code division fabrication -> usine de fabrication (liste USINES_FABRICATION).
// 2823 (FF STEF) -> Agen ; 2820 (négoce) -> '' (l'usine fab est implicite/type 4-5).
export const usineFabFromDivision = (code) => {
  const c = String(code ?? '').trim();
  if (c === '2886') return 'Bonloc';
  if (c === '2866') return 'Rivesaltes';
  if (c === '2859') return 'Aire';
  if (c === '2847' || c === '2823') return 'Agen';
  return '';
};

// hiérarchie SAP ("22 DE DE DE") -> activité.
export const activiteFromHierarchie = (h) => {
  const head = String(h ?? '').trim().split(/\s+/)[0];
  if (head === '22') return 'PATISSERIES';
  if (head === '27') return 'TRAITEUR';
  if (head === '21') return 'MOCHIS';
  return '';
};

// secteur (10/12/15) -> type de marque.
export const typeMarqueFromSecteur = (s) => {
  const c = String(s ?? '').trim();
  if (c === '10') return 'Marque Nationale RHF / Export';
  if (c === '12') return 'Marque Nationale GMS';
  if (c === '15') return 'Marque distributeur';
  return '';
};

// Agen : type (Surgelé/FF STEF) déduit de la division ; choix déduit du centre profit.
// 2847 est ambigu (Surgelé ou FF Autre) -> on retombe sur « Surgelé » (équivalent en aval).
export const agenTypeFromDivision = (divisionFab) =>
  String(divisionFab ?? '').trim() === '2823' ? 'Faux Frais STEF' : 'Surgelé';
export const agenChoixFromCentre = (centre) => {
  const c = String(centre ?? '').trim();
  if (c === '27PS') return 'Pains surprises';
  if (c === '27CA') return 'Assortiments ou plateaux';
  if (c === '27PL') return 'Plaques';
  return '';
};

// Segments séparés par des TABULATIONS (\t) : format exact du référentiel SAP
// (cf. computeHierarchieDE dans deRules.js).
export const computeHierarchieDS = (activite) => {
  if (activite === 'PATISSERIES') return '22\tDE\tDE';
  if (activite === 'TRAITEUR') return '27\tDE\tDE';
  if (activite === 'MOCHIS') return '21\tDE\tDE';
  return '';
};

// Classe de valorisation DS selon l'usine de fabrication et, en négoce (type 4/5),
// l'activité :
//   Aire                              -> 2038
//   Rivesaltes / Bonloc / Agen        -> 7012
//   négoce (type 4/5) + TRAITEUR      -> 2038
//   négoce (type 4/5) + PATISSERIES   -> 2030
//   sinon                             -> '' (surchargeable manuellement côté formulaire)
export const computeClasseValoDS = ({ usine, type_demande, activite } = {}) => {
  if (usine === 'Aire') return '2038';
  if (usine === 'Rivesaltes' || usine === 'Bonloc' || usine === 'Agen') return '7012';
  if (isTypeNegoce(type_demande)) {
    if (activite === 'TRAITEUR') return '2038';
    if (activite === 'PATISSERIES') return '2030';
  }
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
