// Tronque une date ISO ("2024-12-17T23:00:00.000Z") au format YYYY-MM-DD
// attendu par les <input type="date">. Renvoie undefined si valeur absente.
const toDateInput = (iso) =>
  typeof iso === "string" && iso.length >= 10 ? iso.slice(0, 10) : undefined;

// N'affecte la clé que si la valeur est définie (non null/undefined),
// afin de ne pas écraser un champ avec une valeur absente de la réponse.
const setIf = (target, key, value) => {
  if (value !== undefined && value !== null) target[key] = value;
};

/**
 * Convertit la réponse du flux beCPG en objet partiel de formData de la DE.
 * Retourne null si aucune entité n'est présente (CodePJ introuvable).
 */
export function mapBeCPGToDE(json) {
  const entity = json?.entities?.[0]?.entity;
  if (!entity) return null;

  const a = entity.attributes || {};
  const out = {};

  setIf(out, "code_projet", entity["bcpg:code"]);
  setIf(out, "designation_article", a["cm:name"]);
  setIf(out, "date_demande", toDateInput(a["bnc:deDateDemande"]));
  setIf(out, "axe_strategique", a["bnc:deAxeStrategique"]);
  setIf(out, "reseau", a["pjt:projectHierarchy1"]?.["bcpg:lkvValue"]);
  setIf(out, "type_demande_de", a["pjt:projectOrigin"]);
  setIf(out, "demandeur", a["bnc:dePorteurCommercial"]?.["cm:userName"]);
  setIf(out, "famille_produit", a["bnc:deFamilleProduit"]);
  setIf(out, "marque", a["bcpg:plants"]?.[0]?.["cm:name"]);
  setIf(out, "client", a["bnc:deClient"]);
  setIf(out, "qte_previsionnelle_annuelle", a["bnc:deVolumeUV"]);

  return out;
}

/**
 * Renvoie `list` augmentée de `value` si celle-ci est non vide et absente.
 * Sert à afficher dans un <Select> une valeur hors de la liste de référence.
 */
export function withValue(list, value) {
  if (!value || list.includes(value)) return list;
  return [...list, value];
}

// Champs beCPG adossés à un dropdown Dataverse géré par l'Admin → leur dropdownId.
// (type_demande_de et client sont codés en dur, non gérés par l'Admin : exclus.)
export const BECPG_FIELD_TO_DROPDOWN = {
  axe_strategique: "axes_strategiques",
  reseau: "reseaux",
  famille_produit: "familles_produit",
  marque: "secteurs_activite",
};

/**
 * À partir d'un objet `mapped` (sortie de mapBeCPGToDE) et des listes Admin
 * courantes, détermine les valeurs à créer dans Dataverse : celles renvoyées
 * par beCPG qui n'existent pas encore dans le dropdown correspondant.
 * Renvoie un tableau de { dropdownId, value }.
 */
export function dropdownAdditionsFromMapping(mapped, adminLists) {
  const additions = [];
  if (!mapped) return additions;
  for (const [field, dropdownId] of Object.entries(BECPG_FIELD_TO_DROPDOWN)) {
    const value = mapped[field];
    const list = adminLists?.[dropdownId] || [];
    if (value && !list.includes(value)) {
      additions.push({ dropdownId, value });
    }
  }
  return additions;
}
