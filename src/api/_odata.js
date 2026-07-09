// Helpers OData/Dataverse partagés (évite la duplication entre projet.js et ds.js).

// Convertit en nombre exploitable ; '' / null / NaN -> undefined (champ omis du payload).
// Tolère la notation décimale française (virgule) : "1,598" -> 1.598, car un
// décimal réhydraté depuis Dataverse (client OData en locale FR) ou saisi peut
// arriver avec une virgule.
export const toNumber = (v) => {
  if (v === '' || v == null) return undefined;
  const n = Number(String(v).replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
};

// Décimal en CHAÎNE à point, format attendu par SAP (ex. "1.598"). '' / null -> ''.
// Convertit une éventuelle virgule décimale française en point. On ne reformate
// pas le nombre (pas d'arrondi) : on transmet la valeur telle quelle, séparateur
// corrigé — c'est exactement ce qui fait échouer SAP (« ungültiger Wert '1,598' »).
export const decimalStr = (v) => {
  if (v === '' || v == null) return '';
  return String(v).replace(',', '.');
};

// Trim ; chaîne vide -> undefined (champ omis du payload).
export const trimOrUndef = (v) => {
  const s = (v ?? '').toString().trim();
  return s === '' ? undefined : s;
};
