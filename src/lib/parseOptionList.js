// Lecture d'un fichier Excel pour l'ajout en masse de valeurs de liste
// déroulante (Admin).
//
// Format attendu (cf. modèle Classeur2.xlsx) : une table Excel sur la 1ère
// feuille, en-tête en ligne 1 (ignoré), puis :
//   - colonne A : la valeur (obligatoire)
//   - colonne B : la désignation (facultative)

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

// cells -> liste de lignes { value, designation } (en-tête ligne 1 ignoré),
// nettoyées et dédupliquées sur la valeur (colonne A) en préservant l'ordre.
// La désignation (colonne B) est facultative.
export function extractRows(cells, maxRow = 5000) {
  const out = [];
  const seen = new Set();
  for (let r = 2; r <= maxRow; r++) {
    const raw = cells['A' + r];
    if (raw == null) continue;
    const value = formatValeur(raw);
    if (value === '' || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, designation: formatValeur(cells['B' + r]) });
  }
  return out;
}

// Entrée navigateur : un File -> { lignes, fichier }.
// `lignes` : [{ value, designation }] (désignation = '' si colonne B vide).
export async function parseOptionListFile(file) {
  const buf = await file.arrayBuffer();
  const entries = await unzipXlsx(buf, ['xl/sharedStrings.xml', 'xl/worksheets/']);
  const sheetXml = pickFirstSheet(entries);
  if (!sheetXml) throw new Error('Aucune feuille trouvée dans le fichier.');
  const shared = parseSharedStrings(entries['xl/sharedStrings.xml']);
  const cells = parseSheetCells(sheetXml, shared);
  const lignes = extractRows(cells);
  if (lignes.length === 0) {
    throw new Error('Aucune valeur trouvée dans la colonne A (en-tête en ligne 1).');
  }
  return { lignes, fichier: file.name };
}
