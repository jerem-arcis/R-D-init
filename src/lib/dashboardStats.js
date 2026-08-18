// Agrégations & filtrage pour le tableau de bord (graphiques + KPI). Fonctions
// PURES (testées) : la page ne fait que brancher l'état des filtres et passer le
// résultat à recharts. Fonctionne indifféremment sur les données d'exemple
// (src/dev/dashboardSampleData) ou sur les vraies lignes cr04e_projet.

import { STATUTS, getStatutMeta } from './deStatus';

const MOIS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export const getTypeProjet = (p) => p.type_de || 'de';

const EN_COURS = new Set([
  'de_brouillon', 'ds_brouillon', 'de_attente_cc', 'ds_attente_cc', 'dl_attente_validation_cdg',
]);
// Validées = décision DE/DS OK (avant passage en SAP). `fl_sap_cree` (article créé
// dans SAP) est une étape SUIVANTE, comptée à part (creesSap) — pas dans validées.
const VALIDEES = new Set(['dl_validee', 'ds_validee']);
const ATTENTE_CC = new Set(['de_attente_cc', 'ds_attente_cc']);

function day(p) {
  const raw = p.created_date;
  if (!raw) return '';
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : '';
}

// Filtre le jeu de projets selon les critères actifs. Valeurs neutres :
// orgs=[] (aucun filtre org), type='all', usine='', statut='', dates=''.
export function filterProjets(projets, c = {}) {
  const orgs = c.orgs && c.orgs.length ? new Set(c.orgs) : null;
  return projets.filter((p) => {
    if (orgs && !orgs.has(p.organisation)) return false;
    if (c.type && c.type !== 'all' && getTypeProjet(p) !== c.type) return false;
    if (c.usine && p.usine_validee !== c.usine) return false;
    // Le filtre statut porte sur le LIBELLÉ (groupe) : « Brouillon » couvre
    // de_brouillon + ds_brouillon, « En attente de code chapeau » couvre les deux
    // clés d'attente, etc. Évite les doublons DE/DS dans la liste déroulante.
    if (c.statut && getStatutMeta(p.statut).label !== c.statut) return false;
    if (c.dateFrom || c.dateTo) {
      const d = day(p);
      if (!d) return false;
      if (c.dateFrom && d < c.dateFrom) return false;
      if (c.dateTo && d > c.dateTo) return false;
    }
    return true;
  });
}

// KPI synthétiques.
export function computeKpis(projets) {
  let enCours = 0, validees = 0, creesSap = 0, refusees = 0, attenteCC = 0;
  for (const p of projets) {
    if (EN_COURS.has(p.statut)) enCours += 1;
    if (VALIDEES.has(p.statut)) validees += 1;
    if (p.statut === 'fl_sap_cree') creesSap += 1;
    if (p.statut === 'dl_refusee') refusees += 1;
    if (ATTENTE_CC.has(p.statut)) attenteCC += 1;
  }
  return { total: projets.length, enCours, validees, creesSap, refusees, attenteCC };
}

// Répartition par statut, ordonnée selon STATUTS.order, avec libellé + tonalité
// (pour colorer les segments). Les statuts DE/DS de même libellé sont fusionnés.
export function byStatut(projets) {
  const acc = new Map();
  for (const p of projets) {
    const meta = getStatutMeta(p.statut);
    const key = meta.label;
    const prev = acc.get(key) || { label: meta.label, tone: meta.tone, order: meta.order ?? 99, value: 0 };
    prev.value += 1;
    acc.set(key, prev);
  }
  return [...acc.values()].sort((a, b) => a.order - b.order);
}

// Série mensuelle (montée en charge) : un point par mois présent, avec le détail
// DE / DS empilable.
export function byMonth(projets) {
  const acc = new Map();
  for (const p of projets) {
    const d = day(p);
    if (!d) continue;
    const ym = d.slice(0, 7); // YYYY-MM
    const prev = acc.get(ym) || { ym, de: 0, ds: 0, total: 0 };
    if (getTypeProjet(p) === 'ds') prev.ds += 1; else prev.de += 1;
    prev.total += 1;
    acc.set(ym, prev);
  }
  return [...acc.values()]
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .map((r) => {
      const m = Number(r.ym.slice(5, 7)) - 1;
      return { ...r, label: MOIS_FR[m] || r.ym };
    });
}

// Répartition par organisation commerciale (dimension multi-org). Sur des données
// réelles sans org, tout retombe dans « Non renseignée ».
export function byOrg(projets) {
  const acc = new Map();
  for (const p of projets) {
    const code = p.organisation || '-';
    const label = p.organisation_label || (p.organisation ? p.organisation : 'Non renseignée');
    const prev = acc.get(code) || { code, label, value: 0 };
    prev.value += 1;
    acc.set(code, prev);
  }
  return [...acc.values()].sort((a, b) => a.code.localeCompare(b.code));
}

// Répartition par usine (division).
export function byUsine(projets) {
  const acc = new Map();
  for (const p of projets) {
    const key = p.usine_validee || '-';
    const prev = acc.get(key) || { usine: key, value: 0 };
    prev.value += 1;
    acc.set(key, prev);
  }
  return [...acc.values()].sort((a, b) => b.value - a.value);
}

// Statuts présents, DÉDUPLIQUÉS PAR LIBELLÉ (pour peupler le filtre statut). La
// valeur retournée est le libellé lui-même : filterProjets filtre sur ce groupe,
// si bien que « Brouillon » ou « En attente de code chapeau » n'apparaissent
// qu'une fois, tout en couvrant les variantes DE et DS.
export function listStatuts(projets) {
  const acc = new Map(); // label -> { value, label, order }
  for (const p of projets) {
    if (!STATUTS[p.statut]) continue;
    const meta = getStatutMeta(p.statut);
    if (!acc.has(meta.label)) {
      acc.set(meta.label, { value: meta.label, label: meta.label, order: meta.order ?? 99 });
    }
  }
  return [...acc.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ value, label }) => ({ value, label }));
}
