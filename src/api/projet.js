import { Cr04e_projetsService } from '@/generated';
import { lookupBind } from '@/api/sapLists';

const toNumber = (v) => {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const trimOrUndef = (v) => {
  const s = (v ?? '').toString().trim();
  return s === '' ? undefined : s;
};

// Lookups cr04e_projet : [clé liste SAP, champ formulaire, propriété @odata.bind].
const PROJET_LOOKUPS = [
  ['divisions', 'division', 'cr04e_DivisionUsine@odata.bind'],
  ['classes_valorisation', 'classe_valorisation', 'cr04e_Classedevalorisation@odata.bind'],
  ['groupes_article', 'groupe_article', 'cr04e_Groupearticledivision@odata.bind'],
  ['groupes_frais_generaux', 'groupe_frais_generaux', 'cr04e_Groupedefraisgeneraux@odata.bind'],
  ['familles_produit', 'famille_produit', 'cr04e_Hierarchieproduitfamille@odata.bind'],
];

// Mappe une DE (formData) + valeurs calculées vers le payload cr04e_projet.
// `sapOptions` ({ divisions:[{id,value}], ... }) sert à résoudre les lookups
// code -> GUID. Les champs vides et lookups non résolus sont omis.
export function buildProjetPayload(formData, { codeChapeau, zug, sapOptions = {} } = {}) {
  const payload = {
    cr04e_codeprojet: trimOrUndef(formData.code_projet),
    cr04e_axestrategique: trimOrUndef(formData.axe_strategique),
    cr04e_datedelademande: trimOrUndef(formData.date_demande),
    cr04e_reseau: trimOrUndef(formData.reseau),
    cr04e_typedelademande: trimOrUndef(formData.type_demande_de),
    cr04e_demandeur: trimOrUndef(formData.demandeur),
    cr04e_nomduproduitdesignation: trimOrUndef(formData.designation_article),
    cr04e_secteurdactivite: trimOrUndef(formData.marque),
    cr04e_client: trimOrUndef(formData.client),
    cr04e_groupedautorisation: trimOrUndef(formData.groupe_autorisation),
    cr04e_poidsnet: toNumber(formData.poids_net),
    cr04e_qteprevisionnelleannuelle: toNumber(formData.qte_previsionnelle_annuelle),
    cr04e_zug: toNumber(zug),
    cr04e_codechapeau: trimOrUndef(codeChapeau),
  };

  for (const [key, field, bindProp] of PROJET_LOOKUPS) {
    const bind = lookupBind(key, trimOrUndef(formData[field]), sapOptions[key]);
    if (bind) payload[bindProp] = bind;
  }

  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

// Crée la ligne cr04e_projet à la validation d'une DE. Lève en cas d'échec
// (traitement bloquant côté appelant).
export async function createProjetFromDE(formData, ctx) {
  const payload = buildProjetPayload(formData, ctx);
  const result = await Cr04e_projetsService.create(payload);
  return result?.data ?? null;
}
