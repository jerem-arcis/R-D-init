// Source unique de vérité du pipeline de statuts d'une DE/projet et des
// alertes ADV liées à l'attente du code chapeau.

// Convention parlante par phase : préfixe `de_` / `dl_` (chemin DE → DL → FL) et
// `ds_` (chemin DS → FL). Le préfixe indique où en est le projet dans le pipeline.
export const STATUTS = {
  de_brouillon: { key: "de_brouillon", label: "Brouillon", tone: "amber", order: 0 },
  ds_brouillon: { key: "ds_brouillon", label: "Brouillon", tone: "amber", order: 0 },
  de_attente_cc: {
    key: "de_attente_cc",
    label: "En attente de code chapeau",
    tone: "blue",
    order: 1,
  },
  ds_attente_cc: {
    key: "ds_attente_cc",
    // Libellé volontairement identique à `de_attente_cc` : DE et DS affichent
    // « En attente de code chapeau ». La clé technique reste distincte pour
    // différencier DE/DS côté Dataverse.
    label: "En attente de code chapeau",
    tone: "blue",
    order: 1,
  },
  dl_attente_validation_cdg: {
    key: "dl_attente_validation_cdg",
    label: "En attente de validation CDG",
    tone: "indigo",
    order: 3,
  },
  dl_validee: { key: "dl_validee", label: "Validée", tone: "emerald", order: 4 },
  ds_validee: { key: "ds_validee", label: "DS validée", tone: "emerald", order: 4 },
  dl_refusee: { key: "dl_refusee", label: "Refusée", tone: "red", order: 5 },
};

export const STATUT_ORDER = Object.values(STATUTS)
  .sort((a, b) => a.order - b.order)
  .map((s) => s.key);

export const getStatutMeta = (key) => STATUTS[key] || STATUTS.de_brouillon;

const isWeekend = (d) => {
  const g = d.getDay();
  return g === 0 || g === 6; // dimanche / samedi
};

// Nombre de jours ouvrés (lun-ven) écoulés entre `from` et `to`, jour 0 = `from`.
// Week-ends exclus ; jours fériés non gérés. Renvoie 0 si `to` <= `from`.
export const joursOuvresEcoules = (from, to) => {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  if (end <= start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    if (!isWeekend(cur)) count += 1;
  }
  return count;
};

// Seuil de retard ADV : 5 jours ouvrés (≈ 7 jours calendaires) d'attente du code
// chapeau déclenchent le panneau d'attention rouge.
export const SEUIL_RETARD_JOURS_OUVRES = 5;

// Alerte ADV pour une demande (DE ou DS) en attente du code chapeau. Référence :
// created_date (createdon). Purement visuelle — n'altère jamais le statut, la
// demande reste « En attente de code chapeau ».
export const codeChapeauAlert = (de, today = new Date()) => {
  const enAttente =
    de && (de.statut === "de_attente_cc" || de.statut === "ds_attente_cc");
  if (!enAttente || !de.created_date) {
    return { level: "none", joursOuvres: null };
  }
  const d = new Date(de.created_date);
  if (Number.isNaN(d.getTime())) return { level: "none", joursOuvres: null };
  const joursOuvres = joursOuvresEcoules(d, today);
  if (joursOuvres >= SEUIL_RETARD_JOURS_OUVRES) {
    return { level: "retard", joursOuvres };
  }
  return { level: "none", joursOuvres };
};
