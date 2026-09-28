// Calculs auto du tableau des unités (emballages), repris du fichier FM
// (419805-FM, onglet « Industriel »). Fonctions pures, testables.

// Volume d'un bloc emballage en m³, à partir des dimensions en mm.
// Formule FM (Industriel!K22/K23/K24) : =IF(L*l*h=0,"",L*l*h/1000000000).
// Arrondi à 6 décimales (précision m³ suffisante). Renvoie null si une
// dimension manque, est non numérique ou nulle (cellule vide dans l'Excel).
export function computeVolumeM3(block = {}) {
  const l = Number(block.long);
  const w = Number(block.larg);
  const h = Number(block.haut);
  if (![l, w, h].every((n) => Number.isFinite(n) && n > 0)) return null;
  return Math.round((l * w * h) / 1e3) / 1e6;
}

// Poids net d'un niveau d'emballage (colis / couche / palette) = poids net de l'UVC
// × nombre d'UVC contenues à ce niveau (= `unite` du bloc, cf. emballagesSap.js).
// Réplique la cascade FM (Industriel R22/R23/R24 : pn_UVC × nb). Arrondi 6 déc.
// Renvoie null si le poids net UVC ou le nombre manque / est nul / non numérique.
export function computePoidsNet(poidsNetUvc, uniteNiveau) {
  const pn = Number(poidsNetUvc);
  const n = Number(uniteNiveau);
  if (![pn, n].every((x) => Number.isFinite(x) && x > 0)) return null;
  return Math.round(pn * n * 1e6) / 1e6;
}

// Dimensions au sol (mm) déduites du libellé du type de palette (« … 80 x 120 … »).
// FM : Industriel U/X 23-24 <- Commerce!BB20 (larg = 1er nombre ×10, long = 2e ×10).
// Le libellé porte les cm ; ×10 -> mm. Renvoie null si aucun « N x M » trouvé.
export function paletteDimsFromType(typePalette) {
  const m = String(typePalette ?? '').match(/(\d+)\s*[xX]\s*(\d+)/);
  if (!m) return null;
  return { larg: Number(m[1]) * 10, long: Number(m[2]) * 10 };
}
