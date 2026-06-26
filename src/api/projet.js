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

// Statuts portés par cr04e_statut_en_cours.
export const PROJET_STATUT = {
  brouillon: 'brouillon',
  en_attente_code_chapeau: 'en_attente_code_chapeau',
  en_attente_dl: 'en_attente_dl',
  ds_brouillon: 'ds_brouillon',
  en_attente_creation_code_chapeau: 'en_attente_creation_code_chapeau',
  ds_validee: 'ds_validee',
};

// Mappe une DE (formData) + valeurs calculées vers le payload cr04e_projet.
// `sapOptions` ({ divisions:[{id,value}], ... }) sert à résoudre les lookups
// code -> GUID. `statut` alimente cr04e_statut_en_cours. Les champs vides et
// lookups non résolus sont omis.
export function buildProjetPayload(formData, { codeChapeau, zug, sapOptions = {}, statut } = {}) {
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
    cr04e_statut_en_cours: trimOrUndef(statut),
  };

  for (const [key, field, bindProp] of PROJET_LOOKUPS) {
    const bind = lookupBind(key, trimOrUndef(formData[field]), sapOptions[key]);
    if (bind) payload[bindProp] = bind;
  }

  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

// Crée la ligne cr04e_projet. Renvoie l'enregistrement créé (avec cr04e_projetid).
// Lève en cas d'échec (traitement bloquant côté appelant si voulu).
export async function createProjetFromDE(formData, ctx) {
  const payload = buildProjetPayload(formData, ctx);
  const result = await Cr04e_projetsService.create(payload);
  return result?.data ?? null;
}

// Mappe une ligne cr04e_projet (Dataverse) vers la forme formData attendue par le
// formulaire DE. Sert à rouvrir une DE préremplie depuis Dataverse (redirection
// mail « en attente de code chapeau », ou reprise sur un autre poste). On ne
// remappe que les champs scalaires (issus de beCPG) ; les champs SAP pilotés par
// règle (hiérarchie, classe valo, centre, groupe article) sont recalculés à
// l'ouverture à partir de la division/réseau. La division (lookup) n'est pas
// reconstituée ici : elle est (re)choisie dans l'app si absente.
const toFormData = (p) => ({
  projet_id: p.cr04e_projetid,
  type_de: 'de',
  code_projet: p.cr04e_codeprojet ?? '',
  axe_strategique: p.cr04e_axestrategique ?? '',
  date_demande: (p.cr04e_datedelademande ?? '').slice(0, 10),
  reseau: p.cr04e_reseau ?? '',
  type_demande_de: p.cr04e_typedelademande ?? '',
  demandeur: p.cr04e_demandeur ?? '',
  designation_article: p.cr04e_nomduproduitdesignation ?? '',
  marque: p.cr04e_secteurdactivite ?? '',
  client: p.cr04e_client ?? '',
  groupe_autorisation: p.cr04e_groupedautorisation ?? '',
  poids_net: p.cr04e_poidsnet ?? '',
  qte_previsionnelle_annuelle: p.cr04e_qteprevisionnelleannuelle ?? '',
  code_chapeau: p.cr04e_codechapeau ?? '',
  statut: p.cr04e_statut_en_cours || PROJET_STATUT.en_attente_code_chapeau,
});

// Lit une ligne cr04e_projet par son GUID et la renvoie au format formData DE.
// Renvoie null si introuvable.
export async function getProjetById(id) {
  if (!id) return null;
  const result = await Cr04e_projetsService.get(id);
  const p = result?.data ?? null;
  return p ? toFormData(p) : null;
}

// Met à jour une ligne cr04e_projet existante.
export async function updateProjetFromDE(id, formData, ctx) {
  const payload = buildProjetPayload(formData, ctx);
  const result = await Cr04e_projetsService.update(id, payload);
  return result?.data ?? null;
}

// Met à jour UNIQUEMENT le statut du projet (cr04e_statut_en_cours). Sert aux
// transitions DL (envoi en validation, validation, refus) pour faire remonter
// l'état dans Dataverse sans réécrire l'ensemble des champs de la DE.
export async function updateProjetStatut(id, statut) {
  if (!id || !statut) return null;
  const result = await Cr04e_projetsService.update(id, {
    cr04e_statut_en_cours: statut,
  });
  return result?.data ?? null;
}

// Mappe une ligne cr04e_projet vers la forme attendue par la liste DE
// (DemandesEtude). Type toujours « de » ; usine = nom du lookup Division/Usine.
const toListShape = (p) => ({
  id: p.cr04e_projetid,
  type_de: 'de',
  code_projet: p.cr04e_codeprojet ?? '',
  designation_article: p.cr04e_nomduproduitdesignation ?? '',
  demandeur: p.cr04e_demandeur ?? '',
  type_demande_de: p.cr04e_typedelademande ?? '',
  usine_validee: p.cr04e_divisionusinename ?? '',
  statut: p.cr04e_statut_en_cours || PROJET_STATUT.brouillon,
  code_chapeau: p.cr04e_codechapeau ?? '',
  created_date: p.createdon ?? null,
});

// Liste tous les projets (Dataverse, paginé) pour la liste des demandes d'étude.
export async function listProjets() {
  const all = [];
  let skipToken;
  let guard = 0;
  do {
    const result = await Cr04e_projetsService.getAll({
      maxPageSize: 5000,
      ...(skipToken ? { skipToken } : {}),
    });
    all.push(...(result?.data ?? []));
    skipToken = result?.skipToken;
    guard += 1;
  } while (skipToken && guard < 100);

  return all
    .map(toListShape)
    .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
}
