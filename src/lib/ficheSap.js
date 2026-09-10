// Couche de génération FL → SAP. Fonctions PURES et testées (comme deRules.js /
// dsRules.js), consommées à l'envoi SAP de la Fiche de Lancement. La vue FL ne
// contient que les saisies ; tout le reste (constantes, règles) est produit ici.
//
// Source : docs/mapping-fl.md (§3 Règles, §4 Constantes). On implémente d'abord les
// règles auto-portantes (pilotées par origine de fabrication / type article /
// hiérarchie produit / palette). Les règles dépendant d'un champ encore absent du
// modèle (facturation « TDL », produit bio, OneShot, quarantaine) sont écrites mais
// prennent l'entrée en paramètre — voir PENDING_RULES. Les unités de mesure (8 lignes
// UoM) sont gérées à part par computeEmballagesSap (src/lib/emballagesSap.js).

import { computeEmballagesSap } from '@/lib/emballagesSap';

const s = (v) => String(v ?? '').trim();

// ---------- Helpers d'extraction ----------

// 4 premiers caractères de l'origine de fabrication ("2886-Bonloc" -> "2886").
export const origine4 = (v) => s(v).slice(0, 4);

// Caractères 17 à 20 du type article (Excel MID(type,17,4)).
// "3A-Produit Fini:PFINI" -> "PFIN" ; "...:SFIN" -> "SFIN".
export const typeChars17a20 = (t) => String(t ?? '').slice(16, 20);

// Produit semi-fini : caractères 17-20 = "SFIN".
export const isSFIN = (t) => typeChars17a20(t) === 'SFIN';

// Négoce : les 6 derniers caractères du type article = "NEGOCE".
export const isNegoce = (t) => s(t).slice(-6).toUpperCase() === 'NEGOCE';

// Préfixe robuste (casse/espaces ignorés).
export const startsWith = (v, p) => s(v).toUpperCase().startsWith(String(p).toUpperCase());

// Code Z d'un type d'usine ("Z008 - Bonloc" -> "Z008"). '' si absent.
export const codeTypeUsine = (v) => (s(v).match(/Z\d+/i) || [''])[0].toUpperCase();

// ---------- Constantes (mapping-fl §4) ----------
// Valeurs fixes câblées en dur dans le payload SAP.
export const SAP_CONSTANTS = {
  'MARA-MEINS': 'U',          // Unité de qté base
  'MARA-MEINH': 'U',          // Unité de qté base (données de base)
  'MVKE-VRKME': 'CAR',        // OC1 - unité de vente
  'MARA-TRAGR': 'Z001',       // Groupe de transport
  'MARC-HERKL': 'FR',         // Pays d'origine
  'MARC-HERKR': '31',         // Région d'origine
  'MARA-BSTME': 'CAR',        // Unité d'achat
  'MARA-VABME': '1',          // UA variable 1
  'MARC-BSTRF': '1',          // Valeur d'arrondi
  'MARC-LGFSB': '95',         // Magasin pour appro. ext.
  'MARC-FHORI': '000',        // Clé d'horizon
  'MARC-PERKZ': 'W',          // Indicateur période
  'MARC-SBDKZ': '2',          // Individuel/Collectif
  'MARA-BEHVO': '01',         // Consigne d'emballage
  'MARA-RAUBE': 'SU',         // Condition de stockage
  'MBEW-PEINH': '1000',       // Unité de prix
  'MBEW-VPRSV': 'S',          // Code prix
  'MBEW-STPRS': '1',          // Prix standard
  'DOUANE-REGIME': '0001',    // Régime douanier
  'POP-PROFIL': 'Z1',         // Profil contrôle POP
  'MBSA-TYPE-SUPPORT': 'SME80', // Type de support (Palette 80x120 Eu)
  'POF-TYPE-RECHERCHE': 'CE', // Détermination POF
};

// ---------- Règles (mapping-fl §3) ----------

// Org commerciale (MVKE-VKORG) : origine 2834/2866 -> OC37, sinon OC28.
export const computeOrgCommerciale = (origine) => {
  const c = origine4(origine);
  return (c === '2834' || c === '2866') ? 'OC37' : 'OC28';
};

// Numéro magasin (LGORT/MARD) : selon l'origine (caractères 1 à 4).
const NUMERO_MAGASIN = { 2802: '802', 2833: '833', 2847: '847', 2886: '886' };
export const computeNumeroMagasin = (origine) => NUMERO_MAGASIN[origine4(origine)] || '';

// Document (ZEINR) : selon l'origine.
const DOCUMENT = { 2802: '1106901', 2886: '64134100', 2847: '4709104' };
export const computeDocument = (origine) => DOCUMENT[origine4(origine)] || '';

// Groupe autorisations (MARA-BEGRU) : SFIN -> vide, sinon caractères 17-20 du type.
export const computeGroupeAutorisation = (type) => (isSFIN(type) ? '' : typeChars17a20(type));

// Contrôle disponibilité (MARC-MTVFP) : SFIN -> Z2, sinon Z3.
export const computeControleDisponibilite = (type) => (isSFIN(type) ? 'Z2' : 'Z3');

// Groupe d'acheteur (MARC-EKGRP) : négoce -> Négoce, sinon Interne.
export const computeGroupeAcheteur = (type) =>
  isNegoce(type) ? 'NEG-Groupe acheteurs Négoce' : 'INT-Groupe acheteurs Interne';

// Groupe de planif (MARC-DISGR) : caractères 6-7 de la hiérarchie ≠ "70" -> Z001, sinon Z002.
export const computeGroupePlanif = (hierChars67) => (s(hierChars67) === '70' ? 'Z002' : 'Z001');

// Type planification (MARC-DISMM) : SFIN -> PD, sinon Z5.
export const computeTypePlanification = (type) => (isSFIN(type) ? 'PD' : 'Z5');

// Horizon planif fixe (MARC-FXHOR) : négoce -> 1, sinon 5.
export const computeHorizonPlanifFixe = (type) => (isNegoce(type) ? '1' : '5');

// Gestionnaire (MARC-DISPO) : origine, sinon SFIN -> 011, sinon 120.
const GESTIONNAIRE = { 2802: '102', 2833: '133', 2847: '147', 2886: '186' };
export const computeGestionnaire = (origine, type) =>
  GESTIONNAIRE[origine4(origine)] || (isSFIN(type) ? '011' : '120');

// Clé calc taille lot (MARC-DISLS) : SFIN -> EX, sinon 2 premiers car. de la clé usine.
export const computeCleCalcTailleLot = (type, cleUsine) =>
  isSFIN(type) ? 'EX' : s(cleUsine).slice(0, 2);

// Type approvisionnement (MARC-BESKZ) : négoce -> F, sinon E.
export const computeTypeApprovisionnement = (type) => (isNegoce(type) ? 'F' : 'E');

// Magasin production (MARC-LGPRO) : SFIN -> Mag.usine, sinon 95.
export const computeMagasinProduction = (type) => (isSFIN(type) ? 'Mag.usine' : '95');

// Classe de valorisation (MBEW-BKLAS).
export const computeClasseValorisation = (type, hierPrefix2) => {
  const h = s(hierPrefix2);
  if (isNegoce(type)) {
    if (h === '27') return '2038'; // négoce traiteur
    if (h === '21') return '2027'; // crèmes glacées
    if (h === '22') return '2030'; // négoce pâtisserie
  }
  if (isSFIN(type)) return '4022'; // produits semi-finis
  return '7012'; // produits finis
};

// Groupe de frais généraux (MBEW-KOSGR) : négoce -> NEGO, sinon FG.
export const computeGroupeFraisGeneraux = (type) => (isNegoce(type) ? 'NEGO' : 'FG');

// TUS - type unité de stockage (MLGN-LETY1) : 4e caractère du type palette = "8"
// -> palette 80x120, sinon 100x120.
export const computeTUS = (typePalette) =>
  s(typePalette).charAt(3) === '8' ? 'Z81 :palette 80x120' : 'Z82 :palette 100x120';

// ---- Bloc MRP4 / WM : neutralisé si groupe marchandise vide, ou (PF-H ET facturation TDL) ----
// Renvoie true quand le bloc doit rester VIDE.
export const mrp4Neutralise = (groupeMarchandise, facturation) => {
  const g = s(groupeMarchandise);
  if (!g) return true;
  if (startsWith(g, 'PF-H') && s(facturation).toUpperCase() === 'TDL') return true;
  return false;
};

// Fabrication répétitive (MARC-SAUFT).
export const computeFabRepetitive = (groupeMarchandise, facturation) =>
  mrp4Neutralise(groupeMarchandise, facturation) ? '' : 'true';

// Profil fabric répét (MARC-SFEPR) : code du type d'usine, sinon vide.
export const computeProfilFabricRepet = (groupeMarchandise, facturation, typeUsine) =>
  mrp4Neutralise(groupeMarchandise, facturation) ? '' : codeTypeUsine(typeUsine);

// Unité de sortie (MARC-AUSME) -> CAR ; Unité de production (MARC-FRTME) -> PAL.
export const computeUniteSortie = (groupeMarchandise, facturation) =>
  mrp4Neutralise(groupeMarchandise, facturation) ? '' : 'CAR';
export const computeUniteProduction = (groupeMarchandise, facturation) =>
  mrp4Neutralise(groupeMarchandise, facturation) ? '' : 'PAL';

// Donn.div./stockage 2 (MLGN) : unité WM CAR / UQ défaut M / entrée add. autorisée.
export const computeUniteQuantiteWM = (groupeMarchandise, facturation) =>
  mrp4Neutralise(groupeMarchandise, facturation) ? '' : 'CAR';
export const computeUQDefaut = (groupeMarchandise, facturation) =>
  mrp4Neutralise(groupeMarchandise, facturation) ? '' : 'M';

// Type magasin EM (MLGN-LTKZE) : neutralisé, sinon Agen2 (2847) selon hauteur palette.
export const computeTypeMagasinEM = (groupeMarchandise, facturation, origine, hauteurPalette) => {
  if (mrp4Neutralise(groupeMarchandise, facturation)) return '';
  if (origine4(origine) !== '2847') return '001';
  const h = Number(hauteurPalette);
  if (Number.isNaN(h)) return '001';
  return h <= 1500 ? '002' : '003';
};

// ---------- Agrégat ----------
// Règles écrites mais non câblées faute de champ de saisie dans le modèle actuel.
export const PENDING_RULES = [
  'MARD-LGORT (Magasin) — dépend de facturation « TDL »',
  'MARC-LADGR (Grp charg) — dépend de facturation « TDL »',
  'MVKE-SCMNG (OC1-Unité Livraison) — dépend de OneShot',
  'MARC-WEBAZ (Temps de réception) — dépend de la quarantaine',
  'MBSA MASQUE SPECIFIQUE — dépend de produit bio',
  'Classification AUSP (001/023), consignes POP/POF — services custom',
];

// Construit le payload SAP « données article » à partir de la fiche.
// Renvoie un objet clé SAP -> valeur + les 8 lignes UoM sous `unitsOfMeasure`.
export function computeFicheSap(fiche = {}) {
  const type = fiche.type_article ?? fiche.fabrication_negoce;
  const origine = fiche.origine_fabrication;
  const grpMarch = fiche.groupe_marchandises;
  const facturation = fiche.facturation; // champ à venir (voir PENDING_RULES)
  const hier = s(fiche.hierarchie_produit);
  const hierPrefix2 = hier.slice(0, 2);

  return {
    ...SAP_CONSTANTS,
    'MVKE-VKORG': computeOrgCommerciale(origine),
    // OC2 — groupements ADV saisis dans la FL (SupplyChainSection), poussés tels
    // quels : article/ristourne en libellé complet (« AY-MB INTERMARCHE »),
    // statistique/imputation en code (« 1 » / « 01 »). Cf. listes ficheSchema.
    'MVKE-VERSG': s(fiche.groupe_statistique_article),
    'MVKE-KONDM': s(fiche.groupe_article),
    'MVKE-BONUS': s(fiche.groupe_ristourne),
    'MVKE-KTGRM': s(fiche.groupe_imputation),
    'MARD-NUMMAG': computeNumeroMagasin(origine),
    'ZEINR': computeDocument(origine),
    'MARA-BEGRU': computeGroupeAutorisation(type),
    'MARC-MTVFP': computeControleDisponibilite(type),
    'MARC-EKGRP': computeGroupeAcheteur(type),
    'MARC-DISMM': computeTypePlanification(type),
    'MARC-FXHOR': computeHorizonPlanifFixe(type),
    'MARC-DISPO': computeGestionnaire(origine, type),
    'MARC-DISLS': computeCleCalcTailleLot(type, fiche.cle_calcul_lot_usine),
    'MARC-BESKZ': computeTypeApprovisionnement(type),
    'MARC-LGPRO': computeMagasinProduction(type),
    'MBEW-BKLAS': computeClasseValorisation(type, hierPrefix2),
    'MBEW-KOSGR': computeGroupeFraisGeneraux(type),
    'MLGN-LETY1': computeTUS(fiche.type_palette),
    'MARC-SAUFT': computeFabRepetitive(grpMarch, facturation),
    'MARC-SFEPR': computeProfilFabricRepet(grpMarch, facturation, fiche.type_usine),
    'MARC-AUSME': computeUniteSortie(grpMarch, facturation),
    'MARC-FRTME': computeUniteProduction(grpMarch, facturation),
    'MLGN-LVSME': computeUniteQuantiteWM(grpMarch, facturation),
    'MLGN-VOMEM': computeUQDefaut(grpMarch, facturation),
    'MLGN-LTKZE': computeTypeMagasinEM(grpMarch, facturation, origine, fiche.palette_block?.haut),
    unitsOfMeasure: computeEmballagesSap(fiche),
  };
}
