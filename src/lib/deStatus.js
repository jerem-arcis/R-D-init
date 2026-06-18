// Source unique de vérité du pipeline de statuts d'une DE/projet et des
// alertes ADV liées à l'attente du code chapeau.

export const STATUTS = {
  brouillon: { key: "brouillon", label: "Brouillon", tone: "amber", order: 0 },
  en_attente_code_chapeau: {
    key: "en_attente_code_chapeau",
    label: "En attente de code chapeau",
    tone: "blue",
    order: 1,
  },
  en_attente_dl: {
    key: "en_attente_dl",
    label: "En attente de DL",
    tone: "violet",
    order: 2,
  },
  en_attente_validation_dl: {
    key: "en_attente_validation_dl",
    label: "En attente de validation DL",
    tone: "indigo",
    order: 3,
  },
  validee: { key: "validee", label: "Validée", tone: "emerald", order: 4 },
  refusee: { key: "refusee", label: "Refusée", tone: "red", order: 5 },
};

export const STATUT_ORDER = Object.values(STATUTS)
  .sort((a, b) => a.order - b.order)
  .map((s) => s.key);

export const getStatutMeta = (key) => STATUTS[key] || STATUTS.brouillon;

const MS_PER_DAY = 86_400_000;
const startOfDay = (x) =>
  new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();

// Alerte ADV pour une DE en attente du code chapeau.
// Référence : date_demande_code_chapeau. J+0 dès la demande, J+6 renforcée.
export const codeChapeauAlert = (de, today = new Date()) => {
  if (
    !de ||
    de.statut !== "en_attente_code_chapeau" ||
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
