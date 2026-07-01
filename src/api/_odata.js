// Helpers OData/Dataverse partagés (évite la duplication entre projet.js et ds.js).

// Convertit en nombre exploitable ; '' / null / NaN -> undefined (champ omis du payload).
export const toNumber = (v) => {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

// Trim ; chaîne vide -> undefined (champ omis du payload).
export const trimOrUndef = (v) => {
  const s = (v ?? '').toString().trim();
  return s === '' ? undefined : s;
};
