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

// MVKE-VERSG — Groupe statistique article (nouveau champ FL).
// ⚠️ Valeurs provisoires : à remplacer par le référentiel SAP réel.
export const GROUPES_STATISTIQUE = [
  '1 - Groupe article 1',
  '2 - Groupe article 2',
  '3 - Groupe article 3',
];

// MARA-XCHPF — Gestion par lots (nouveau champ FL). Indicateur oui/non.
export const GESTION_PAR_LOTS = ['Oui', 'Non'];

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
  'Z004 - Carcassonne',
  'Z006 - Agen-St Médard',
  'Z008 - Bonloc',
  'Z010 - Rivesaltes',
  'Z011 - Montblanc',
];

export const TYPES_PALETTE = [
  'SME80 - Palette 80 x 120 Europe',
  'SMN80 - Palette 80 x 120 NIMP 15',
  'SMC80 - Palette 80 x 120 CHEP',
  'SM100 - Palette 100 x 120',
  'SMC10 - Palette 100 x 120 CHEP',
  'SMN10 - Palette 100 x 120 NIMP 15',
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

// Durées de vie standard (valeurs du référentiel SAP).
export const DUREES_VIE = [
  '6',
  '9',
  '12',
  '15',
  '18',
  '21',
  '24',
  '35',
  '36',
  '270',
  '365',
  '456',
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

export const SPECIFICITES_PRODUIT = [
  'Surgelé',
  'Frais',
  'Ambiant',
  'Sec',
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
// Écriture simultanée : aucune section n'est verrouillée par l'ordre des visas.
// Chaque service peut renseigner sa section en parallèle (le visa de chaque
// section reste indépendant et fige sa section une fois posé).
export const isSectionLocked = () => false;

// Section éditable = pas verrouillée ET pas encore visée
export const isSectionEditable = (sectionKey, fiche) => {
  if (isSectionLocked(sectionKey, fiche)) return false;
  const visaField = {
    supply_chain: 'visa_supply_chain',
    gestion_besoin: 'visa_gestion_besoin',
    industriel: 'visa_industriel',
    commerce: 'visa_commerce',
  }[sectionKey];
  return !fiche[visaField];
};

// ---------- Identification (bandeau d'en-tête, hors visa) ----------
// Champs qui initialisent l'article : renseignés à la création (code article,
// libellés, code chapeau, centre profit, dates). Ils ne dépendent d'aucune des 4
// sections et restent éditables tant que l'article n'est pas créé dans SAP.
export const IDENTIFICATION_FIELDS = [
  'code_article',
  'libelle_article',
  'code_chapeau',
  'code_etude_rd',
  'centre_profit',
  'date_demande',
  'date_limite_creation_mm01',
  'date_envoi_ficher',
];

// ---------- Ownership par champ (pour les 4 sections) ----------
// 4 sections « métier » (= les 4 onglets du fichier) : SC → GB → IND → COM.
// Chacune pose son visa indépendamment (écriture simultanée, pas de cheminement).
export const WORKFLOW_ORDER = ['sc', 'gb', 'ind', 'com'];

export const OWNER_META = {
  sc: { label: 'Supply Chain', short: 'SC', color: 'sky', visaField: 'visa_supply_chain' },
  gb: { label: 'Gestion Besoin', short: 'GB', color: 'emerald', visaField: 'visa_gestion_besoin' },
  ind: { label: 'Industriel', short: 'IND', color: 'amber', visaField: 'visa_industriel' },
  com: { label: 'Commerce', short: 'COM', color: 'rose', visaField: 'visa_commerce' },
};

// Mapping : champ → section propriétaire (les champs d'identification ne sont pas
// listés ici : ils sont gérés par le bandeau IDENTIFICATION_FIELDS).
// Owners alignés sur la colonne « Responsable » du fichier Champs FL.xlsx.
export const FIELD_OWNERS = {
  // SC (SupplyChain)
  vl: 'sc',
  ean_carton: 'sc',
  ean_couche: 'sc',
  ean_palette: 'sc',
  ean_manuel: 'sc',
  groupement_articles: 'sc',
  groupe_article: 'sc',
  groupe_ristourne: 'sc',
  groupe_imputation: 'sc',
  groupe_statistique_article: 'sc', // MVKE-VERSG (nouveau)
  gestion_par_lots: 'sc',           // MARA-XCHPF (nouveau — responsable à confirmer)
  article_prix: 'sc',
  dluc_dluo_critique: 'sc',

  // GB (Gestion des besoins) — dédoublement usine / stockiste
  cle_calcul_lot_usine: 'gb',
  cle_calcul_lot_stockiste: 'gb',
  profil_couverture_usine: 'gb',
  profil_couverture_stockiste: 'gb',
  delai_securite_usine: 'gb',
  delai_securite_stockiste: 'gb',
  delai_securite_couv_reelle_usine: 'gb',
  delai_securite_couv_reelle_stockiste: 'gb',
  type_approvisionnement_usine: 'gb',
  type_approvisionnement_stockiste: 'gb',
  appro_special: 'gb',
  delai_previsionnel_livraison: 'gb',
  temps_reception_stockiste: 'gb',

  // IND (Industriel)
  libelle_etiquette_colis: 'ind',
  masque_etiquette_colis: 'ind',
  designation_client_colis: 'ind',
  eclatement_groupe_marchandise: 'ind',
  groupe_marchandises: 'ind',
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
  biv: 'ind',                 // déplacé depuis COM (responsable Industriel)
  ancien_numero_article: 'ind', // déplacé depuis SC (responsable Industriel)

  // COM (Commerce)
  statut_lancement: 'com',
  libelle_long_40: 'com',
  libelle_caisse: 'com',
  libelle_client: 'com',
  libelle_par_pays: 'com',
  specificite_produit: 'com',
  hierarchie_produit: 'com',
  fabrication_negoce: 'com',
  origine_fabrication: 'com',
  canaux_distribution: 'com',
  secteur_activite: 'com',
  marque: 'com',
  mention_produit: 'com',
  nomenclature_douaniere: 'com',
  sites_stockage: 'com',      // déplacé depuis SC (responsable Commerce)
};

// Étape courante : premier visa non posé. Renvoie null si tous visés ou fiche null.
export const getCurrentOwner = (fiche) => {
  if (!fiche) return null;
  for (const owner of WORKFLOW_ORDER) {
    if (!fiche[OWNER_META[owner].visaField]) return owner;
  }
  return null;
};

// Écriture simultanée : un champ est éditable tant que sa section n'a pas posé
// son visa (et que SAP n'est pas créé), indépendamment de l'ordre du workflow.
export const isFieldEditable = (fieldName, fiche) => {
  const owner = FIELD_OWNERS[fieldName];
  if (!owner) return false;
  if (fiche.statut_sap === 'Création SAP effectuée') return false;
  return !fiche[OWNER_META[owner].visaField];
};

// État d'un champ : 'editable' (section non visée) ou 'validated' (visa posé / SAP créé).
export const getFieldState = (fieldName, fiche) => {
  const owner = FIELD_OWNERS[fieldName];
  if (!owner) return 'future';
  if (fiche.statut_sap === 'Création SAP effectuée') return 'validated';
  return fiche[OWNER_META[owner].visaField] ? 'validated' : 'editable';
};
