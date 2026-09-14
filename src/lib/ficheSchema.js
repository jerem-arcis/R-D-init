// Schéma de champs FL (Fiche de Lancement)
// Listes déroulantes, mapping DE→FL, regroupements, helpers.

// ---------- Listes déroulantes ----------
// Centre de profit et secteur d'activité ne sont plus des listes en dur : ce sont
// les MÊMES référentiels Dataverse que la DE (table CEPCT alimentée SAP / option-set
// Admin `secteurs_activite`), branchés dans IdentificationBanner / CommerceSection.

// Sites de stockage = référentiel « DivprincStockage » du fichier FM (feuille
// SupplyChain -> plage nommée « Entrepôt » -> ListesSAP!D2:D12). La valeur stockée
// est le CODE division nu (ex. « 2820 »), écrit tel quel dans cr04e_division (lignes
// STOCK de cr04e_divisionprojets, cf. api/ficheSitesStockage.js) — cohérent avec les
// lignes PROD. Le libellé n'est qu'un affichage.
export const SITES_STOCKAGE = [
  { value: '2820', label: '2820 - Olano Montauban' },
  { value: '2821', label: '2821 - Olano St Jean de Luz' },
  { value: '2822', label: '2822 - Olano Aurillac' },
  { value: '2823', label: '2823 - STEF Agen' },
  { value: '2824', label: '2824 - Olano Wissous' },
  { value: '2825', label: '2825 - Débord' },
  { value: '2827', label: '2827 - Seafrigo' },
  { value: '2828', label: '2828 - Artipolis' },
  { value: '2829', label: '2829 - Mutual Ligistic' },
  { value: '2830', label: '2830 - Nordfrost' },
  { value: '2860', label: '2860 - Olano Carvin' },
];

// Code site de stockage -> libellé lisible (pour l'affichage : PDF, synthèse). Repli
// sur le code brut si inconnu (site historique retiré du référentiel).
const SITE_STOCKAGE_LABELS = new Map(SITES_STOCKAGE.map((s) => [s.value, s.label]));
export const siteStockageLabel = (code) =>
  SITE_STOCKAGE_LABELS.get((code ?? '').toString().trim()) || (code ?? '').toString();

// Option « code-désignation » pour les groupes article/ristourne : le libellé complet
// (« A0-MB BUCHES MN ») reste affiché et cherchable, mais seul le CODE sur 2 caractères
// (« A0 ») est stocké en BDD puis envoyé à SAP. La valeur « 01 » (pas de désignation)
// donne simplement { value: '01', label: '01' }.
const groupeOption = (s) => ({ value: s.slice(0, 2), label: s, keywords: s });

// OC2 — Groupe d'article (MVKE-KONDM). Liste ListesSAP/GroupeArticle du fichier FM.
// Seul le code sur 2 caractères est stocké et envoyé à SAP (cf. groupeOption).
export const GROUPES_ARTICLE = [
  '01', // valeur en tête (demande métier)
  'A0-MB BUCHES MN', 'A1-MB CR GLACEE DIVERS', 'A2-MB CR GLACEE MN', 'A3-MB CR GLACEE SM MDD',
  'A4-MB PATISSERIE MB', 'A5-MB PATISSERIE MN', 'A6-MB PATISSERIE SD', 'A7-MB PATISSERIE SM MDD',
  'A8-MB PATISSERIE SM MN', 'A9-MB TRAITEUR MB', 'AA-MB TRAITEUR MN', 'AB-MB TRAITEUR SELE MDD',
  'AC-MB TRAITEUR SM MDD', 'AD-MB ALDI', 'AE-MB ARGEL', 'AF-MB CAKESMITHS',
  'AG-MB AUCHAN', 'AH-MB BELLE FRANCE', 'AI-MB BRAKE', 'AJ-MB CARREFOUR',
  'AK-MB CASINO', 'AL-MB CODITOUR', 'AM-MB CORA', 'AN-MB COUP DE PATES',
  'AO-MB DAVIGEL', 'AP-MB DELIFRANCE', 'AQ-MB MDD TRAITEUR', 'AR-MB MDD PATISSERIE',
  'AS-MB EISMANN', 'AT-MB PROPER CORNISH', 'AU-MB FARMERSLAND', 'AV-MB FOUR A IDEE',
  'AW-MB FROSTINVEST', 'AX-MB GELISSIMO', 'AY-MB INTERMARCHE', 'AZ-MB LA SIRENA',
  'B0-MB LE MUTANT', 'B1-MB MAG M', 'B2-MB LEADER PRICE', 'B3-MB MAC DONALD',
  'B4-MB MARKS&SPENCE', 'B5-MB MAXIMO', 'B6-MB METRO', 'B7-MB MICHEL BRAS',
  'B8-MB MONOPRIX', 'B9-MB MORRISONS', 'BA-MB NORMA', 'BB-MB PICARD',
  'BC-MB POMONA', 'BD-MB PRODUITS "U"', 'BE-MB QUALIGEL', 'BF-MB SEGES',
  'BG-MB SHAKE NDRINK', 'BH-MB SODIPA', 'BI-MB TOUPARGEL', 'BJ-MB TRANSGOURMET',
  'BK-MB TROFIC', 'BL-MB WAITROSE', 'BM-MB WFM', 'BN-MB CAMPAGNE DE France',
  'BO-MB TRADER JOE', 'BP-MB FAUCHON', 'BQ-MDD DIVERS', 'BR-BOULPAT',
  'BS-MARIE', 'BT-MB CODITOUR PATISSER', 'BU-MB FLUNCH', 'BV-MB POMONA TRAITEUR',
  'BW-MB INTERMARCHE TRAITEUR', 'BX-BPT CLASS(ANC.GP)', 'BY-MB ENTREMONT', 'BZ-TDL',
].map(groupeOption);

// OC2 — Groupe de ristournes (MVKE-BONUS). Liste ListesSAP/GroupeDeRistourne du
// fichier FM. Seul le code sur 2 caractères est stocké/envoyé (idem article).
export const GROUPES_RISTOURNE = [
  '01', // valeur en tête (demande métier)
  'A0-MB BUCHES MN', 'A1-MB CR GLACEE DIVERS', 'A2-MB CR GLACEE MN', 'A3-MB CR GLACEE SM MDD',
  'A4-MB PATISSERIE RHF MB', 'A5-MB PATISSERIE GMS MN', 'A6-MB PATISSERIE SD', 'A7-MB PATISSERIE SM MDD',
  'A8-MB PATISSERIE SM MN', 'A9-MB TRAITEUR MB', 'AA-MB TRAITEUR MN', 'AB-MB TRAITEUR SELE MDD',
  'AC-MB TRAITEUR SM MDD', 'AD-MB ALDI', 'AE-MB ARGEL', 'AF-MB ASDA',
  'AG-MB AUCHAN', 'AH-MB BELLE FRANCE', 'AI-MB BRAKE', 'AJ-MB CARREFOUR',
  'AK-MB CASINO', 'AL-MB CODITOUR', 'AM-MB CORA', 'AN-MB COUP DE PATES',
  'AO-MB DAVIGEL', 'AP-MB DELIFRANCE', 'AQ-MB DIA', 'AR-MB ED',
  'AS-MB EISMANN', 'AT-MB EN CUISINE', 'AU-MB FARMERSLAND', 'AV-MB FOUR A IDEE',
  'AW-MB FROSTINVEST', 'AX-MB GELISSIMO', 'AY-MB INTERMARCHE', 'AZ-MB LA SIRENA',
  'B0-MB LE MUTANT', 'B1-MB LE PROFESSIONNEL', 'B2-MB LEADER PRICE', 'B3-MB MAC DONALD',
  'B4-MB MARKS&SPENCE', 'B5-MB MAXIMO', 'B6-MB METRO', 'B7-MB MICHEL BRAS',
  'B8-MB MONOPRIX', 'B9-MB MORRISONS', 'BA-MB NORMA', 'BB-MB PICARD',
  'BC-MB POMONA', 'BD-MB PRODUITS "U"', 'BE-MB QUALIGEL', 'BF-MB SEGES',
  'BG-MB SHAKE NDRINK', 'BH-MB SODIPA', 'BI-MB TOUPARGEL', 'BJ-MB TRANSGOURMET',
  'BK-MB TROFIC', 'BL-MB WAITROSE', 'BM-MB WFM', 'BN-MB CAMPAGNE DE France',
  'BO-MB TRADER JOE', 'BP-MB FAUCHON', 'BQ-MDD DIVERS', 'BR-BOULPAT',
  'BS-MARIE', 'BT-MB CODITOUR PATISSERIE', 'BU-MB FLUNCH', 'BV-MB POMONA TRAITEUR',
  'BW-MB INTERMARCHE TRAITEUR',
].map(groupeOption);

// OC2 — Groupe imputation article. Valeurs du fichier FM (plage GpeImputArt).
// Désignation affichée, code seul stocké/poussé (cf. codeOption plus bas).
export const GROUPES_IMPUTATION = [
  { value: '01', label: '01 - produits finis', keywords: '01 produits finis' },
  { value: '05', label: '05 - produits négoce', keywords: '05 produits négoce' },
];

// OC2 — Groupe statistique article (MVKE-VERSG). Liste ListesSAP/GroupeStatArticle.
// Désignation « code-Groupe article code » affichée, mais seul le CODE est stocké
// puis envoyé à SAP (ex. « 1 »), conformément à l'import Excel (VERSG = « 1 »).
export const GROUPES_STATISTIQUE = [
  { value: '1', label: '1-Groupe article 1' },
  { value: '2', label: '2-Groupe article 2' },
  { value: '3', label: '3-Groupe article 3' },
  { value: '4', label: '4-Groupe article 4' },
  { value: '5', label: '5-Groupe article 5' },
  { value: '6', label: '6-Groupe article 6' },
  { value: '7', label: '7-Groupe article 7' },
  { value: '8', label: '8-Groupe article 8' },
  { value: '9', label: '9-Groupe article 9' },
  { value: 'A', label: 'A-Groupe article A' },
  { value: 'B', label: 'B-Groupe article B' },
  { value: 'C', label: 'C-Groupe article C' },
  { value: 'D', label: 'D-Groupe article D' },
  { value: 'E', label: 'E-Groupe article E' },
  { value: 'F', label: 'F-Groupe article F' },
  { value: 'G', label: 'G-Groupe article G' },
  { value: 'H', label: 'H-Groupe article H' },
  { value: 'I', label: 'I-Groupe article I' },
  { value: 'J', label: 'J-Groupe article J' },
  { value: 'K', label: 'K-Groupe article K' },
  { value: 'L', label: 'L-Groupe article L' },
  { value: 'M', label: 'M-Groupe article M' },
  { value: 'N', label: 'N-Groupe article N' },
  { value: 'O', label: 'O-Groupe article O' },
  { value: 'P', label: 'P-Groupe article P' },
  { value: 'Q', label: 'Q-Groupe article Q' },
  { value: 'R', label: 'R-Groupe article R' },
  { value: 'S', label: 'S-Groupe article S' },
  { value: 'T', label: 'T-Groupe article T' },
  { value: 'U', label: 'U-Groupe article U' },
  { value: 'V', label: 'V-Groupe article V' },
  { value: 'W', label: 'W-Groupe article W' },
  { value: 'X', label: 'X-Groupe article X' },
  { value: 'Y', label: 'Y-Groupe article Y' },
  { value: 'Z', label: 'Z-Groupe article Z' },
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

// Options « code — désignation » : la désignation est affichée dans la liste, mais
// seule la `value` (le code) est stockée puis poussée dans SAP.
const codeOption = (value, designation) => ({
  value,
  label: `${value} - ${designation}`,
  keywords: `${value} ${designation}`,
});

export const ECLATEMENTS_GROUPE_MARCHANDISE = [
  codeOption('00100', 'Pâtisseries'),
  codeOption('00200', 'Traiteur'),
  codeOption('00300', 'Mochis'),
  codeOption('00400', 'Négoce'),
];

export const TYPES_USINE = [
  codeOption('Z004', 'Carcassonne'),
  codeOption('Z006', 'Agen-St Médard'),
  codeOption('Z008', 'Bonloc'),
  codeOption('Z010', 'Rivesaltes'),
  codeOption('Z011', 'Montblanc'),
];

export const TYPES_PALETTE = [
  'SME80 - Palette 80 x 120 Europe',
  'SMN80 - Palette 80 x 120 NIMP 15',
  'SMC80 - Palette 80 x 120 CHEP',
  'SM100 - Palette 100 x 120',
  'SMC10 - Palette 100 x 120 CHEP',
  'SMN10 - Palette 100 x 120 NIMP 15',
];

// Type de magasin EM (SAP) — valeurs autorisées 001 / 002 / 003 (cf. capture FL
// Industriel « Type magasin EM »). Passé en liste déroulante fermée.
export const TYPES_MAGASIN_EM = ['001', '002', '003'];

// Masque de l'étiquette colis. Valeurs du fichier FM (plage Atelier). Le champ
// autorise en plus la saisie d'un code custom (masque non présent dans la liste).
export const MASQUES_ETIQUETTE_COLIS = [
  'mask80x140.lab',
  'mask80x140bio.lab',
  'mask54x140.lab',
  'mask100x150S.lab',
  'mask100x150F.lab',
  'mask80x140SSB.lab',
];

// Format date / DLUO de l'étiquette colis. Valeurs du fichier FM (plage FormatDate,
// commune au format date et au format DLUO).
export const FORMATS_DATE_ETIQUETTE = [
  '1 - JJ MM AAAA',
  '2 - JJ MM AA',
  '3 - MM AAAA',
  '4 - MM JJ AAAA',
  '5 - AA MM JJ',
  '6 - AA MM',
];

// Temps de réception usine (jours). Valeurs du fichier FM
// (liste_date_réception_usine), réduites au seul NOMBRE DE JOURS : la liste
// d'origine répétait la même durée avec des commentaires de cas d'usage
// (« 4 j » / « 4 j : Bonloc - Pâtisseries hors Picard »), ce qui donnait des
// entrées en double dans le menu pour une valeur SAP identique.
export const TEMPS_RECEPTION_USINE = ['0', '3', '4', '7', '10', '15'];

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

// Origine de fabrication : plus de liste statique — alimentée dynamiquement par la
// table Dataverse des divisions/usines (useSapOptions().divisions), filtrée sur les
// sites de fabrication (DE_DIVISION_CODES), exactement comme « Division (Usine) »
// côté DE. Voir FicheDetailV2 / CommerceSection.

export const CANAUX_DISTRIBUTION = [
  'GMS',
  'RHF',
  'Export',
  'Marque distributeur',
  'BtoB',
  'E-commerce',
];

export const MARQUES = [
  'Boncolac',
  'Boncolac Traiteur',
  'Marque Distributeur',
  'Marque RHF',
  'Marque Export',
];

// Nomenclature douanière. Valeurs du fichier FM (plage NomenclatureDouaniere),
// au format « code = désignation ». Seul le CODE est stocké et poussé dans SAP
// (cf. NOMENCLATURES_DOUANIERES juste en dessous) ; la ligne complète ne sert
// qu'à l'affichage et à la recherche dans la liste déroulante.
const NOMENCLATURES_DOUANIERES_LIGNES = [
  "19059030 = Plaques de pain : sucre et gras <5%",
  "19059070 = Tartes, plaques, canapés, P.Surp. > 5% saccharose",
  "19059080 = Canapés, P.Surp. < 5% saccharose",
  "04089980 = Œuf en neige",
  "16010099 = Saucisses",
  "16022010 = Prép Foie d'Oie ou de Canard",
  "16023290 = Prép volaille entre 25% et 57%",
  "16023929 = Préparation volaille + de 57%",
  "16023985 = +57% de volaille hors poulet ou dinde",
  "21050010 = Glaces sans ou <3% matières grasses",
  "21050091 = Glaces 3-7% matières grasses provenant du lait",
  "16024110 = Prép de jambon + de 20%",
  "16024919 = Prép + 80% porc",
  "16025095 = Prép de bœuf + de 20%",
  "16041992 = Prép de Morue + de 20%",
  "16041993 = Lieu Noir (Pollachius virens)",
  "16041994 = Prép Merlus + de 20%",
  "16041997 = Autres poissons",
  "16042010 = Prép de saumons + de 20%",
  "16042030 = Prép saumon sauvage + de 20%",
  "16042090 = Prép Mélanges Poissons + de 20%",
  "16052900 = Prép Crevettes + de 20%",
  "16055200 = Coquillages",
  "16055400 = Prép calmars + de 20%",
  "19019099 = Île Flottante, crème anglaise…",
  "19022091 = Pâtes alimentaires cuites",
  "19023090 = Pâtes Alim autres que farcies",
  "19049010 = Prép alim à base de riz",
  "20041099 = Gratins pomme de terre",
  "21069098 = Prép Alim divers (sans pain)",
  "16024990 = Prép viandes > 20% du produit final",
  "16025010 = Pasty à base de viande",
  "16024210 = Bacon",
  "19053119 = Biscuits recouverts ou enrobés de chocolat >85g",
  "19053130 = Biscuits avec matière grasse issue du lait ≤ 8%",
  "19053199 = Biscuits autres",
];

export const NOMENCLATURES_DOUANIERES = NOMENCLATURES_DOUANIERES_LIGNES.map((ligne) => ({
  value: ligne.split('=')[0].trim(),
  label: ligne,
  keywords: ligne,
}));

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

// Tag « depuis DE / DS » d'un champ FL. `libelleDemande` : colonne partagée avec la
// demande (libellé, centre de profit, secteur, hiérarchie…). `tagHerite` : champ FL
// vide complété depuis la demande (cf. appliquerHeritage dans api/fiche.js).
export const libelleDemande = (fiche) => `depuis ${fiche?.demande || 'DE'}`;
export const tagHerite = (fiche, champ) =>
  (fiche?.herite?.[champ] ? libelleDemande(fiche) : undefined);

// Secteur d'activité : la DE/DS stocke le CODE seul (« 15 », cf. deRules / dsRules)
// alors que la liste Admin peut porter le libellé complet (« 15 - Marques Distrib. »).
// Code de tête numérique ; valeur sans code renvoyée telle quelle.
export const codeSecteur = (v) => {
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d+)\s*[—:=·-]/);
  return m ? m[1] : s;
};

// Options du secteur d'activité : VALEUR = code (ce qui est en base), LIBELLÉ =
// choix complet de la liste Admin. Le « 15 » de la DE présélectionne donc
// « 15 - Marques Distrib. » au lieu d'apparaître comme un choix à part.
export const optionsSecteur = (rows = [], current) => {
  const options = [];
  const vus = new Set();
  for (const { value, designation } of rows) {
    const code = codeSecteur(value);
    if (!code || vus.has(code)) continue;
    vus.add(code);
    const label = designation ? `${code} - ${designation}` : String(value).trim();
    options.push({ value: code, label, keywords: label });
  }
  if (current && !vus.has(current)) options.push({ value: current, label: current, keywords: current });
  return options;
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
  sc: { label: 'ADV', short: 'ADV', color: 'sky', visaField: 'visa_supply_chain' },
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
  temps_reception_usine: 'ind',
  format_date_etiquette_colis: 'ind',
  format_dluo_etiquette_colis: 'ind',
  type_magasin: 'ind',
  biv: 'ind',                 // déplacé depuis COM (responsable Industriel)
  ancien_numero_article: 'ind', // déplacé depuis SC (responsable Industriel)

  // COM (Commerce)
  statut_lancement: 'com',
  design_normalisee: 'com',
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

// Champs retirés de la FL (réduction Commerce/Industriel/Supply Chain + suppression
// de la section Gestion du besoin). Source unique : consommé par FicheDetailV2
// (masquage) ET par getMissingVisaFields (un champ retiré n'est jamais requis).
export const REMOVED_FIELDS = new Set([
  'statut_lancement', 'libelle_client', 'fabrication_negoce', 'mention_produit',
  // `sites_stockage` : réactivé (multi-select alimentant les lignes STOCK de
  // cr04e_divisionprojets). Requis pour le visa Commerce (owner 'com').
  'specificite_produit', 'groupe_marchandises', 'groupement_articles',
  // `ancien_numero_article` reste visible : c'est MARA-BISMT / ProductOldID côté SAP.
  'vl', 'article_prix', 'biv', 'dluc_dluo_critique', 'gestion_par_lots',
  'ean_carton', 'ean_couche', 'ean_palette', 'ean_manuel',
  'cle_calcul_lot_usine', 'cle_calcul_lot_stockiste',
  'profil_couverture_usine', 'profil_couverture_stockiste',
  'delai_securite_usine', 'delai_securite_stockiste',
  'delai_securite_couv_reelle_usine', 'delai_securite_couv_reelle_stockiste',
  'type_approvisionnement_usine', 'type_approvisionnement_stockiste',
  'appro_special', 'delai_previsionnel_livraison', 'temps_reception_stockiste',
  'unite_duree_vie',
]);

// Tableau « Emballages » (5 blocs) : exempté du contrôle « tous les champs remplis »
// pour la validation d'un visa — dimensions ET GTIN peuvent rester vides (demande métier).
export const EMBALLAGE_BLOCK_FIELDS = [
  'uvc_block', 'element_block', 'couche_block', 'colis_block', 'palette_block',
];

// Libellés lisibles des champs contrôlés au visa (pour le message « champs manquants »).
export const FIELD_LABELS = {
  // SC
  groupe_article: "Groupe d'article",
  groupe_ristourne: 'Groupe de ristournes',
  groupe_imputation: 'Groupe imputation article',
  groupe_statistique_article: 'Groupe statistique article',
  // IND
  libelle_etiquette_colis: 'Libellé étiquette colis',
  masque_etiquette_colis: 'Masque étiquette colis',
  designation_client_colis: 'Désignation client colis',
  eclatement_groupe_marchandise: 'Éclatement groupe marchandise',
  type_usine: "Type d'usine",
  type_palette: 'Type de palette',
  duree_vie: 'Durée de vie',
  temps_reception_usine: 'Temps de réception usine',
  format_date_etiquette_colis: 'Format date étiquette colis',
  format_dluo_etiquette_colis: 'Format DLUO étiquette colis',
  type_magasin: 'Type de magasin',
  ancien_numero_article: 'Ancien n° article',
  // COM
  design_normalisee: 'Désignation normalisée',
  libelle_long_40: 'Libellé long 40',
  libelle_caisse: 'Libellé article caisse',
  libelle_par_pays: 'Libellé par pays',
  hierarchie_produit: 'Hiérarchie produit',
  origine_fabrication: 'Origine de fabrication',
  canaux_distribution: 'Canaux de distribution',
  secteur_activite: "Secteur d'activité",
  marque: 'Marque',
  nomenclature_douaniere: 'Nomenclature douanière',
  sites_stockage: 'Sites de stockage',
};

// Une valeur est « remplie » : chaîne non vide, tableau non vide (multi-select /
// libellés par pays), ou tout scalaire non nul.
const isFilled = (v) => {
  if (Array.isArray(v)) return v.length > 0;
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  return true;
};

// Code activité (2 chiffres de tête) d'une hiérarchie produit : « 27 DE DE » -> « 27 ».
// Sert à filtrer la liste des familles produit (on ne propose que la même activité).
export const hierarchieActivite = (v) => {
  const m = String(v ?? '').trim().match(/^(\d{2})/);
  return m ? m[1] : '';
};

// Hiérarchie encore au gabarit hérité de la DE (« XX DE DE DE ») : elle doit être
// précisée (choix d'une vraie famille) avant de viser — tous les segments après
// l'activité valent « DE ». Sépare sur tabulations réelles, « \t » littéraux ou espaces.
export const isHierarchiePlaceholder = (v) => {
  const tokens = String(v ?? '').trim().split(/(?:\\t|\s)+/).filter(Boolean);
  return tokens.length >= 2 && tokens.slice(1).every((t) => t.toUpperCase() === 'DE');
};

// Champs vides mais requis pour poser le visa d'une section (`owner` = sc | ind | com).
// Exclut les champs retirés et les 5 blocs d'emballage (exemptés). Renvoie une liste
// de { name, label } — vide si tout est rempli (ou fiche/section absente).
export function getMissingVisaFields(fiche, owner) {
  if (!fiche || !owner) return [];
  return Object.entries(FIELD_OWNERS)
    .filter(([name, o]) =>
      o === owner &&
      !REMOVED_FIELDS.has(name) &&
      !EMBALLAGE_BLOCK_FIELDS.includes(name))
    // Bloquant si non rempli — OU, pour la hiérarchie produit, si elle est encore
    // au gabarit « XX DE DE » hérité de la DE (il faut choisir une vraie famille).
    .filter(([name]) =>
      !isFilled(fiche[name]) ||
      (name === 'hierarchie_produit' && isHierarchiePlaceholder(fiche[name])))
    .map(([name]) => ({
      name,
      label:
        name === 'hierarchie_produit' && isHierarchiePlaceholder(fiche[name])
          ? 'Hiérarchie produit (à préciser, pas « DE DE »)'
          : FIELD_LABELS[name] || name,
    }));
}
