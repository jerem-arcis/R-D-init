// Règles de gestion de la Demande d'Étude (DE) pilotées par la DIVISION (usine de
// fabrication) et le RÉSEAU. Fonctions pures : testées dans deRules.test.js et
// réutilisées à l'envoi vers SAP (les valeurs calculées alimentent formData).

// Division (code SAP) -> usine de fabrication. Seuls ces 4 sites sont autorisés
// en DE (BONLOC, RIVESALTES, AGEN, AIRE) — la liste Division est restreinte à eux.
export const DE_DIVISIONS = {
  '2886': 'Bonloc',
  '2866': 'Rivesaltes',
  '2847': 'Agen',
  '2859': 'Aire',
};

export const DE_DIVISION_CODES = Object.keys(DE_DIVISIONS);

// Nom du site beCPG (bcpg:plants[].cm:name) -> code division. Renvoie '' si inconnu.
const PLANT_NAME_TO_CODE = {
  BONLOC: '2886',
  RIVESALTES: '2866',
  AGEN: '2847',
  AIRE: '2859',
};

export const divisionCodeFromPlant = (name) =>
  PLANT_NAME_TO_CODE[String(name ?? '').trim().toUpperCase()] || '';

export const usineFromDivision = (code) => DE_DIVISIONS[String(code ?? '').trim()] || '';

// Hiérarchie produit famille selon le métier de l'usine :
// Bonloc/Rivesaltes (Pâtisseries) -> 22, Agen/Aire (Traiteur) -> 27.
export const computeHierarchieDE = (code) => {
  const u = usineFromDivision(code);
  if (u === 'Bonloc' || u === 'Rivesaltes') return '22 DE DE DE';
  if (u === 'Agen' || u === 'Aire') return '27 DE DE DE';
  return '';
};

// Classe de valorisation : dépôts de production (Bonloc, Rivesaltes, Agen) -> 7012 ;
// Aire force 2038.
export const computeClasseValoDE = (code) => {
  const u = usineFromDivision(code);
  if (u === 'Aire') return '2038';
  if (u === 'Bonloc' || u === 'Rivesaltes' || u === 'Agen') return '7012';
  return '';
};

// Centre de profit : Aire -> 27TDL, Rivesaltes/Bonloc -> 22PF.
// Agen (et inconnu) -> '' : choix libre laissé à l'utilisateur.
export const computeCentreProfitDE = (code) => {
  const u = usineFromDivision(code);
  if (u === 'Aire') return '27TDL';
  if (u === 'Bonloc' || u === 'Rivesaltes') return '22PF';
  return '';
};

// Groupe article (division) selon l'usine :
// Agen -> PF-AS (défaut MODIFIABLE + avertissement surgelé), Bonloc -> PF-B,
// Rivesaltes -> PF-F (verrouillés). Aire (et inconnu) -> '' : choix libre.
export const computeGroupeArticleDE = (code) => {
  const u = usineFromDivision(code);
  if (u === 'Agen') return 'PF-AS';
  if (u === 'Bonloc') return 'PF-B';
  if (u === 'Rivesaltes') return 'PF-F';
  return '';
};

// Valeur VERROUILLÉE (lecture seule) du groupe article : uniquement Bonloc/Rivesaltes.
// Agen et Aire renvoient '' car leur groupe article reste modifiable (Agen part de
// PF-AS par défaut, Aire est entièrement libre).
export const computeGroupeArticleLockedDE = (code) => {
  const u = usineFromDivision(code);
  if (u === 'Bonloc') return 'PF-B';
  if (u === 'Rivesaltes') return 'PF-F';
  return '';
};

// L'usine Agen impose un message « vérifiez que le produit est bien surgelé ».
export const needsSurgeleWarningDE = (code) => usineFromDivision(code) === 'Agen';

// Réseau -> secteur d'activité (code SAP 10/12/15).
export const RESEAU_TO_SECTEUR = {
  MDD: '15',
  HSFC: '15',
  GDM: '12',
  RMN: '10',
  RMD: '15',
  BPT_GMS: '10',
  BPT_RHF: '10',
  'EXPORT RHF': '10',
  'EXPORT RETAIL': '15',
};

export const computeSecteurFromReseau = (reseau) =>
  RESEAU_TO_SECTEUR[String(reseau ?? '').trim().toUpperCase()] || '';

// Axe stratégique : limité à ces 2 choix pour la DE.
export const AXES_STRATEGIQUES_DE = ['Budget', 'Hors budget'];
