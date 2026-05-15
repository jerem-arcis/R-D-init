// Helpers purs pour calculer l'état d'alerte d'une fiche par rapport
// à sa date de lancement souhaitée (portée par la DE liée).

export const VISA_KEYS = [
  'visa_controle_gestion',
  'visa_supply_chain',
  'visa_gestion_besoin',
  'visa_industriel',
  'visa_commerce',
];

export const STEP_LABELS = {
  visa_controle_gestion: 'Contrôle de Gestion',
  visa_supply_chain: 'Supply Chain',
  visa_gestion_besoin: 'Gestion du besoin',
  visa_industriel: 'Industriel',
  visa_commerce: 'Commerce',
  statut_sap: 'Création SAP',
  fl_exportee: 'Export FL',
};

export const countVisas = (fiche) => {
  if (!fiche) return 0;
  let n = 0;
  for (const k of VISA_KEYS) if (fiche[k]) n++;
  if (fiche.statut_sap === 'Création SAP effectuée') n++;
  if (fiche.fl_exportee) n++;
  return n;
};

export const nextBlockingStep = (fiche) => {
  if (!fiche) return null;
  for (const k of VISA_KEYS) if (!fiche[k]) return STEP_LABELS[k];
  if (fiche.statut_sap !== 'Création SAP effectuée') return STEP_LABELS.statut_sap;
  if (!fiche.fl_exportee) return STEP_LABELS.fl_exportee;
  return null;
};

const MS_PER_DAY = 86_400_000;

export const daysUntil = (isoDate, today = new Date()) => {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.round((startOf(d) - startOf(today)) / MS_PER_DAY);
};

// Configuration de chaque bucket : ordre = priorité décroissante (le plus urgent d'abord)
export const BUCKET_CONFIG = {
  retard: {
    key: 'retard',
    label: 'En retard',
    short: 'Retard',
    tone: 'red',
    sortRank: 0,
    isCritical: true,
  },
  critique: {
    key: 'critique',
    label: 'Critique (J-3)',
    short: 'Critique',
    tone: 'rose',
    sortRank: 1,
    isCritical: true,
  },
  imminent: {
    key: 'imminent',
    label: 'Imminent (J-7)',
    short: 'Imminent',
    tone: 'orange',
    sortRank: 2,
    isCritical: true,
  },
  semaine: {
    key: 'semaine',
    label: 'Sous 2 semaines',
    short: '< 2 sem.',
    tone: 'amber',
    sortRank: 3,
    isCritical: false,
  },
  venir: {
    key: 'venir',
    label: 'À venir',
    short: 'À venir',
    tone: 'slate',
    sortRank: 4,
    isCritical: false,
  },
  lancee: {
    key: 'lancee',
    label: 'Lancée',
    short: 'Lancée',
    tone: 'emerald',
    sortRank: 5,
    isCritical: false,
  },
};

export const bucketFor = ({ joursAvant, visasValides }) => {
  if (visasValides >= 7) return BUCKET_CONFIG.lancee;
  if (joursAvant == null) return BUCKET_CONFIG.venir;
  if (joursAvant < 0) return BUCKET_CONFIG.retard;
  if (joursAvant <= 3) return BUCKET_CONFIG.critique;
  if (joursAvant <= 7) return BUCKET_CONFIG.imminent;
  if (joursAvant <= 14) return BUCKET_CONFIG.semaine;
  return BUCKET_CONFIG.venir;
};

export const formatJourLabel = (joursAvant) => {
  if (joursAvant == null) return '—';
  if (joursAvant === 0) return "Aujourd'hui";
  if (joursAvant > 0) return `J-${joursAvant}`;
  return `J+${Math.abs(joursAvant)} (retard)`;
};

// Construit la liste enrichie pour le dashboard.
// fiches: tableau de FicheLancement, des: tableau de DemandeEtude.
export const buildAlertEntries = (fiches, des, today = new Date()) => {
  const deById = new Map(des.map((d) => [d.id, d]));
  const entries = [];
  let unplanned = 0;

  for (const fiche of fiches) {
    const de = fiche.demande_etude_id ? deById.get(fiche.demande_etude_id) : null;
    const dateLancement = de?.date_lancement || null;

    if (!dateLancement) {
      unplanned++;
      continue;
    }

    const joursAvant = daysUntil(dateLancement, today);
    const visasValides = countVisas(fiche);
    const bucket = bucketFor({ joursAvant, visasValides });
    entries.push({
      fiche,
      de,
      dateLancement,
      joursAvant,
      visasValides,
      bucket,
      blockingStep: nextBlockingStep(fiche),
    });
  }

  // Tri : bucket par sortRank, puis joursAvant croissant (plus urgent en premier)
  entries.sort((a, b) => {
    if (a.bucket.sortRank !== b.bucket.sortRank) return a.bucket.sortRank - b.bucket.sortRank;
    const ja = a.joursAvant ?? 9999;
    const jb = b.joursAvant ?? 9999;
    return ja - jb;
  });

  return { entries, unplanned };
};

// Compte par bucket pour le hero.
export const summarize = (entries) => {
  const counts = {
    retard: 0, critique: 0, imminent: 0, semaine: 0, venir: 0, lancee: 0,
  };
  for (const e of entries) counts[e.bucket.key]++;
  const critical = counts.retard + counts.critique + counts.imminent;
  return { counts, critical };
};
