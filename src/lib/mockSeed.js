// Pré-remplissage du localStorage avec un exemple de DE + FL liée.
// S'exécute une fois au démarrage de l'app si rien n'a été créé.

const STORAGE_PREFIX = 'mock_db_';
const SEED_FLAG = 'mock_seed_v1';

const uid = () =>
  (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const hasRows = (name) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + name);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) && arr.length > 0;
  } catch {
    return false;
  }
};

const writeRows = (name, rows) => {
  localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(rows));
};

export const seedMockDataIfNeeded = () => {
  if (localStorage.getItem(SEED_FLAG)) return;
  if (hasRows('FicheLancement') || hasRows('DemandeEtude')) {
    localStorage.setItem(SEED_FLAG, '1');
    return;
  }

  const now = new Date().toISOString();
  const deId = uid();
  const ficheId = uid();

  // DE exemple
  const de = {
    id: deId,
    created_date: now,
    updated_date: now,
    code_projet: 'PROJ-2026-0142',
    code_chapeau: 'CHAP-PIZZA-MDD',
    designation: '20 MINI CROQUES ITM',
    type_demande: 'CA Additionnel',
    famille_produit: 'Bouchees aperitives froides',
    marque: 'Marque Distributeur',
    usine_fab: 'Bonloc',
    activite: 'TRAITEUR',
    statut: 'en_traitement',
    service_demandeur: 'Commerce',
    auteur: 'demo@boncolac.local',
  };

  // FL exemple liée à la DE — pré-remplie avec valeurs réalistes côté ADV (sans visas)
  const fiche = {
    id: ficheId,
    created_date: now,
    updated_date: now,
    demande_etude_id: deId,

    // ---- État ----
    etat_global: 'en_attente',
    etape_courante: 1,
    visa_controle_gestion: false,
    visa_supply_chain: false,
    visa_gestion_besoin: false,
    visa_industriel: false,
    visa_commerce: false,
    statut_sap: null,

    // ---- Contrôle de Gestion ----
    code_article: '648900142',
    code_chapeau: 'CHAP-PIZZA-MDD',
    libelle_article: '20 MINI CROQUES ITM',
    code_etude_rd: 'PROJ-2026-0142',
    centre_profit: '0000TR001 - Traiteur',
    date_limite_creation_mm01: '2026-06-15',
    date_envoi_ficher: '2026-05-11',

    // ---- Supply Chain ----
    vl: '01',
    article_prix: '648900142000',
    ancien_numero_article: '648800001',
    dluc_dluo_critique: 45,
    ean_carton: ['13245678901234'],
    ean_couche: ['13245678901241'],
    ean_palette: ['13245678901258'],
    groupe_statistique_article: '04 - Traiteur froid',
    groupe_article: 'AY - MB INTERMARCHE',
    groupe_ristourne: '02 - Marque distributeur',
    groupe_imputation: '01 - Produits fins',
    sites_stockage: ['2886 - Bonloc', '2825 - Olano Montauban'],

    // ---- Gestion du besoin ----
    cle_calcul_lot_usine: 'EX - Lot exact / commande à la demande',
    cle_calcul_lot_stockiste: 'ZN - Niveau de stock cible',
    profil_couverture: 'Interne',
    delai_securite: 21,
    delai_securite_couv_reelle: 14,
    type_approvisionnement: 'E - Fabrication interne (usine)',
    delai_previsionnel_livraison: '5 jours',
    temps_reception_stockiste: '0 jour',

    // ---- Industriel ----
    libelle_etiquette_colis: '20 MINI CROQUES ITM',
    masque_etiquette_colis: 'COLIS_MDD - Marque distributeur',
    designation_client_colis: 'ITM',
    format_date_etiquette_colis: 'JJ/MM/AAAA',
    format_dluo_etiquette_colis: 'MM AAAA',
    type_magasin: '0001',
    eclatement_groupe_marchandise: '00200 - Traiteur',
    type_usine: '2886 - Bonloc',
    type_palette: 'SME80 - Palette 80 x 120 Europe',
    temps_reception_usine: 2,
    duree_vie: 18,
    unite_duree_vie: 'M - Mois',
    uvc_block: { unite: 20, volume: 0.0015, poids_brut: 0.4, poids_net: 0, long: 120, larg: 80, haut: 50 },
    element_block: { unite: 1, volume: 0.0001, poids_brut: 0.02, poids_net: 0, long: 60, larg: 40, haut: 20 },
    couche_block: { unite: 12, volume: 0.018, poids_brut: 4.8, poids_net: 4, long: 1200, larg: 800, haut: 50 },
    colis_block: { unite: 6, volume: 0.009, poids_brut: 2.4, poids_net: 2, long: 400, larg: 300, haut: 50 },
    palette_block: { unite: 96, volume: 1.44, poids_brut: 38.4, poids_net: 36, long: 1200, larg: 800, haut: 1500 },

    // ---- Commerce ----
    statut_lancement: '01 - En cours de création',
    libelle_long_40: '20 MINI CROQUES JAMBON-EMMENTAL ITM',
    libelle_client: '20 MINI CROQUES ITM',
    libelle_par_pays: {
      FR: '20 mini croques jambon-emmental',
      EN: '20 mini ham & cheese croques',
      DE: '20 Mini Schinken-Käse-Croques',
      ES: '20 mini croques jamón-queso',
    },
    fabrication_negoce: 'Fabrication',
    origine_fabrication: '3A - Produit Fini DFINI',
    canaux_distribution: ['GMS', 'Marque distributeur'],
    secteur_activite: '15 - Marques Distrib.',
    marque: 'Marque Distributeur',
    mention_produit: 'Fabriqué en France',
    nomenclature_douaniere: '19059060 - Pâtisseries fraîches',
    biv: '648800001',
    gtin_uvc: '3245678901237',
  };

  writeRows('DemandeEtude', [de]);
  writeRows('FicheLancement', [fiche]);
  localStorage.setItem(SEED_FLAG, '1');
};
