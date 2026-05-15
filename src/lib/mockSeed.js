// Pré-remplissage du localStorage avec des exemples de DE + FL liées.
// S'exécute une fois au démarrage de l'app si rien n'a été créé.

const STORAGE_PREFIX = 'mock_db_';
const SEED_FLAG = 'mock_seed_v2';

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

const isoDateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const buildSeedData = () => {
  const now = new Date().toISOString();

  // Profils de fiches répartis dans tous les buckets pour montrer la valeur du dashboard.
  // Chaque échantillon = une DE complète et validée + une FL liée à différentes étapes du workflow.
  const samples = [
    {
      offsetJours: -2,
      visas: { visa_controle_gestion: true, visa_supply_chain: true },
      ean: '3760000648201',
      code: '648900201',
      libelle: '12 BOUCHEES SAUMON',
      designation: '12 BOUCHEES SAUMON CITRON',
      famille: 'Bouchees aperitives froides',
      marque: 'Marque Distributeur',
      typeMarque: 'Marque distributeur',
      reseau: 'MDD',
      typeDemande: 'CA Additionnel',
      typeDe: 'de',
      axe: 'Business Courant',
      demandeur: 'Marie Dupont',
      service: 'Commerce',
      usine: 'Bonloc',
      activite: 'TRAITEUR',
      categorie: 'Permanent',
      typeLogistique: 'Franco',
      poidsOp: 240, poidsBrut: 280, poidsNet: 240, volume: 1.2, unite: 'kg',
    },
    {
      offsetJours: 1,
      visas: { visa_controle_gestion: true, visa_supply_chain: true, visa_gestion_besoin: true, visa_industriel: true },
      ean: '3760000648202',
      code: '648900202',
      libelle: '20 MINI CROQUES ITM',
      designation: '20 MINI CROQUES ITM',
      famille: 'Croques traiteur',
      marque: 'Marque Distributeur',
      typeMarque: 'Marque distributeur',
      reseau: 'MDD',
      typeDemande: 'CA Additionnel',
      typeDe: 'de',
      axe: 'Plan produits inscrits au budget',
      demandeur: 'Julien Martin',
      service: 'Commerce',
      usine: 'Bonloc',
      activite: 'TRAITEUR',
      categorie: 'Permanent',
      typeLogistique: 'Franco',
      poidsOp: 320, poidsBrut: 360, poidsNet: 320, volume: 1.5, unite: 'kg',
    },
    {
      offsetJours: 3,
      visas: { visa_controle_gestion: true, visa_supply_chain: true, visa_gestion_besoin: true },
      ean: '3760000648203',
      code: '648900203',
      libelle: 'TARTE FLAMBEE FROMAGE',
      designation: 'TARTE FLAMBEE FROMAGE LIDL',
      famille: 'Entrees chaudes',
      marque: 'Marque Distributeur',
      typeMarque: 'Marque distributeur',
      reseau: 'MDD',
      typeDemande: 'Retravail Produit - CA existant',
      typeDe: 'de',
      axe: 'Développement de nos marques',
      demandeur: 'Sophie Bernard',
      service: 'Marketing',
      usine: 'Bonloc',
      activite: 'TRAITEUR',
      categorie: 'Saisonnier',
      typeLogistique: 'Départ',
      poidsOp: 400, poidsBrut: 440, poidsNet: 400, volume: 1.8, unite: 'kg',
    },
    {
      offsetJours: 6,
      visas: { visa_controle_gestion: true, visa_supply_chain: true },
      ean: '3760000648204',
      code: '648900204',
      libelle: '6 FEUILLETES POULET',
      designation: '6 FEUILLETES POULET CURRY',
      famille: 'Bouchees aperitives chaudes',
      marque: 'Boncolac Traiteur',
      typeMarque: 'Marque Nationale GMS',
      reseau: 'GDM',
      typeDemande: 'CA Additionnel',
      typeDe: 'de',
      axe: 'Business Courant',
      demandeur: 'Paul Lefebvre',
      service: 'Commerce',
      usine: 'Bonloc',
      activite: 'TRAITEUR',
      categorie: 'Permanent',
      typeLogistique: 'Franco',
      poidsOp: 180, poidsBrut: 210, poidsNet: 180, volume: 0.9, unite: 'kg',
    },
    {
      offsetJours: 7,
      visas: { visa_controle_gestion: true },
      ean: '3760000648205',
      code: '648900205',
      libelle: 'PIZZA CHEVRE MIEL',
      designation: 'PIZZA ARTISANALE CHEVRE MIEL',
      famille: 'Pizza',
      marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS',
      reseau: 'GDM',
      typeDemande: 'CA Additionnel',
      typeDe: 'de_dl',
      axe: 'Développement de nos marques',
      demandeur: 'Camille Roy',
      service: 'Commerce',
      usine: 'Bonloc',
      activite: 'TRAITEUR',
      categorie: 'Permanent',
      typeLogistique: 'Franco / One Shot',
      poidsOp: 450, poidsBrut: 500, poidsNet: 450, volume: 2.0, unite: 'kg',
    },
    {
      offsetJours: 11,
      visas: { visa_controle_gestion: true },
      ean: '3760000648206',
      code: '648900206',
      libelle: '24 NEMS PORC',
      designation: '24 MINI NEMS PORC ASIA',
      famille: 'Bouchees aperitives chaudes',
      marque: 'Boncolac Traiteur',
      typeMarque: 'Marque Nationale RHF / Export',
      reseau: 'BPT_RHF',
      typeDemande: 'CA Additionnel',
      typeDe: 'de',
      axe: 'Démarche utilisateurs en RHF',
      demandeur: 'Antoine Garcia',
      service: 'Commerce',
      usine: 'Bonloc',
      activite: 'TRAITEUR',
      categorie: 'Permanent',
      typeLogistique: 'Franco',
      poidsOp: 480, poidsBrut: 520, poidsNet: 480, volume: 2.1, unite: 'kg',
    },
    {
      offsetJours: 21,
      visas: {},
      ean: '3760000648207',
      code: '648900207',
      libelle: 'QUICHE LORRAINE XXL',
      designation: 'QUICHE LORRAINE FORMAT XXL',
      famille: 'Entrees chaudes',
      marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS',
      reseau: 'GDM',
      typeDemande: "Changement d'usine",
      typeDe: 'de',
      axe: 'Schéma directeur industriel',
      demandeur: 'Élodie Petit',
      service: 'Industriel',
      usine: 'Agen',
      activite: 'TRAITEUR',
      categorie: 'Permanent',
      typeLogistique: 'Départ',
      poidsOp: 800, poidsBrut: 900, poidsNet: 800, volume: 3.5, unite: 'kg',
    },
    {
      offsetJours: 40,
      visas: {},
      ean: '3760000648208',
      code: '648900208',
      libelle: 'PIZZA 4 FROMAGES',
      designation: 'PIZZA ARTISANALE 4 FROMAGES',
      famille: 'Pizza',
      marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS',
      reseau: 'GDM',
      typeDemande: 'CA Additionnel',
      typeDe: 'de_dl',
      axe: 'Plan produits inscrits au budget',
      demandeur: 'Nicolas Moreau',
      service: 'Commerce',
      usine: 'Bonloc',
      activite: 'TRAITEUR',
      categorie: 'Permanent',
      typeLogistique: 'Franco',
      poidsOp: 420, poidsBrut: 470, poidsNet: 420, volume: 1.9, unite: 'kg',
    },
    {
      offsetJours: -10,
      visas: {
        visa_controle_gestion: true,
        visa_supply_chain: true,
        visa_gestion_besoin: true,
        visa_industriel: true,
        visa_commerce: true,
        statut_sap: 'Création SAP effectuée',
        fl_exportee: true,
      },
      ean: '3760000648209',
      code: '648900209',
      libelle: 'BOX TAPAS ESPAGNOLES',
      designation: 'BOX TAPAS ESPAGNOLES 12 PIECES',
      famille: 'Bouchees aperitives froides',
      marque: 'Marque Export',
      typeMarque: 'Marque Nationale RHF / Export',
      reseau: 'EXPORT',
      typeDemande: 'CA Additionnel',
      typeDe: 'de',
      axe: 'Développement de nos marques',
      demandeur: 'Laura Sanchez',
      service: 'Commerce',
      usine: 'Bonloc',
      activite: 'TRAITEUR',
      categorie: 'Permanent',
      typeLogistique: 'Franco',
      poidsOp: 360, poidsBrut: 400, poidsNet: 360, volume: 1.6, unite: 'kg',
    },
  ];

  const des = [];
  const fiches = [];

  samples.forEach((s, idx) => {
    const deId = uid();
    const ficheId = uid();

    const codeChapeau = `${s.ean} ${s.designation}`.trim();
    const dateDemande = isoDateOffset(s.offsetJours - 30);
    const dateValidation = new Date();
    dateValidation.setDate(dateValidation.getDate() + s.offsetJours - 20);

    const de = {
      id: deId,
      created_date: now,
      updated_date: now,

      // Sélection initiale
      type_de: s.typeDe,

      // Informations générales
      code_projet: `PRJ-2026-${String(142 + idx).padStart(3, '0')}`,
      axe_strategique: s.axe,
      date_demande: dateDemande,
      reseau: s.reseau,
      type_demande_de: s.typeDemande,
      demandeur: s.demandeur,

      // Produit
      famille_produit: s.famille,
      designation_article: s.designation,
      marque: s.marque,
      categorie: s.categorie,
      date_lancement: isoDateOffset(s.offsetJours),

      // Logistique & échantillons
      type_logistique: s.typeLogistique,
      date_echantillon: isoDateOffset(s.offsetJours - 20),
      date_mise_dispo: isoDateOffset(s.offsetJours - 5),

      // Caractéristiques physiques
      poids_op: s.poidsOp,
      poids_brut: s.poidsBrut,
      poids_net: s.poidsNet,
      volume: s.volume,
      unite: s.unite,

      // Champs hérités (legacy + dashboard)
      service_demandeur: s.service,
      auteur: 'demo@boncolac.local',
      usine_fab: s.usine,
      activite: s.activite,
      type_demande: s.typeDemande,
      designation: s.designation,

      // Validation
      statut: 'validee',
      code_ean: s.ean,
      code_chapeau: codeChapeau,
      usine_validee: s.usine,
      date_validation: dateValidation.toISOString(),
      fiche_lancement_id: ficheId,
    };

    const sapStatut = s.visas.statut_sap || null;
    const fl_exportee = !!s.visas.fl_exportee;

    const fiche = {
      id: ficheId,
      created_date: now,
      updated_date: now,
      demande_etude_id: deId,
      etat_global: 'en_attente',
      etape_courante: 1,
      visa_controle_gestion: !!s.visas.visa_controle_gestion,
      visa_supply_chain: !!s.visas.visa_supply_chain,
      visa_gestion_besoin: !!s.visas.visa_gestion_besoin,
      visa_industriel: !!s.visas.visa_industriel,
      visa_commerce: !!s.visas.visa_commerce,
      statut_sap: sapStatut,
      fl_exportee,
      code_article: s.code,
      code_chapeau: codeChapeau,
      libelle_article: s.libelle,
      code_etude_rd: de.code_projet,
      centre_profit: '0000TR001 - Traiteur',
      date_limite_creation_mm01: isoDateOffset(s.offsetJours + 30),
      date_envoi_ficher: isoDateOffset(s.offsetJours - 10),
    };

    des.push(de);
    fiches.push(fiche);
  });

  return { des, fiches };
};

export const seedMockDataIfNeeded = () => {
  if (localStorage.getItem(SEED_FLAG)) return;
  if (hasRows('FicheLancement') || hasRows('DemandeEtude')) {
    localStorage.setItem(SEED_FLAG, '1');
    return;
  }
  const { des, fiches } = buildSeedData();
  writeRows('DemandeEtude', des);
  writeRows('FicheLancement', fiches);
  localStorage.setItem(SEED_FLAG, '1');
};

// Force le replay du seed : utile pour les démos / reset utilisateur.
export const resetMockDemoData = () => {
  const { des, fiches } = buildSeedData();
  writeRows('DemandeEtude', des);
  writeRows('FicheLancement', fiches);
  localStorage.setItem(SEED_FLAG, '1');
};
