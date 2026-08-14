// Couche de génération SAP pour les unités de mesure (A_ProductUnitsOfMeasure /
// table Dataverse cr04e_unitofmeasure). À partir des 5 blocs saisis dans la FL
// (uvc / element / couche / colis / palette), on génère les 8 lignes SAP :
// U, UE, ZCO, CAR, PAL (physiques) + PCB, ZPP, ZUG (dérivées).
//
// Règles (source : MappingChamp_Final, onglet unitofmeasure + fichiers FM de test
// onglets Industriel « PCB / rang sup. » et Imprimable) :
//
//   Unité | Num (X)              | Dénom (Y) | Origine du compteur
//   ------+----------------------+-----------+---------------------------------
//   U     | 1                    | 1         | —
//   UE    | element.unite        | 1         | nb d'U.élém par UVC
//   CAR   | 1                    | colis.unite    | nb d'UVC par colis
//   ZCO   | 1                    | couche.unite   | nb d'UVC par couche (cumul)
//   PAL   | 1                    | palette.unite  | nb d'UVC par palette (cumul)
//   PCB   | colis.unite          | 1         | = CAR dénom
//   ZPP   | palette.unite        | 1         | = PAL dénom
//   ZUG   | uvc.poids_net * 1000 | 1000      | net UVC × 1000
//
// - `unite` de chaque bloc = compteur cumulé d'UVC pour ce niveau (element = U.élém/UVC).
// - Dimensions saisies en mm → SAP en cm (÷10), ProductMeasurementUnit = CM.
// - MaterialVolume calculé depuis les dimensions : CM3 (=cm³) pour U, CDM (=dm³) pour
//   CAR/ZCO/PAL. Le volume *saisi* (en L) ne sert qu'à ZUG.
// - GTIN partagé : U/ZPP/PCB reprennent le GTIN UVC ; CAR/ZCO/PAL le leur.
// - GlobalTradeItemNumberCategory laissé vide pour l'instant (valeurs connues :
//   HE pour U/ZPP/PCB/UE, Z1 pour CAR/ZCO/PAL — à activer plus tard).

const isNil = (v) => v === null || v === undefined || v === '';

// Nombre -> chaîne SAP (point décimal, arrondi pour éviter le bruit flottant).
// Renvoie null si non renseigné / non numérique.
function numStr(v, dp = 6) {
  if (isNil(v) || Number.isNaN(Number(v))) return null;
  const f = 10 ** dp;
  return String(Math.round(Number(v) * f) / f);
}

// Volume matériau depuis les dimensions en mm.
//   cm³  = long*larg*haut / 1000        (mm³ -> cm³)
//   dm³  = long*larg*haut / 1_000_000   (mm³ -> dm³, pour CDM)
function volumeFromDims({ long, larg, haut }, cdm) {
  if ([long, larg, haut].some(isNil)) return null;
  const mm3 = Number(long) * Number(larg) * Number(haut);
  return numStr(cdm ? mm3 / 1_000_000 : mm3 / 1000);
}

// Pose une colonne uniquement si la valeur est renseignée (champs vides omis).
function set(row, col, val) {
  if (!isNil(val)) row[col] = val;
  return row;
}

// Colonnes poids / dimensions / volume / GTIN communes aux unités physiques.
// bloc : bloc FL source ; volumeUnit : 'CM3' | 'CDM' ; cdm : true pour ÷1_000_000.
function physicalColumns(row, bloc, { volumeUnit, cdm, gtin }) {
  row.cr04e_weightunit = 'KG';
  row.cr04e_volumeunit = volumeUnit;
  row.cr04e_productmeasurementunit = 'CM';
  set(row, 'cr04e_grossweight', numStr(bloc.poids_brut));
  set(row, 'cr04e_netweight', numStr(bloc.poids_net));
  set(row, 'cr04e_unitspecificproductlength', numStr(isNil(bloc.long) ? null : Number(bloc.long) / 10));
  set(row, 'cr04e_unitspecificproductwidth', numStr(isNil(bloc.larg) ? null : Number(bloc.larg) / 10));
  set(row, 'cr04e_unitspecificproductheight', numStr(isNil(bloc.haut) ? null : Number(bloc.haut) / 10));
  set(row, 'cr04e_materialvolume', volumeFromDims(bloc, cdm));
  set(row, 'cr04e_globaltradeitemnumber', gtin);
  return row;
}

// Ligne de base : code unité + numérateur/dénominateur + unité de base U.
function baseRow(unit, num, den) {
  const row = { cr04e_alternativeunit: unit, cr04e_baseunit: 'U' };
  set(row, 'cr04e_quantitynumerator', numStr(num));
  set(row, 'cr04e_quantitydenominator', numStr(den));
  return row;
}

const isEmpty = (b = {}) =>
  ['unite', 'poids_brut', 'poids_net', 'long', 'larg', 'haut', 'volume', 'gtin']
    .every((f) => isNil(b[f]));

// Génère les lignes SAP cr04e_unitofmeasure (colonnes cr04e_*, champs vides omis)
// pour un article, à partir de ses blocs d'emballage FL.
export function computeEmballagesSap(blocs = {}) {
  const uvc = blocs.uvc_block || {};
  const element = blocs.element_block || {};
  const couche = blocs.couche_block || {};
  const colis = blocs.colis_block || {};
  const palette = blocs.palette_block || {};
  const rows = [];

  // U — unité de base (UVC consommateur). GTIN UVC réutilisé par ZPP/PCB.
  const gtinUvc = isNil(uvc.gtin) ? null : uvc.gtin;
  if (!isEmpty(uvc)) {
    rows.push(physicalColumns(baseRow('U', 1, 1), uvc, { volumeUnit: 'CM3', cdm: false, gtin: gtinUvc }));
  }

  // UE — U.élém par UVC (compteur au numérateur). WeightUnit KG, pas de dimensions.
  if (!isNil(element.unite)) {
    const ue = baseRow('UE', element.unite, 1);
    ue.cr04e_weightunit = 'KG';
    rows.push(ue);
  }

  // CAR — colis. Dénominateur = nb d'UVC par colis.
  if (!isEmpty(colis)) {
    rows.push(physicalColumns(baseRow('CAR', 1, colis.unite), colis, { volumeUnit: 'CDM', cdm: true, gtin: colis.gtin }));
  }

  // ZCO — couche. Dénominateur = nb d'UVC par couche (cumul).
  if (!isEmpty(couche)) {
    rows.push(physicalColumns(baseRow('ZCO', 1, couche.unite), couche, { volumeUnit: 'CDM', cdm: true, gtin: couche.gtin }));
  }

  // PAL — palette. Dénominateur = nb d'UVC par palette (cumul).
  if (!isEmpty(palette)) {
    rows.push(physicalColumns(baseRow('PAL', 1, palette.unite), palette, { volumeUnit: 'CDM', cdm: true, gtin: palette.gtin }));
  }

  // PCB — dérivée : nb d'UVC par colis au numérateur (= CAR dénom).
  if (!isNil(colis.unite)) {
    rows.push(set(baseRow('PCB', colis.unite, 1), 'cr04e_globaltradeitemnumber', gtinUvc));
  }

  // ZPP — dérivée : nb d'UVC par palette au numérateur (= PAL dénom).
  if (!isNil(palette.unite)) {
    rows.push(set(baseRow('ZPP', palette.unite, 1), 'cr04e_globaltradeitemnumber', gtinUvc));
  }

  // ZUG — dérivée : poids net UVC × 1000 / 1000. Volume UVC saisi (en L).
  if (!isNil(uvc.poids_net)) {
    const zug = baseRow('ZUG', Number(uvc.poids_net) * 1000, 1000);
    zug.cr04e_volumeunit = 'L';
    set(zug, 'cr04e_materialvolume', numStr(uvc.volume));
    rows.push(zug);
  }

  return rows;
}

export const _internals = { numStr, volumeFromDims };
