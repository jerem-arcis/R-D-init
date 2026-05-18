// Pré-remplissage du localStorage avec des exemples de DE + FL liées.
// S'exécute une fois au démarrage de l'app si rien n'a été créé.

const STORAGE_PREFIX = 'mock_db_';
const SEED_FLAG = 'mock_seed_v6';

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

  // Profils de fiches répartis dans tous les buckets ET étalés sur plusieurs mois
  // pour faire parler les graphiques (cadence, tendance cumulée, Pareto, heatmap).
  // Chaque échantillon = une DE complète et validée + une FL liée à différentes étapes du workflow.
  const FULL_VISAS = {
    visa_controle_gestion: true,
    visa_supply_chain: true,
    visa_gestion_besoin: true,
    visa_industriel: true,
    visa_commerce: true,
    statut_sap: 'Création SAP effectuée',
    fl_exportee: true,
  };
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
      visas: FULL_VISAS,
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
    // === Historique : lancements passés (3 derniers mois) ===
    {
      offsetJours: -85, visas: FULL_VISAS,
      ean: '3760000648210', code: '648900210',
      libelle: 'BURRATA ITALIENNE', designation: 'BURRATA ITALIENNE 125G',
      famille: 'Entrees froides', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Développement de nos marques', demandeur: 'Marc Lefevre',
      service: 'Marketing', usine: 'Agen', activite: 'TRAITEUR',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 125, poidsBrut: 145, poidsNet: 125, volume: 0.4, unite: 'kg',
    },
    {
      offsetJours: -70, visas: FULL_VISAS,
      ean: '3760000648211', code: '648900211',
      libelle: 'GAMBAS PANEES', designation: 'GAMBAS PANEES CROUSTILLANTES',
      famille: 'Bouchees aperitives chaudes', marque: 'Boncolac Traiteur',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de_dl',
      axe: 'Business Courant', demandeur: 'Émilie Roux',
      service: 'Commerce', usine: 'Bonloc', activite: 'TRAITEUR',
      categorie: 'Saisonnier', typeLogistique: 'Franco',
      poidsOp: 280, poidsBrut: 320, poidsNet: 280, volume: 1.1, unite: 'kg',
    },
    {
      offsetJours: -65, visas: FULL_VISAS,
      ean: '3760000648212', code: '648900212',
      libelle: 'QUICHE 3 FROMAGES', designation: 'QUICHE 3 FROMAGES 400G',
      famille: 'Entrees chaudes', marque: 'Marque Distributeur',
      typeMarque: 'Marque distributeur', reseau: 'MDD',
      typeDemande: 'Retravail Produit - CA existant', typeDe: 'de',
      axe: 'Plan produits inscrits au budget', demandeur: 'Hugo Blanchard',
      service: 'Industriel', usine: 'Agen', activite: 'TRAITEUR',
      categorie: 'Permanent', typeLogistique: 'Départ',
      poidsOp: 400, poidsBrut: 450, poidsNet: 400, volume: 1.7, unite: 'kg',
    },
    {
      offsetJours: -55, visas: FULL_VISAS,
      ean: '3760000648213', code: '648900213',
      libelle: 'MINI BRIOCHES', designation: '24 MINI BRIOCHES BEURRE',
      famille: 'Boulangerie', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Business Courant', demandeur: 'Clara Dubois',
      service: 'Commerce', usine: 'Toulouse', activite: 'BOULANGERIE',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 300, poidsBrut: 340, poidsNet: 300, volume: 1.3, unite: 'kg',
    },
    {
      offsetJours: -48, visas: FULL_VISAS,
      ean: '3760000648214', code: '648900214',
      libelle: 'PAIN AUX CHOCO', designation: '12 PAINS AU CHOCOLAT',
      famille: 'Boulangerie', marque: 'Marque Distributeur',
      typeMarque: 'Marque distributeur', reseau: 'MDD',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Business Courant', demandeur: 'Théo Martinez',
      service: 'Commerce', usine: 'Toulouse', activite: 'BOULANGERIE',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 360, poidsBrut: 400, poidsNet: 360, volume: 1.5, unite: 'kg',
    },
    {
      offsetJours: -40, visas: FULL_VISAS,
      ean: '3760000648215', code: '648900215',
      libelle: 'TIRAMISU CAFE', designation: 'TIRAMISU CAFE 4X90G',
      famille: 'Desserts', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de_dl',
      axe: 'Développement de nos marques', demandeur: 'Sarah Lambert',
      service: 'Marketing', usine: 'Agen', activite: 'PATISSERIE',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 360, poidsBrut: 400, poidsNet: 360, volume: 1.0, unite: 'kg',
    },
    {
      offsetJours: -35, visas: FULL_VISAS,
      ean: '3760000648216', code: '648900216',
      libelle: 'ECLAIRS CHOCO', designation: '6 ECLAIRS CHOCOLAT',
      famille: 'Desserts', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Plan produits inscrits au budget', demandeur: 'Sarah Lambert',
      service: 'Marketing', usine: 'Agen', activite: 'PATISSERIE',
      categorie: 'Saisonnier', typeLogistique: 'Franco',
      poidsOp: 420, poidsBrut: 470, poidsNet: 420, volume: 1.2, unite: 'kg',
    },
    {
      offsetJours: -28, visas: FULL_VISAS,
      ean: '3760000648217', code: '648900217',
      libelle: 'PIZZA REINE', designation: 'PIZZA REINE ARTISANALE',
      famille: 'Pizza', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Business Courant', demandeur: 'Camille Roy',
      service: 'Commerce', usine: 'Bonloc', activite: 'TRAITEUR',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 420, poidsBrut: 470, poidsNet: 420, volume: 1.9, unite: 'kg',
    },
    {
      offsetJours: -22, visas: FULL_VISAS,
      ean: '3760000648218', code: '648900218',
      libelle: 'SAMOSSAS LEGUMES', designation: '20 MINI SAMOSSAS LEGUMES',
      famille: 'Bouchees aperitives chaudes', marque: 'Boncolac Traiteur',
      typeMarque: 'Marque Nationale RHF / Export', reseau: 'BPT_RHF',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Démarche utilisateurs en RHF', demandeur: 'Antoine Garcia',
      service: 'Commerce', usine: 'Bonloc', activite: 'TRAITEUR',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 240, poidsBrut: 270, poidsNet: 240, volume: 1.0, unite: 'kg',
    },
    {
      offsetJours: -18, visas: FULL_VISAS,
      ean: '3760000648219', code: '648900219',
      libelle: 'GASPACHO ANDALOU', designation: 'GASPACHO ANDALOU 1L',
      famille: 'Soupes', marque: 'Marque Export',
      typeMarque: 'Marque Nationale RHF / Export', reseau: 'EXPORT',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Développement de nos marques', demandeur: 'Laura Sanchez',
      service: 'Commerce', usine: 'Agen', activite: 'TRAITEUR',
      categorie: 'Saisonnier', typeLogistique: 'Franco',
      poidsOp: 1000, poidsBrut: 1080, poidsNet: 1000, volume: 1.0, unite: 'L',
    },
    {
      offsetJours: -14, visas: FULL_VISAS,
      ean: '3760000648220', code: '648900220',
      libelle: 'TARTELETTES FRUITS', designation: '4 TARTELETTES FRUITS ROUGES',
      famille: 'Desserts', marque: 'Marque Distributeur',
      typeMarque: 'Marque distributeur', reseau: 'MDD',
      typeDemande: 'Retravail Produit - CA existant', typeDe: 'de',
      axe: 'Plan produits inscrits au budget', demandeur: 'Sarah Lambert',
      service: 'Marketing', usine: 'Agen', activite: 'PATISSERIE',
      categorie: 'Saisonnier', typeLogistique: 'Départ',
      poidsOp: 320, poidsBrut: 360, poidsNet: 320, volume: 1.1, unite: 'kg',
    },
    // === À venir éloignés : pipeline 1-4 mois ===
    {
      offsetJours: 55, visas: {},
      ean: '3760000648221', code: '648900221',
      libelle: 'PIZZA VEGETARIENNE', designation: 'PIZZA VEGETARIENNE BIO',
      famille: 'Pizza', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de_dl',
      axe: 'Développement de nos marques', demandeur: 'Camille Roy',
      service: 'Marketing', usine: 'Bonloc', activite: 'TRAITEUR',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 430, poidsBrut: 480, poidsNet: 430, volume: 2.0, unite: 'kg',
    },
    {
      offsetJours: 65, visas: { visa_controle_gestion: true },
      ean: '3760000648222', code: '648900222',
      libelle: 'CROISSANTS BEURRE', designation: '12 CROISSANTS PUR BEURRE',
      famille: 'Boulangerie', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Business Courant', demandeur: 'Théo Martinez',
      service: 'Commerce', usine: 'Toulouse', activite: 'BOULANGERIE',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 360, poidsBrut: 400, poidsNet: 360, volume: 1.5, unite: 'kg',
    },
    {
      offsetJours: 75, visas: {},
      ean: '3760000648223', code: '648900223',
      libelle: 'BOWL POKE SAUMON', designation: 'BOWL POKE SAUMON AVOCAT',
      famille: 'Plats cuisinés', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de_dl',
      axe: 'Développement de nos marques', demandeur: 'Émilie Roux',
      service: 'Marketing', usine: 'Bonloc', activite: 'TRAITEUR',
      categorie: 'Permanent', typeLogistique: 'Franco / One Shot',
      poidsOp: 380, poidsBrut: 420, poidsNet: 380, volume: 1.4, unite: 'kg',
    },
    {
      offsetJours: 90, visas: {},
      ean: '3760000648224', code: '648900224',
      libelle: 'BUCHE NOEL CHOCO', designation: 'BUCHE DE NOEL CHOCOLAT',
      famille: 'Desserts', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Plan produits inscrits au budget', demandeur: 'Sarah Lambert',
      service: 'Marketing', usine: 'Agen', activite: 'PATISSERIE',
      categorie: 'Saisonnier', typeLogistique: 'Franco',
      poidsOp: 600, poidsBrut: 680, poidsNet: 600, volume: 2.5, unite: 'kg',
    },
    {
      offsetJours: 105, visas: {},
      ean: '3760000648225', code: '648900225',
      libelle: 'PLATEAU APERO', designation: 'PLATEAU APERO 24 PIECES',
      famille: 'Bouchees aperitives froides', marque: 'Boncolac Traiteur',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de_dl',
      axe: 'Démarche utilisateurs en RHF', demandeur: 'Antoine Garcia',
      service: 'Commerce', usine: 'Bonloc', activite: 'TRAITEUR',
      categorie: 'Saisonnier', typeLogistique: 'Franco',
      poidsOp: 520, poidsBrut: 580, poidsNet: 520, volume: 2.2, unite: 'kg',
    },
    {
      offsetJours: 120, visas: {},
      ean: '3760000648226', code: '648900226',
      libelle: 'GALETTE ROIS', designation: 'GALETTE DES ROIS FRANGIPANE',
      famille: 'Desserts', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Plan produits inscrits au budget', demandeur: 'Sarah Lambert',
      service: 'Marketing', usine: 'Agen', activite: 'PATISSERIE',
      categorie: 'Saisonnier', typeLogistique: 'Franco',
      poidsOp: 500, poidsBrut: 560, poidsNet: 500, volume: 2.0, unite: 'kg',
    },
    // === Quelques fiches additionnelles en retard / critique pour densifier la heatmap ===
    {
      offsetJours: -5,
      visas: { visa_controle_gestion: true, visa_supply_chain: true, visa_gestion_besoin: true },
      ean: '3760000648227', code: '648900227',
      libelle: 'WRAPS POULET', designation: 'WRAPS POULET CESAR',
      famille: 'Plats cuisinés', marque: 'Marque Distributeur',
      typeMarque: 'Marque distributeur', reseau: 'MDD',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Business Courant', demandeur: 'Hugo Blanchard',
      service: 'Industriel', usine: 'Bonloc', activite: 'TRAITEUR',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 220, poidsBrut: 250, poidsNet: 220, volume: 0.8, unite: 'kg',
    },
    {
      offsetJours: -1,
      visas: { visa_controle_gestion: true, visa_supply_chain: true },
      ean: '3760000648228', code: '648900228',
      libelle: 'SALADE QUINOA', designation: 'SALADE QUINOA LEGUMES',
      famille: 'Plats cuisinés', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'Retravail Produit - CA existant', typeDe: 'de',
      axe: 'Business Courant', demandeur: 'Émilie Roux',
      service: 'Marketing', usine: 'Agen', activite: 'TRAITEUR',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 250, poidsBrut: 280, poidsNet: 250, volume: 0.9, unite: 'kg',
    },
    {
      offsetJours: 5,
      visas: { visa_controle_gestion: true, visa_supply_chain: true, visa_gestion_besoin: true, visa_industriel: true, visa_commerce: true },
      ean: '3760000648229', code: '648900229',
      libelle: 'TARTE CITRON', designation: 'TARTE AU CITRON MERINGUEE',
      famille: 'Desserts', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Développement de nos marques', demandeur: 'Sarah Lambert',
      service: 'Marketing', usine: 'Agen', activite: 'PATISSERIE',
      categorie: 'Saisonnier', typeLogistique: 'Franco',
      poidsOp: 500, poidsBrut: 560, poidsNet: 500, volume: 1.8, unite: 'kg',
    },
    {
      offsetJours: 9, visas: { visa_controle_gestion: true, visa_supply_chain: true },
      ean: '3760000648230', code: '648900230',
      libelle: 'BAGUETTE TRADITION', designation: '6 BAGUETTES TRADITION',
      famille: 'Boulangerie', marque: 'Marque Distributeur',
      typeMarque: 'Marque distributeur', reseau: 'MDD',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Business Courant', demandeur: 'Théo Martinez',
      service: 'Commerce', usine: 'Toulouse', activite: 'BOULANGERIE',
      categorie: 'Permanent', typeLogistique: 'Départ',
      poidsOp: 450, poidsBrut: 500, poidsNet: 450, volume: 2.5, unite: 'kg',
    },
    {
      offsetJours: 13, visas: { visa_controle_gestion: true },
      ean: '3760000648231', code: '648900231',
      libelle: 'CAKE AU CHOCOLAT', designation: 'CAKE AU CHOCOLAT NOIR',
      famille: 'Desserts', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Plan produits inscrits au budget', demandeur: 'Sarah Lambert',
      service: 'Marketing', usine: 'Agen', activite: 'PATISSERIE',
      categorie: 'Permanent', typeLogistique: 'Franco',
      poidsOp: 380, poidsBrut: 420, poidsNet: 380, volume: 1.3, unite: 'kg',
    },
    {
      offsetJours: 28, visas: {},
      ean: '3760000648232', code: '648900232',
      libelle: 'VELOUTE POTIRON', designation: 'VELOUTE POTIRON CHATAIGNES',
      famille: 'Soupes', marque: 'Boncolac',
      typeMarque: 'Marque Nationale GMS', reseau: 'GDM',
      typeDemande: 'CA Additionnel', typeDe: 'de',
      axe: 'Développement de nos marques', demandeur: 'Émilie Roux',
      service: 'Marketing', usine: 'Agen', activite: 'TRAITEUR',
      categorie: 'Saisonnier', typeLogistique: 'Franco',
      poidsOp: 750, poidsBrut: 820, poidsNet: 750, volume: 0.75, unite: 'L',
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

    // Dates de visa progressives à partir d'une date de création étalée dans le temps.
    // L'âge des fiches est dispersé sur ~6 mois pour faire parler le filtre 30j/90j.
    // 4 profils de rythme (rapide / normal / lent / très lent) pour varier les stats.
    const cycleProfiles = [
      [1, 2, 3, 4, 5, 6, 7],         // rapide  (cycle ~1 sem)
      [2, 5, 9, 14, 20, 25, 28],     // normal  (~4 sem)
      [3, 8, 15, 23, 33, 40, 45],    // lent    (~6 sem)
      [4, 12, 22, 35, 50, 60, 68],   // très lent (~10 sem)
    ];
    const profile = cycleProfiles[idx % cycleProfiles.length];

    // Âge de la fiche : pseudo-shuffle (idx * 47 mod 180) + 3 jours.
    // Garantit un mélange des états de visas (full / partiel / vide) à chaque tranche d'âge,
    // pour que les filtres 30j / 90j / Tout donnent des résultats variés et complets.
    const ficheAgeJours = ((idx * 47) % 180) + 3;
    const ficheCreatedDate = new Date();
    ficheCreatedDate.setDate(ficheCreatedDate.getDate() - ficheAgeJours);
    const nowMs = Date.now();
    // Renvoie l'ISO si la date est passée, null sinon (visa pas encore atteint).
    const visaDateOrNull = (offsetDays) => {
      const d = new Date(ficheCreatedDate);
      d.setDate(d.getDate() + offsetDays);
      if (d.getTime() > nowMs) return null;
      return d.toISOString();
    };

    // Résolution des visas : on respecte l'intention du sample, mais on désactive
    // les visas dont la date calculée tomberait dans le futur (cycle non encore atteint).
    const cgDate    = s.visas.visa_controle_gestion ? visaDateOrNull(profile[0]) : null;
    const scDate    = cgDate && s.visas.visa_supply_chain     ? visaDateOrNull(profile[1]) : null;
    const gbDate    = scDate && s.visas.visa_gestion_besoin   ? visaDateOrNull(profile[2]) : null;
    const indDate   = gbDate && s.visas.visa_industriel       ? visaDateOrNull(profile[3]) : null;
    const comDate   = indDate && s.visas.visa_commerce         ? visaDateOrNull(profile[4]) : null;
    const sapDate   = comDate && sapStatut === 'Création SAP effectuée' ? visaDateOrNull(profile[5]) : null;
    const exportDate = sapDate && fl_exportee ? visaDateOrNull(profile[6]) : null;

    const fiche = {
      id: ficheId,
      created_date: ficheCreatedDate.toISOString(),
      updated_date: now,
      demande_etude_id: deId,
      etat_global: 'en_attente',
      etape_courante: 1,
      visa_controle_gestion: cgDate != null,
      visa_supply_chain: scDate != null,
      visa_gestion_besoin: gbDate != null,
      visa_industriel: indDate != null,
      visa_commerce: comDate != null,
      statut_sap: sapDate ? 'Création SAP effectuée' : null,
      fl_exportee: exportDate != null,
      code_article: s.code,
      code_chapeau: codeChapeau,
      libelle_article: s.libelle,
      code_etude_rd: de.code_projet,
      centre_profit: '0000TR001 - Traiteur',
      date_limite_creation_mm01: isoDateOffset(s.offsetJours + 30),
      date_envoi_ficher: isoDateOffset(s.offsetJours - 10),
    };

    if (cgDate)     fiche.visa_controle_gestion_date = cgDate;
    if (scDate)     fiche.visa_supply_chain_date     = scDate;
    if (gbDate)     fiche.visa_gestion_besoin_date   = gbDate;
    if (indDate)    fiche.visa_industriel_date       = indDate;
    if (comDate)    fiche.visa_commerce_date         = comDate;
    if (sapDate) {
      fiche.date_creation_sap = sapDate;
      fiche.cree_sap_par = 'demo@boncolac.local';
    }
    if (exportDate) fiche.fl_exportee_date = exportDate;

    des.push(de);
    fiches.push(fiche);
  });

  return { des, fiches };
};

export const seedMockDataIfNeeded = () => {
  if (localStorage.getItem(SEED_FLAG) === '1') return;
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
