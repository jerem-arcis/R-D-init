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

const MS_PER_DAY = 86_400_000;
const startOfDay = (x) =>
  new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();

// Alerte ADV pour une DE en attente du code chapeau.
// Référence : date_demande_code_chapeau. J+0 dès la demande, J+6 renforcée.
export const codeChapeauAlert = (de, today = new Date()) => {
  if (
    !de ||
    de.statut !== "de_attente_cc" ||
    !de.date_demande_code_chapeau
  ) {
    return { level: "none", joursEcoules: null };
  }
  const d = new Date(de.date_demande_code_chapeau);
  if (Number.isNaN(d.getTime())) return { level: "none", joursEcoules: null };
  const joursEcoules = Math.round(
    (startOfDay(today) - startOfDay(d)) / MS_PER_DAY
  );
  if (joursEcoules < 0) return { level: "none", joursEcoules };
  if (joursEcoules >= 6) return { level: "j6", joursEcoules };
  return { level: "j0", joursEcoules };
};
