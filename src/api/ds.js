import { Cr04e_projetsService } from '@/generated';
import { lookupBind, codeFromLookupValue } from '@/api/sapLists';
import {
  codeDivisionOrigine,
  codeDivisionFabrication,
  computeHierarchieDS,
  computeClasseValoDS,
  computeCentreProfitDS,
  computeSecteurDS,
} from '@/lib/dsRules';

export const DS_STATUTS = ['ds_brouillon', 'en_attente_creation_code_chapeau', 'ds_validee'];

const toNumber = (v) => {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};
const trimOrUndef = (v) => {
  const s = (v ?? '').toString().trim();
  return s === '' ? undefined : s;
};

// Valeurs calculées d'une DS à partir de formData (réutilisé par le payload et la
// vue/synthèse). Tout est dérivé des inputs via dsRules.
export function computeDsValues(formData) {
  const ctx = {
    usine: formData.autre_usine_fab,
    type_demande: formData.autre_type_demande,
    activite: formData.autre_activite,
    agen_type: formData.autre_agen_type,
    agen_choix: formData.autre_agen_choix,
  };
  return {
    divisionFab: codeDivisionFabrication(ctx),
    divisionOrigine: codeDivisionOrigine(formData.autre_usine_origine),
    hierarchie: computeHierarchieDS(formData.autre_activite),
    classeValo: computeClasseValoDS(ctx),
    centreProfit: computeCentreProfitDS(ctx),
    secteur: computeSecteurDS(formData.autre_type_marque),
  };
}

// Construit le payload cr04e_projet pour une DS. `sapOptions` sert à résoudre les
// lookups code→GUID. Champs vides et lookups non résolus omis.
export function buildDsPayload(formData, { sapOptions = {}, statut } = {}) {
  const c = computeDsValues(formData);
  const payload = {
    cr04e_demandeur: trimOrUndef(formData.autre_demandeur),
    cr04e_datedelademande: trimOrUndef(formData.autre_date),
    cr04e_typedelademande: trimOrUndef(formData.autre_type_demande),
    cr04e_nomduproduitdesignation: trimOrUndef(formData.autre_designation),
    cr04e_poidsnet: toNumber(formData.autre_poids_net_uv),
    cr04e_codeprojet: trimOrUndef(formData.autre_code_origine),
    cr04e_codechapeau: trimOrUndef(formData.code_chapeau),
    cr04e_secteurdactivite: trimOrUndef(c.secteur),
    cr04e_codedivisionorigine: trimOrUndef(c.divisionOrigine),
    cr04e_service: trimOrUndef(formData.autre_service),
    cr04e_descriptiondubesoin: trimOrUndef(formData.autre_description),
    cr04e_statut_en_cours: trimOrUndef(statut),
  };

  const divBind = lookupBind('divisions', c.divisionFab, sapOptions.divisions);
  if (divBind) payload['cr04e_DivisionUsine@odata.bind'] = divBind;
  const classeBind = lookupBind('classes_valorisation', c.classeValo, sapOptions.classes_valorisation);
  if (classeBind) payload['cr04e_Classedevalorisation@odata.bind'] = classeBind;
  const hierBind = lookupBind('familles_produit', c.hierarchie, sapOptions.familles_produit);
  if (hierBind) payload['cr04e_Hierarchieproduitfamille@odata.bind'] = hierBind;
  const cpBind = lookupBind('centres_profit', c.centreProfit, sapOptions.centres_profit);
  if (cpBind) payload['cr04e_Centredeprofit@odata.bind'] = cpBind;

  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

export async function createDsFromForm(formData, ctx) {
  const result = await Cr04e_projetsService.create(buildDsPayload(formData, ctx));
  return result?.data ?? null;
}

export async function updateDsFromForm(id, formData, ctx) {
  const result = await Cr04e_projetsService.update(id, buildDsPayload(formData, ctx));
  return result?.data ?? null;
}

// Lit une ligne cr04e_projet (DS) et reconstruit le formData DS (type 'autre').
// Les inputs non stockés sont redéduits des valeurs persistées quand c'est possible.
export async function getDsById(id, sapOptions = {}) {
  if (!id) return null;
  const result = await Cr04e_projetsService.get(id);
  const p = result?.data ?? null;
  if (!p) return null;
  const divisionFab = codeFromLookupValue('divisions', p._cr04e_divisionusine_value, sapOptions.divisions);
  const centreProfit = codeFromLookupValue('centres_profit', p._cr04e_centredeprofit_value, sapOptions.centres_profit);
  return {
    projet_id: p.cr04e_projetid,
    type_de: 'autre',
    autre_demandeur: p.cr04e_demandeur ?? '',
    autre_date: (p.cr04e_datedelademande ?? '').slice(0, 10),
    autre_service: p.cr04e_service ?? '',
    autre_type_demande: p.cr04e_typedelademande ?? '',
    autre_description: p.cr04e_descriptiondubesoin ?? '',
    autre_code_origine: p.cr04e_codeprojet ?? '',
    autre_designation: p.cr04e_nomduproduitdesignation ?? '',
    autre_poids_net_uv: p.cr04e_poidsnet ?? '',
    code_chapeau: p.cr04e_codechapeau ?? '',
    statut: p.cr04e_statut_en_cours || 'en_attente_creation_code_chapeau',
    // Valeurs SAP persistées (pour l'aperçu / push ADV) :
    _ds_centre_profit: centreProfit,
    _ds_division_fab: divisionFab,
    _ds_division_origine: p.cr04e_codedivisionorigine ?? '',
    _ds_secteur: p.cr04e_secteurdactivite ?? '',
  };
}
