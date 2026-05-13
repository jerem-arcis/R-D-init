// Schéma de champs FL (Fiche de Lancement)
// Listes déroulantes, mapping DE→FL, regroupements, helpers.

// ---------- Listes déroulantes ----------

export const CENTRES_PROFIT = [
  '0000PA001 - Pâtisseries',
  '0000PA002 - Pâtisseries McDo',
  '0000TR001 - Traiteur',
  '0000TR002 - Pain surprise',
  '0000MO001 - Mochis',
  '0000NE001 - Négoce',
];

export const SITES_STOCKAGE = [
  '2820 - Boncolac Négoce',
  '2825 - Olano Montauban',
  '2824 - Olano Wasens',
  '2847 - Agen',
  '2859 - Aire',
  '2866 - Rivesaltes',
  '2886 - Bonloc',
];

export const GROUPES_STATISTIQUE_ARTICLE = [
  '01 - Pâtisseries individuelles',
  '02 - Pâtisseries familiales',
  '03 - Traiteur chaud',
  '04 - Traiteur froid',
  '05 - Pain surprise',
  '06 - Mochis',
];

export const GROUPES_ARTICLE = [
  'AY - MB INTERMARCHE',
  'AZ - MB CARREFOUR',
  'BA - MN BONCOLAC',
  'BB - RHF',
  'BC - EXPORT',
];

export const GROUPES_RISTOURNE = [
  '01 - Standard',
  '02 - Marque distributeur',
  '03 - Export',
  '04 - RHF',
];

export const GROUPES_IMPUTATION = [
  '01 - Produits fins',
  '02 - Produits courants',
  '03 - Produits négoce',
  '04 - Produits export',
];

export const CLES_CALCUL_LOT = [
  'EX - Lot exact / commande à la demande',
  'ZN - Niveau de stock cible',
  'WB - Hebdomadaire',
  'MB - Mensuel',
  'TB - Quotidien',
];

export const PROFILS_COUVERTURE = [
  'Interne',
  'Négoce',
];

export const TYPES_APPROVISIONNEMENT = [
  'E - Fabrication interne (usine)',
  'F - Approvisionnement externe (stockage)',
];

export const ECLATEMENTS_GROUPE_MARCHANDISE = [
  '00100 - Pâtisseries',
  '00200 - Traiteur',
  '00300 - Mochis',
  '00400 - Négoce',
];

export const TYPES_USINE = [
  '2847 - Agen',
  '2859 - Aire',
  '2866 - Rivesaltes',
  '2886 - Bonloc',
  '2820 - Négoce',
];

export const TYPES_PALETTE = [
  'SME80 - Palette 80 x 120 Europe',
  'SME100 - Palette 100 x 120',
  'SMD80 - Demi-palette 80 x 60',
  'PND - Palette perdue',
];

export const MASQUES_ETIQUETTE_COLIS = [
  'COLIS_STD - Standard 100x150',
  'COLIS_MDD - Marque distributeur',
  'COLIS_EXP - Export',
  'COLIS_RHF - RHF',
];

export const UNITES_DUREE_VIE = [
  'J - Jours',
  'S - Semaines',
  'M - Mois',
  'A - Années',
];

export const STATUTS_LANCEMENT = [
  '01 - En cours de création',
  '02 - Validé pour lancement',
  '03 - Lancé',
  '04 - Suspendu',
  '99 - Archivé',
];

export const FABRICATION_NEGOCE = [
  'Fabrication',
  'Négoce',
];

export const ORIGINES_FABRICATION = [
  '3A - Produit Fini DFINI',
  '3B - Semi-fini',
  '3C - Négoce import',
  '3D - Sous-traitance',
];

export const CANAUX_DISTRIBUTION = [
  'GMS',
  'RHF',
  'Export',
  'Marque distributeur',
  'BtoB',
  'E-commerce',
];

export const SECTEURS_ACTIVITE = [
  '10 - Marque Nationale GMS',
  '15 - Marques Distrib.',
  '20 - RHF / Export',
  '30 - BtoB',
];

export const MARQUES = [
  'Boncolac',
  'Boncolac Traiteur',
  'Marque Distributeur',
  'Marque RHF',
  'Marque Export',
];

export const NOMENCLATURES_DOUANIERES = [
  '19053100 - Biscuits',
  '19059060 - Pâtisseries fraîches',
  '21069098 - Préparations alimentaires',
  '19059070 - Autres pâtisseries',
];

export const MENTIONS_PRODUIT = [
  'Fabriqué en France',
  'Origine France',
  'Made in EU',
  'Aucune',
];

export const PAYS_LIBELLES = [
  { code: 'FR', label: 'Français' },
  { code: 'EN', label: 'Anglais' },
  { code: 'DE', label: 'Allemand' },
  { code: 'ES', label: 'Espagnol' },
  { code: 'IT', label: 'Italien' },
  { code: 'NL', label: 'Néerlandais' },
  { code: 'PT', label: 'Portugais' },
];

// ---------- Mapping DE → FL ----------
// Quels champs de la FL sont pré-remplis depuis la DE associée.
export const CHAMPS_DEPUIS_DE = {
  libelle_article: { source: 'designation', label: 'Désignation produit DE' },
  code_etude_rd: { source: 'code_projet', label: 'Code projet DE' },
  code_chapeau: { source: 'code_chapeau', label: 'Code chapeau DE' },
};

// Récupère la valeur héritée de la DE pour un champ FL
export const getValueFromDE = (de, ficheField) => {
  if (!de) return null;
  const mapping = CHAMPS_DEPUIS_DE[ficheField];
  if (!mapping) return null;
  return de[mapping.source] ?? null;
};

// ---------- Helpers ----------

// Détermine si une section est verrouillée (visa précédent absent)
export const isSectionLocked = (sectionKey, fiche) => {
  switch (sectionKey) {
    case 'controle_gestion':
      return false;
    case 'supply_chain':
      return !fiche.visa_controle_gestion;
    case 'gestion_besoin':
      return !fiche.visa_supply_chain;
    case 'industriel':
      return !fiche.visa_gestion_besoin;
    case 'commerce':
      return !fiche.visa_industriel;
    default:
      return false;
  }
};

// Section éditable = pas verrouillée ET pas encore visée
export const isSectionEditable = (sectionKey, fiche) => {
  if (isSectionLocked(sectionKey, fiche)) return false;
  const visaField = {
    controle_gestion: 'visa_controle_gestion',
    supply_chain: 'visa_supply_chain',
    gestion_besoin: 'visa_gestion_besoin',
    industriel: 'visa_industriel',
    commerce: 'visa_commerce',
  }[sectionKey];
  return !fiche[visaField];
};

// ---------- Ownership par champ (pour V2 fiche unique) ----------
// Ordre du workflow : CG → SC → GB → IND → COM
export const WORKFLOW_ORDER = ['cg', 'sc', 'gb', 'ind', 'com'];

export const OWNER_META = {
  cg: { label: 'Contrôle Gestion', short: 'CG', color: 'violet', visaField: 'visa_controle_gestion' },
  sc: { label: 'Supply Chain', short: 'SC', color: 'sky', visaField: 'visa_supply_chain' },
  gb: { label: 'Gestion Besoin', short: 'GB', color: 'emerald', visaField: 'visa_gestion_besoin' },
  ind: { label: 'Industriel', short: 'IND', color: 'amber', visaField: 'visa_industriel' },
  com: { label: 'Commerce', short: 'COM', color: 'rose', visaField: 'visa_commerce' },
};

// Mapping : champ → service propriétaire
export const FIELD_OWNERS = {
  // CG
  code_article: 'cg',
  code_chapeau: 'cg',
  libelle_article: 'cg',
  code_etude_rd: 'cg',
  centre_profit: 'cg',
  date_limite_creation_mm01: 'cg',
  date_envoi_ficher: 'cg',

  // SC
  vl: 'sc',
  ean_carton: 'sc',
  ean_couche: 'sc',
  ean_palette: 'sc',
  groupe_statistique_article: 'sc',
  groupe_article: 'sc',
  groupe_ristourne: 'sc',
  groupe_imputation: 'sc',
  article_prix: 'sc',
  sites_stockage: 'sc',
  dluc_dluo_critique: 'sc',
  ancien_numero_article: 'sc',

  // GB
  cle_calcul_lot_usine: 'gb',
  cle_calcul_lot_stockiste: 'gb',
  profil_couverture: 'gb',
  delai_securite: 'gb',
  delai_securite_couv_reelle: 'gb',
  type_approvisionnement: 'gb',
  delai_previsionnel_livraison: 'gb',
  temps_reception_stockiste: 'gb',

  // IND
  libelle_etiquette_colis: 'ind',
  masque_etiquette_colis: 'ind',
  designation_client_colis: 'ind',
  eclatement_groupe_marchandise: 'ind',
  type_usine: 'ind',
  type_palette: 'ind',
  uvc_block: 'ind',
  element_block: 'ind',
  couche_block: 'ind',
  colis_block: 'ind',
  palette_block: 'ind',
  duree_vie: 'ind',
  unite_duree_vie: 'ind',
  temps_reception_usine: 'ind',
  format_date_etiquette_colis: 'ind',
  format_dluo_etiquette_colis: 'ind',
  type_magasin: 'ind',

  // COM
  statut_lancement: 'com',
  libelle_long_40: 'com',
  libelle_client: 'com',
  libelle_par_pays: 'com',
  fabrication_negoce: 'com',
  origine_fabrication: 'com',
  canaux_distribution: 'com',
  secteur_activite: 'com',
  marque: 'com',
  mention_produit: 'com',
  biv: 'com',
  nomenclature_douaniere: 'com',
  gtin_uvc: 'com',
};

// Étape courante : premier visa non posé. Renvoie null si tous visés ou fiche null.
export const getCurrentOwner = (fiche) => {
  if (!fiche) return null;
  for (const owner of WORKFLOW_ORDER) {
    if (!fiche[OWNER_META[owner].visaField]) return owner;
  }
  return null;
};

// Champ éditable : son owner est l'étape courante
export const isFieldEditable = (fieldName, fiche) => {
  const owner = FIELD_OWNERS[fieldName];
  if (!owner) return false;
  if (fiche.statut_sap === 'Création SAP effectuée') return false;
  return getCurrentOwner(fiche) === owner;
};

// État d'un champ : 'editable' (étape courante), 'validated' (visa posé), 'future' (verrouillé)
export const getFieldState = (fieldName, fiche) => {
  const owner = FIELD_OWNERS[fieldName];
  if (!owner) return 'future';
  if (fiche.statut_sap === 'Création SAP effectuée') return 'validated';
  const current = getCurrentOwner(fiche);
  if (!current) return 'validated';
  if (owner === current) return 'editable';
  const ownerIdx = WORKFLOW_ORDER.indexOf(owner);
  const currentIdx = WORKFLOW_ORDER.indexOf(current);
  return ownerIdx < currentIdx ? 'validated' : 'future';
};
