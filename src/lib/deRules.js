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

// Code division -> libellé usine affiché dans la LISTE / le FILTRE des demandes
// (DemandesEtude). Superset de DE_DIVISIONS, sans polluer la liste des sites de
// fabrication DE : ajoute Agen Faux Frais STEF (2823, même site qu'Agen 2847) et
// le négoce (2820, entrepôt — usine d'origine « Produit négoce » côté DS). Les
// libellés sont ceux du dropdown usine (USINES_OPTIONS) pour que le filtre matche.
export const USINE_LABELS_BY_DIVISION = {
  ...DE_DIVISIONS,
  '2823': 'Agen',
  '2820': 'Produit négoce',
};

export const usineLabelFromDivision = (code) =>
  USINE_LABELS_BY_DIVISION[String(code ?? '').trim()] || '';

// Hiérarchie produit famille selon le métier de l'usine :
// Bonloc/Rivesaltes (Pâtisseries) -> 22, Agen/Aire (Traiteur) -> 27.
// IMPORTANT : les segments sont séparés par des TABULATIONS (\t), pas des
// espaces — c'est le format exact du référentiel SAP (cr04e_hierarchieproduits).
// Le rapprochement liste déroulante / lookup Dataverse se fait par égalité
// stricte : une valeur à espaces ne matcherait aucune ligne du référentiel.
export const computeHierarchieDE = (code) => {
  const u = usineFromDivision(code);
  if (u === 'Bonloc' || u === 'Rivesaltes') return '22\tDE\tDE';
  if (u === 'Agen' || u === 'Aire') return '27\tDE\tDE';
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
// Agen (et inconnu) -> '' : déterminé par « Agen - choix », cf. computeCentreProfitAgenDE.
export const computeCentreProfitDE = (code) => {
  const u = usineFromDivision(code);
  if (u === 'Aire') return '27TDL';
  if (u === 'Bonloc' || u === 'Rivesaltes') return '22PF';
  return '';
};

// Cas Agen : le centre de profit n'est pas saisi librement mais DÉDUIT du choix
// « Agen - choix » (même logique que la DS, cf. computeCentreProfitDS). Les codes
// obtenus (27CA/27PS/27PL) sont ceux autorisés par le référentiel PF-AS|27.
export const AGEN_CHOIX_CENTRE = {
  'Assortiments ou plateaux': '27CA',
  'Pains surprises': '27PS',
  Plaques: '27PL',
};
export const computeCentreProfitAgenDE = (choix) =>
  AGEN_CHOIX_CENTRE[String(choix ?? '').trim()] || '';

// Code d'origine (VL) : valide s'il fait 4 OU 6 chiffres (règle métier — 8 n'est
// plus accepté). Sert à la validation avant « Demander mon code » / envoi SAP.
export const isCodeOrigineValide = (code) => /^\d{4}(\d{2})?$/.test(String(code ?? '').trim());

// Profil de fabrication répétitive (SAP) selon la division (usine) :
// Agen -> Z006, Bonloc -> Z008, Rivesaltes -> Z010. 2823 = Agen Faux Frais STEF
// (traité comme Agen). Aire, négoce et inconnu -> '' (pas de profil).
export const computeProfilFabricRepetDE = (code) => {
  const c = String(code ?? '').trim();
  if (c === '2847' || c === '2823') return 'Z006';
  if (c === '2886') return 'Z008';
  if (c === '2866') return 'Z010';
  return '';
};

// Groupe d'autorisation (MARA-BEGRU) selon la division : Aire (2859) → NEGO, sinon PFIN.
export const computeGroupeAutorisationDE = (code) =>
  String(code ?? '').trim() === '2859' ? 'NEGO' : 'PFIN';

// Groupe de frais généraux selon la division : Aire (2859) → NEGO, sinon FG.
// (Côté DS, le groupe de frais généraux est toujours « NEGO » — géré dans CreerDE.)
export const computeGroupeFraisGenerauxDE = (code) =>
  String(code ?? '').trim() === '2859' ? 'NEGO' : 'FG';

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

// Agen et Aire imposent un message « vérifiez que le produit est bien surgelé ».
export const needsSurgeleWarningDE = (code) => ['Agen', 'Aire'].includes(usineFromDivision(code));

// Préfixe qui restreint la liste « Groupe article (division) » selon l'usine :
// Agen -> PF-A…, Aire -> PF-H… ; '' = pas de restriction (liste PF complète).
export const prefixeGroupeArticleDE = (code) => {
  const u = usineFromDivision(code);
  if (u === 'Agen') return 'PF-A';
  if (u === 'Aire') return 'PF-H';
  return '';
};

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

// Ramène un axe stratégique à sa forme canonique (Budget / Hors budget) en
// ignorant la casse et les espaces (beCPG/import renvoient parfois « BUDGET »).
// Valeur vide → renvoyée telle quelle ; valeur hors liste → conservée inchangée.
export const normalizeAxeStrategique = (value) => {
  const s = String(value ?? '').trim();
  if (!s) return value;
  const match = AXES_STRATEGIQUES_DE.find((a) => a.toLowerCase() === s.toLowerCase());
  return match || value;
};

// ---- Centre de profit & classe de valorisation pilotés par F et J ----
// F = famille du « Groupe article (division) » (PF-E, PF-H, PF-B, PF-AF, PF-AS, PF-F).
// J = préfixe de la hiérarchie produit (21, 22, 27).
// Ces règles restreignent les listes déroulantes aux valeurs autorisées :
// une seule valeur → figée ; plusieurs → seuls ces choix sont proposés ;
// [] → aucune contrainte (liste complète).

// « PF-AS-MBSA- PFinis Agen Surgel » → « PF-AS » ; « PF-B » → « PF-B ». '' si non PF.
export const familleGroupeArticle = (value) => {
  const parts = String(value ?? '').toUpperCase().split('-').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2 || parts[0] !== 'PF') return '';
  return `PF-${parts[1]}`;
};

// « 22\tDE\tDE » → « 22 ». Renvoie '' si aucun préfixe à 2 chiffres.
export const hierarchiePrefix = (hierarchie) => {
  const m = String(hierarchie ?? '').match(/\d{2}/);
  return m ? m[0] : '';
};

// Centres de profit autorisés selon F et J.
//  PF-E : J22→22HA · J27→27HA        | PF-H : J21→21PF · J27→27TDL
//  PF-B : J22→22PF                   | PF-AF/PF-AS : J27→27CA/27PL/27PS (selon gamme)
//  PF-F : J22→22PF ou 22HA (étape 5)
const CENTRES_PROFIT_TABLE = {
  'PF-E|22': ['22HA'],
  'PF-E|27': ['27HA'],
  'PF-H|21': ['21PF'],
  'PF-H|27': ['27TDL'],
  'PF-B|22': ['22PF'],
  'PF-AF|27': ['27CA', '27PL', '27PS'],
  'PF-AS|27': ['27CA', '27PL', '27PS'],
  'PF-F|22': ['22PF', '22HA'],
};
export const centresProfitAutorises = (F, J) => CENTRES_PROFIT_TABLE[`${F}|${J}`] || [];

// Classes de valorisation autorisées selon F et J.
//  PF-E & J22→2030 · PF-E & J27→2038 | PF-H (J21 ou J27)→2038
//  PF-B / PF-AF / PF-AS → 7012        | PF-F : non spécifié → aucune contrainte
export const classesValoAutorisees = (F, J) => {
  if (F === 'PF-E') return J === '22' ? ['2030'] : J === '27' ? ['2038'] : [];
  if (F === 'PF-H') return (J === '21' || J === '27') ? ['2038'] : [];
  if (F === 'PF-B' || F === 'PF-AF' || F === 'PF-AS') return ['7012'];
  return [];
};
