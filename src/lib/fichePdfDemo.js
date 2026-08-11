// Jeu de données d'EXEMPLE pour l'export PDF (fiche « 16 MIGNARDISES APÉR PICARD »,
// reprise du PDF 914201). Sert de repli : quand la fiche courante n'est pas
// suffisamment remplie, l'export génère cet exemple complet plutôt qu'une fiche
// pleine de « — » (utile pour présenter la fonctionnalité).

export const DEMO_FICHE = {
  code_article: '914201',
  code_racine: '9142',
  code_logistique: '914201',
  libelle_article: '16 MIGNARDISES APÉR PICARD',
  libelle_long_40: '16 MIGNARDISES APÉR PICARD',
  libelle_caisse: '0',
  code_article_client: '10108',
  statut_lancement: 'Création nouvel article',
  origine_fabrication: '2859 · TerreDesLys',
  marque: 'PICARD',

  // Marketing
  pays: '3',
  cnuf_cnud: '27016',
  code_produit: '010108',
  coeff: '0,160',
  ean_carton: ['0327016109429'],
  ean_couche: [],
  ean_palette: ['0327016210782'],

  // Réseaux / stockage
  reseaux: ['Dégagement', 'Transfert', "S/Boul'Pat G"],
  sites_stockage: ['Olano Carvin'],

  // Durée / contrat / ancien code
  duree_vie: 548,
  unite_duree_vie: 'J - Jours',
  contrat_date: '',
  ancien_numero_article: '8779',

  // Classification
  grande_famille: '27',
  famille: 'B4',
  sous_famille: '10',
  groupe: 'BO',
  fam_arrangement: '',
  libelle_classification: 'TRAITEUR / BOUCHÉES APÉRITIVES FROIDES / APÉRITIF · COCKTAIL SALÉ / BOUCHÉES GMS ET FREEZER',

  // Définition
  definition_produit: '21/09/26 · Nouvelles recettes - Nouveau code étui : 5/6 cls · vernis ACHB',

  // Groupements SAP
  secteur_activite: '15 · Marques Distrib.',
  groupe_marchandises: 'PF-H',
  agrement: '',
  groupe_statistique_article: 'BB-MB PICARD',
  couv: '',
  ancien_similaire: '',
  nomenclature_douaniere: '21069098 · Prép. alim. divers (sans pain)',
  centre_profit: '27TDL',

  // Physique UV (valeurs du papier : ml / kg / cm)
  uvc_block: { volume: 0, poids_net: '0,16', poids_brut: '0,203', long: '18,1', larg: '14,4', haut: '4,5' },

  // Logistique
  type_palette: 'SME80 · Palette 80 × 120 Europe',
  nb_ue_uc: 16,
  nb_uc_ue: 10,
  nb_uc_palette: 900,
  nb_cartons_couche: 15,
  nb_couches_palette: 6,
  nb_cartons_palette: 90,
  hauteur_couche: '24,3',
  hauteur_palette: '160,8',
  nb_cartons_cheminee: 0,
  palette_block: { poids_brut: '2,2' },
  colis_block: { long: '38,8', larg: '15,8', haut: '24,3' },

  // Dates
  date_envoi_ficher: '2026-05-18',
  date_limite_creation_mm01: '2026-09-21',

  // Validations (1 signé pour l'exemple)
  visa_supply_chain: true,
  visa_supply_chain_date: '2026-06-20',
};

export const DEMO_DE = { qte_previsionnelle_annuelle: 170000 };

const isEmpty = (v) =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0);

// Une fiche est jugée « assez remplie » pour un rendu réel si elle porte ces
// champs clés (présents dans le modèle app). Sinon → exemple.
export function isFicheComplete(fiche) {
  if (!fiche) return false;
  return (
    !isEmpty(fiche.libelle_long_40) &&
    !isEmpty(fiche.marque) &&
    (!isEmpty(fiche.ean_carton) || !isEmpty(fiche.colis_block && fiche.colis_block.gtin)) &&
    !isEmpty(fiche.secteur_activite) &&
    !isEmpty(fiche.uvc_block && fiche.uvc_block.long)
  );
}

// Choisit la source de données du PDF : la vraie fiche si elle est assez remplie,
// sinon le jeu d'exemple. Renvoie { fiche, de, isDemo }.
export function pickPdfSource(fiche, de) {
  if (isFicheComplete(fiche)) return { fiche, de, isDemo: false };
  return { fiche: DEMO_FICHE, de: DEMO_DE, isDemo: true };
}
