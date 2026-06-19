// Extraction des champs de Déclinaison Logistique depuis le fichier Excel de
// Demande d'Étude (onglet « Fiche Demande »).
//
// Mise en page de l'onglet (bloc de droite) :
//   colonne G = libellé de la ligne
//   colonne H = valeur côté DE
//   colonne I = valeur côté DL
// On récupère donc, pour chaque ligne où G est renseignée, le couple (libellé, valeur DL),
// en gardant aussi la valeur DE pour comparaison.

import {
  parseSharedStrings,
  parseSheetCells,
  resolveSheetTarget,
  unzipXlsx,
} from './xlsxLite';

const FEUILLE_DEMANDE = 'Fiche Demande';

// Met en forme une valeur de cellule : arrondit les nombres « sales » issus
// des calculs Excel (75.33333333 -> 75,33), laisse le reste tel quel.
function formatValeur(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (s.startsWith('#')) return ''; // erreurs Excel (#DIV/0!, #VALUE!…)
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2).replace('.', ',');
  }
  return s;
}

// Dernière ligne à conserver (incluse) du bloc de droite.
const LIGNE_FIN = 'Mise à dispo Client';
// Libellés (colonne G) à ne pas remonter : en-têtes de section sans donnée.
const LIGNES_EXCLUES = new Set(['Dates Rétro-Planning du lancement']);
// Marqueur des lignes DL portées par la colonne H (le libellé est dans H).
const MARQUEUR_DL_H = 'pour DL seulement';

// cells -> [{ ligne, de, dl }].
// On remonte les libellés de la colonne G (valeurs DE en H, DL en I) jusqu'à
// « Mise à dispo Client » inclus, puis on ajoute les lignes DL spécifiques
// dont le libellé est porté par la colonne H (« pour DL seulement : … »).
export function extractDLChamps(cells, maxRow = 200) {
  const champs = [];
  for (let r = 1; r <= maxRow; r++) {
    const ligne = cells['G' + r];
    if (ligne == null || String(ligne).trim() === '') continue;
    const label = String(ligne).trim();
    if (!LIGNES_EXCLUES.has(label)) {
      champs.push({
        ligne: label,
        de: formatValeur(cells['H' + r]),
        dl: formatValeur(cells['I' + r]),
      });
    }
    if (label === LIGNE_FIN) break;
  }
  // Lignes attendues côté DL, dont le libellé est en colonne H.
  for (let r = 1; r <= maxRow; r++) {
    const h = cells['H' + r];
    if (h && String(h).includes(MARQUEUR_DL_H)) {
      champs.push({ ligne: String(h).trim(), de: '', dl: formatValeur(cells['I' + r]) });
    }
  }
  return champs;
}

// Orchestrateur pur : reçoit les XML déjà décompressés, renvoie les champs.
// `sheets` est un objet { "worksheets/sheet1.xml": "<xml>" }.
export function parseDLFromEntries({ workbookXml, relsXml, sharedStringsXml, sheets }) {
  const target = resolveSheetTarget(workbookXml, relsXml, FEUILLE_DEMANDE) || 'worksheets/sheet1.xml';
  const sheetXml =
    sheets[target] ||
    sheets['xl/' + target] ||
    sheets[Object.keys(sheets).find((k) => k.endsWith(target)) || ''];
  if (!sheetXml) throw new Error(`Feuille « ${FEUILLE_DEMANDE} » introuvable dans le fichier`);
  const shared = parseSharedStrings(sharedStringsXml);
  const cells = parseSheetCells(sheetXml, shared);
  return { feuille: FEUILLE_DEMANDE, champs: extractDLChamps(cells) };
}

// Entrée navigateur : un File -> champs extraits.
export async function parseDLFile(file) {
  const buf = await file.arrayBuffer();
  const entries = await unzipXlsx(buf, [
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
    'xl/sharedStrings.xml',
    'xl/worksheets/',
  ]);
  const result = parseDLFromEntries({
    workbookXml: entries['xl/workbook.xml'],
    relsXml: entries['xl/_rels/workbook.xml.rels'],
    sharedStringsXml: entries['xl/sharedStrings.xml'],
    sheets: entries,
  });
  return { ...result, fichier: file.name };
}
