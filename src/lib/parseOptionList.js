// Lecture d'un fichier Excel à une seule colonne pour l'ajout en masse de
// valeurs de liste déroulante (Admin).
//
// Format attendu (cf. modèle Classeur1.xlsx) : une table Excel sur la 1ère
// feuille, colonne A, avec un en-tête en A1 (ignoré) puis une valeur par ligne.

import { parseSharedStrings, parseSheetCells, unzipXlsx } from './xlsxLite';

// Met en forme une valeur de cellule : les entiers Excel (1, 2, 3…) restent des
// entiers, les décimaux gardent leur valeur, le texte est conservé tel quel.
function formatValeur(v) {
  if (v == null) return '';
  const s = String(v).trim();
  if (s === '' || s.startsWith('#')) return '';
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return Number.isInteger(n) ? String(n) : String(n);
  }
  return s;
}

// Choisit la première feuille du classeur (worksheets/sheet1.xml par défaut).
function pickFirstSheet(sheets) {
  const keys = Object.keys(sheets).filter((k) => /worksheets\/sheet\d+\.xml$/.test(k));
  if (keys.length === 0) return null;
  keys.sort((a, b) => {
    const na = Number(a.match(/sheet(\d+)\.xml$/)[1]);
    const nb = Number(b.match(/sheet(\d+)\.xml$/)[1]);
    return na - nb;
  });
  return sheets[keys[0]];
}

// cells -> liste de valeurs de la colonne A (en-tête A1 ignoré), nettoyées et
// dédupliquées en préservant l'ordre.
export function extractColumnA(cells, maxRow = 5000) {
  const out = [];
  const seen = new Set();
  for (let r = 2; r <= maxRow; r++) {
    const raw = cells['A' + r];
    if (raw == null) continue;
    const val = formatValeur(raw);
    if (val === '' || seen.has(val)) continue;
    seen.add(val);
    out.push(val);
  }
  return out;
}

// Entrée navigateur : un File -> { valeurs, fichier }.
export async function parseOptionListFile(file) {
  const buf = await file.arrayBuffer();
  const entries = await unzipXlsx(buf, ['xl/sharedStrings.xml', 'xl/worksheets/']);
  const sheetXml = pickFirstSheet(entries);
  if (!sheetXml) throw new Error('Aucune feuille trouvée dans le fichier.');
  const shared = parseSharedStrings(entries['xl/sharedStrings.xml']);
  const cells = parseSheetCells(sheetXml, shared);
  const valeurs = extractColumnA(cells);
  if (valeurs.length === 0) {
    throw new Error('Aucune valeur trouvée dans la colonne A (en-tête en ligne 1).');
  }
  return { valeurs, fichier: file.name };
}
