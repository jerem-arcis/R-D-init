// Génération des codes-barres EAN / GTIN Boncolac.
//
// Règles décodées du fichier EAN13UV.xls (Feuil1, colonnes M/O/Q/S) :
//   - préfixe société GS1 fixe : « 325151 »
//   - un code produit à 4 chiffres (colonne F) sert de base
//   - un suffixe de 2 chiffres encode le niveau de conditionnement :
//       « 00 » = UV (unité de vente conso)   -> EAN-13   (325151 + code + 00)
//       « 01 » = Carton  (en-tête EAN14CT)   -> GTIN-14  (0 + 325151 + code + 01)
//       « 02 » = Couche  (en-tête EAN14CO)   -> GTIN-14  (0 + 325151 + code + 02)
//       « 03 » = Palette (en-tête EAN14PL)   -> GTIN-14  (0 + 325151 + code + 03)
//   - dernier chiffre = clé de contrôle GS1 mod-10.
//
// L'UV est un EAN-13 (12 chiffres de corps) ; les 3 autres niveaux sont des
// GTIN-14 (13 chiffres de corps) préfixés d'un « 0 » indicateur.

// Préfixe société GS1 Boncolac (fixe).
const PREFIX = '325151';

// Clé de contrôle GS1 mod-10. Fonctionne pour n'importe quelle longueur de corps
// (EAN-13 : 12 chiffres, GTIN-14 : 13 chiffres). Pondération alternée ×3 / ×1 en
// partant de la droite (le chiffre juste à gauche de la clé pèse ×3), puis
// clé = (10 − (S mod 10)) mod 10 — le mod final gère le cas S multiple de 10.
export function gs1CheckDigit(body) {
  const digits = String(body ?? '').replace(/\D/g, '');
  let sum = 0;
  let weight = 3;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += Number(digits[i]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

// Ne garde que les chiffres du code de base.
const digitsOnly = (code) => String(code ?? '').replace(/\D/g, '');

// Le schéma du fichier n'est valide que pour un code de base à 4 chiffres
// (325151 + 4 + 2 = 12 -> EAN-13 ; 0 + 325151 + 4 + 2 = 13 -> GTIN-14).
export function isValidBaseCode(code) {
  return /^\d{4}$/.test(digitsOnly(code));
}

// Dérive le code de base à 4 chiffres à partir d'un code plus long (typiquement
// le code chapeau) : on ne garde que les chiffres et on prend les 4 PREMIERS.
// Renvoie '' si moins de 4 chiffres sont disponibles.
export function baseCodeFromCode(code) {
  const d = digitsOnly(code);
  return d.length >= 4 ? d.slice(0, 4) : '';
}

// EAN-13 « UV » : 325151 + code(4) + 00 + clé.
export function eanUV(code) {
  const body = PREFIX + digitsOnly(code) + '00';
  return body + gs1CheckDigit(body);
}

// GTIN-14 par niveau de conditionnement : 0 + 325151 + code(4) + niveau(2) + clé.
export function gtin14(code, niveau) {
  const body = '0' + PREFIX + digitsOnly(code) + niveau;
  return body + gs1CheckDigit(body);
}

export const eanCarton = (code) => gtin14(code, '01'); // EAN14CT
export const eanCouche = (code) => gtin14(code, '02'); // EAN14CO
export const eanPalette = (code) => gtin14(code, '03'); // EAN14PL

// Jeu Couche / Carton / Palette pour le formulaire DE — les trois niveaux de
// conditionnement de la fiche produit (GTIN-14). Le niveau « Couche » (CO,
// suffixe 02) remplace l'UV : la fiche ne track pas d'unité de vente conso, son
// plus petit niveau est la couche. L'UV reste disponible via eanUV() si besoin.
// `code` peut être un code long (code chapeau) : on en prend les 4 premiers
// chiffres comme base. Renvoie des chaînes vides si moins de 4 chiffres sont
// disponibles — évite de produire des EAN faux.
export function buildEANSet(code) {
  const base = baseCodeFromCode(code);
  if (!base) {
    return { ean_couche: '', ean_carton: '', ean_palette: '' };
  }
  return {
    ean_couche: eanCouche(base),
    ean_carton: eanCarton(base),
    ean_palette: eanPalette(base),
  };
}
