// Données & formatage PURS de la Fiche de Lancement pour l'export PDF (react-pdf).
//
// Aucune dépendance UI : ces helpers transforment les champs de `fiche` en chaînes
// prêtes à afficher. Testés en isolation. Le rendu vectoriel vit dans
// FichePdfDocument.jsx ; l'orchestration (blob / base64) dans generateFichePdf.js.
//
// Plus d'échappement HTML (comme l'ancien gabarit) : react-pdf rend du texte
// vectoriel, il n'y a pas d'injection possible.

export const DASH = '—';

export const isEmpty = (v) =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0);

// Valeur affichable : « 0 » reste « 0 », vide devient « — ».
export const val = (v) => {
  if (v === 0 || v === '0') return '0';
  return isEmpty(v) ? DASH : String(v);
};

// Dimensions L × l × H d'un bloc emballage.
export const dims = (b) => {
  if (!b || [b.long, b.larg, b.haut].every(isEmpty)) return DASH;
  return `${val(b.long)} × ${val(b.larg)} × ${val(b.haut)}`;
};

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export const formatDateFr = (s) => {
  if (isEmpty(s)) return DASH;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
};

// Date courte (en-têtes) : « 20 juin ».
export const formatDateShort = (s) => {
  if (isEmpty(s)) return DASH;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Durée de vie « 548 J » : valeur + 1er token de l'unité (« J - Jours » → « J »).
export const dureeVie = (fiche) => {
  if (isEmpty(fiche.duree_vie)) return DASH;
  const unit = (fiche.unite_duree_vie || '').split(' ')[0];
  return `${val(fiche.duree_vie)}${unit ? ' ' + unit : ''}`;
};

// Caractères d'un EAN (1er élément du tableau) pour les cases de chiffres ; null si vide.
export const eanChars = (arr) => {
  const code = Array.isArray(arr) ? arr[0] : arr;
  if (isEmpty(code)) return null;
  return String(code).split('');
};

const VISA_LABEL = { signe: 'Signé', refuse: 'Refusé', attente: 'En attente' };

// État d'un visa : signé / refusé / en attente, + date formatée + motif éventuel.
export const visaInfo = (key, fiche) => {
  const signed = fiche[`visa_${key}`];
  const refused = fiche[`refus_${key}`];
  const rawDate = fiche[`visa_${key}_date`] || fiche[`refus_${key}_date`];
  const status = signed ? 'signe' : refused ? 'refuse' : 'attente';
  return {
    status,
    label: VISA_LABEL[status],
    date: rawDate ? formatDateShort(rawDate) : DASH,
    motif: fiche[`refus_${key}_motif`] || '',
  };
};

// Liste de pastilles à partir d'une valeur/tableau ; [] si vide.
export const pillsList = (arr) =>
  isEmpty(arr) ? [] : (Array.isArray(arr) ? arr : [arr]).map(String);
