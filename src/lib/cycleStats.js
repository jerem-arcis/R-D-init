// Calculs statistiques pour le cycle de vie d'une Fiche de Lancement (FL).
// Mesure les temps de transition entre les 7 étapes du workflow.

export const STEPS = [
  { key: 'creation', label: 'Création', shortLabel: 'Création', dateField: 'created_date', color: 'slate' },
  { key: 'cg', label: 'Contrôle de Gestion', shortLabel: 'CG', dateField: 'visa_controle_gestion_date', color: 'violet' },
  { key: 'sc', label: 'Supply Chain', shortLabel: 'SC', dateField: 'visa_supply_chain_date', color: 'sky' },
  { key: 'gb', label: 'Gestion du Besoin', shortLabel: 'GB', dateField: 'visa_gestion_besoin_date', color: 'emerald' },
  { key: 'ind', label: 'Industriel', shortLabel: 'Ind', dateField: 'visa_industriel_date', color: 'amber' },
  { key: 'com', label: 'Commerce', shortLabel: 'Com', dateField: 'visa_commerce_date', color: 'rose' },
  { key: 'sap', label: 'Création SAP', shortLabel: 'SAP', dateField: 'date_creation_sap', color: 'indigo' },
];

// 6 transitions: création→cg, cg→sc, sc→gb, gb→ind, ind→com, com→sap
export const TRANSITIONS = STEPS.slice(0, -1).map((from, i) => ({
  key: `${from.key}_to_${STEPS[i + 1].key}`,
  from,
  to: STEPS[i + 1],
  label: `${from.shortLabel} → ${STEPS[i + 1].shortLabel}`,
}));

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

export const PERIODS = [
  { key: '30d', label: '30 derniers jours', days: 30 },
  { key: '90d', label: '90 derniers jours', days: 90 },
  { key: 'all', label: 'Tout', days: null },
];

// Filtre les fiches par période (sur created_date) et option "terminées seulement"
export function filterFiches(fiches, periodKey, terminatedOnly) {
  if (!Array.isArray(fiches)) return [];
  const period = PERIODS.find((p) => p.key === periodKey);
  const cutoff = period?.days ? Date.now() - period.days * MS_PER_DAY : null;

  return fiches.filter((f) => {
    if (cutoff && f.created_date) {
      const created = new Date(f.created_date).getTime();
      if (created < cutoff) return false;
    }
    if (terminatedOnly) {
      return f.statut_sap === 'Création SAP effectuée';
    }
    return true;
  });
}

// Pour une transition donnée, retourne les durées (en ms) sur les fiches qui ont les 2 dates
function getDurationsForTransition(fiches, transition) {
  const durations = [];
  for (const f of fiches) {
    const fromDate = f[transition.from.dateField];
    const toDate = f[transition.to.dateField];
    if (!fromDate || !toDate) continue;
    const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
    if (ms < 0) continue; // données incohérentes, on ignore
    durations.push(ms);
  }
  return durations;
}

function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Statistiques par transition
export function computeTransitions(fiches) {
  return TRANSITIONS.map((t) => {
    const durations = getDurationsForTransition(fiches, t);
    return {
      ...t,
      count: durations.length,
      avg: avg(durations),
      median: median(durations),
      min: durations.length ? Math.min(...durations) : null,
      max: durations.length ? Math.max(...durations) : null,
    };
  });
}

// KPIs globaux
export function computeKPIs(fiches, transitions) {
  // Durée totale moyenne (création → SAP) sur fiches terminées
  const fullCycles = fiches
    .filter((f) => f.created_date && f.date_creation_sap)
    .map((f) => ({
      fiche: f,
      duration: new Date(f.date_creation_sap).getTime() - new Date(f.created_date).getTime(),
    }))
    .filter((x) => x.duration >= 0);

  const totalAvg = avg(fullCycles.map((x) => x.duration));

  let fastest = null;
  let slowest = null;
  for (const x of fullCycles) {
    if (!fastest || x.duration < fastest.duration) fastest = x;
    if (!slowest || x.duration > slowest.duration) slowest = x;
  }

  // Goulot d'étranglement = transition avec la plus grande moyenne
  const validTransitions = transitions.filter((t) => t.avg != null);
  const bottleneck = validTransitions.length
    ? validTransitions.reduce((a, b) => (a.avg > b.avg ? a : b))
    : null;

  return {
    totalAvg,
    fastest,
    slowest,
    bottleneck,
    completedCount: fullCycles.length,
  };
}

// Seuils de sévérité pour colorer les durées
const FAST_THRESHOLD_MS = 2 * MS_PER_DAY;
const SLOW_THRESHOLD_MS = 3 * MS_PER_DAY;

// Retourne 'fast' | 'normal' | 'slow' selon les seuils 2j / 3j
export function getDurationSeverity(ms) {
  if (ms == null) return 'unknown';
  if (ms <= FAST_THRESHOLD_MS) return 'fast';
  if (ms <= SLOW_THRESHOLD_MS) return 'normal';
  return 'slow';
}

// Liste des transitions terminées dépassant le seuil, triées du plus long au plus court.
// Retourne un tableau d'entrées { fiche, transition, duration }
export function getSlowestTransitions(fiches, thresholdMs = SLOW_THRESHOLD_MS) {
  const entries = [];
  for (const f of fiches) {
    for (const t of TRANSITIONS) {
      const fromDate = f[t.from.dateField];
      const toDate = f[t.to.dateField];
      if (!fromDate || !toDate) continue;
      const duration = new Date(toDate).getTime() - new Date(fromDate).getTime();
      if (duration < 0 || duration <= thresholdMs) continue;
      entries.push({ fiche: f, transition: t, duration });
    }
  }
  return entries.sort((a, b) => b.duration - a.duration);
}

// Liste des fiches actuellement bloquées sur une transition (visa amont posé, visa aval pas encore),
// dont le temps d'attente dépasse le seuil. Triées par durée d'attente décroissante.
// Retourne un tableau d'entrées { fiche, transition, duration } où duration = now - dateAmont
export function getStaleWaitingTransitions(fiches, thresholdMs = SLOW_THRESHOLD_MS) {
  const now = Date.now();
  const entries = [];
  for (const f of fiches) {
    for (const t of TRANSITIONS) {
      const fromDate = f[t.from.dateField];
      const toDate = f[t.to.dateField];
      if (!fromDate || toDate) continue; // amont OK et aval pas encore posé
      const duration = now - new Date(fromDate).getTime();
      if (duration <= thresholdMs) continue;
      entries.push({ fiche: f, transition: t, duration });
    }
  }
  return entries.sort((a, b) => b.duration - a.duration);
}

// Format human-friendly d'une durée en ms
export function formatDuration(ms) {
  if (ms == null) return '—';
  if (ms < MS_PER_HOUR) {
    const minutes = Math.round(ms / (60 * 1000));
    return `${minutes} min`;
  }
  if (ms < MS_PER_DAY) {
    const hours = ms / MS_PER_HOUR;
    return `${hours.toFixed(1)} h`;
  }
  const days = ms / MS_PER_DAY;
  if (days < 10) return `${days.toFixed(1)} j`;
  return `${Math.round(days)} j`;
}
