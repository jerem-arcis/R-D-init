// Mini-lecteur xlsx/xlsm sans dépendance.
// Un classeur Excel est une archive ZIP de fichiers XML. On n'a besoin que de
// lire quelques entrées (workbook, rels, sharedStrings, une feuille) et d'en
// extraire les cellules — pas d'écriture, pas de styles, pas de formats.
//
// Les fonctions de parsing XML sont *pures* (string -> données) afin d'être
// testables sous Node. La seule partie dépendante du navigateur est `unzipXlsx`,
// qui s'appuie sur `DecompressionStream('deflate-raw')`.

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&'); // en dernier pour ne pas ré-interpréter
}

// sharedStrings.xml -> tableau de chaînes indexé.
export function parseSharedStrings(xml) {
  if (!xml) return [];
  const out = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    const parts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]);
    out.push(decodeXmlEntities(parts.join('')));
  }
  return out;
}

// Une feuille -> { "G7": "valeur", ... }. Les chaînes partagées (t="s") sont
// résolues via `sharedStrings`, les chaînes en ligne (t="inlineStr") et les
// nombres sont lus tels quels.
export function parseSheetCells(xml, sharedStrings = []) {
  const cells = {};
  if (!xml) return cells;
  const cellRe = /<c\s+r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let c;
  while ((c = cellRe.exec(xml))) {
    const ref = c[1];
    const attrs = c[2] || '';
    const inner = c[3] || '';
    const tMatch = /t="([^"]+)"/.exec(attrs);
    const t = tMatch ? tMatch[1] : 'n';
    let val = null;
    const vMatch = /<v>([\s\S]*?)<\/v>/.exec(inner);
    const isMatch = /<is>([\s\S]*?)<\/is>/.exec(inner);
    if (t === 's' && vMatch) {
      val = sharedStrings[Number(vMatch[1])] ?? '';
    } else if (t === 'inlineStr' && isMatch) {
      const parts = [...isMatch[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]);
      val = decodeXmlEntities(parts.join(''));
    } else if (vMatch) {
      val = decodeXmlEntities(vMatch[1]);
    }
    if (val != null) cells[ref] = val;
  }
  return cells;
}

// Résout le chemin d'une feuille à partir de son nom affiché.
// workbook.xml relie nom -> r:id ; workbook.xml.rels relie r:id -> Target.
export function resolveSheetTarget(workbookXml, relsXml, sheetName) {
  const sheetRe = /<sheet\b[^>]*\bname="([^"]*)"[^>]*\br:id="([^"]+)"[^>]*\/?>/g;
  let m;
  let rId = null;
  while ((m = sheetRe.exec(workbookXml))) {
    if (decodeXmlEntities(m[1]) === sheetName) {
      rId = m[2];
      break;
    }
  }
  if (!rId) return null;
  const relRe = new RegExp(`<Relationship\\b[^>]*\\bId="${rId}"[^>]*\\bTarget="([^"]+)"`, 'i');
  const r = relRe.exec(relsXml);
  if (!r) return null;
  return r[1].replace(/^\/?xl\//, '').replace(/^\//, ''); // -> "worksheets/sheetN.xml"
}

// --- Couche ZIP (navigateur) ---

async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

// Lit l'archive ZIP via son "central directory" (fiable pour tailles & offsets)
// et renvoie { "xl/worksheets/sheet1.xml": "<xml…>", ... } pour les entrées
// dont le nom contient une des chaînes de `wanted`.
export async function unzipXlsx(arrayBuffer, wanted) {
  const dv = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);

  // Localise l'End Of Central Directory (signature 0x06054b50), en partant de la fin.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Archive invalide (EOCD introuvable)');

  const cdCount = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true); // offset du central directory

  const td = new TextDecoder('utf-8');
  const matches = (name) => wanted.some((w) => name.includes(w));
  const result = {};

  for (let n = 0; n < cdCount; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = td.decode(bytes.subarray(p + 46, p + 46 + nameLen));

    if (matches(name)) {
      // En-tête local : nom + extra peuvent différer de ceux du central dir.
      const lNameLen = dv.getUint16(localOff + 26, true);
      const lExtraLen = dv.getUint16(localOff + 28, true);
      const dataStart = localOff + 30 + lNameLen + lExtraLen;
      const comp = bytes.subarray(dataStart, dataStart + compSize);
      const raw = method === 0 ? comp : await inflateRaw(comp);
      result[name] = td.decode(raw);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return result;
}
