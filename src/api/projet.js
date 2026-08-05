import { Cr04e_projetsService, Cr04e_divisionprojetsService } from '@/generated';
import { lookupBind } from '@/api/sapLists';
import { DS_STATUTS } from '@/api/ds';
import { divisionCodeFromPlant, normalizeAxeStrategique } from '@/lib/deRules';
import { toNumber, trimOrUndef } from '@/api/_odata';

// Lookups cr04e_projet : [clé liste SAP, champ formulaire, propriété @odata.bind].
const PROJET_LOOKUPS = [
  ['divisions', 'division', 'cr04e_DivisionUsine@odata.bind'],
  ['classes_valorisation', 'classe_valorisation', 'cr04e_Classedevalorisation@odata.bind'],
  ['groupes_article', 'groupe_article', 'cr04e_Groupearticledivision@odata.bind'],
  ['familles_produit', 'famille_produit', 'cr04e_Hierarchieproduitfamille@odata.bind'],
];

// Statuts portés par cr04e_statut_en_cours (convention parlante par phase).
export const PROJET_STATUT = {
  de_brouillon: 'de_brouillon',
  de_attente_cc: 'de_attente_cc',
  // Envoi vers SAP : la DE passe directement en attente de validation CDG
  // (la décision de validation/refus DL est déléguée à CDG via Power Automate).
  dl_attente_validation_cdg: 'dl_attente_validation_cdg',
  dl_validee: 'dl_validee',
  dl_refusee: 'dl_refusee',
  ds_brouillon: 'ds_brouillon',
  ds_attente_cc: 'ds_attente_cc',
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
    // Groupe de frais généraux : désormais un CHAMP TEXTE simple (FG / NEGO),
    // plus un lookup vers une table annexe.
    cr04e_groupedefraisgeneraux: trimOrUndef(formData.groupe_frais_generaux),
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

// Le client Power Apps (@microsoft/power-apps/data) NE LÈVE PAS en cas d'échec :
// il résout un IOperationResult { success:false, error, data:undefined }
// (ex. 403 « privilège prvCreatecr04e_projet manquant » si l'utilisateur n'a pas
// le rôle de sécurité Dataverse). Sans ce garde, une écriture refusée renverrait
// `null` en silence et le formulaire continuerait comme si tout allait bien.
// On transforme donc l'échec en exception explicite, avec un message actionnable
// (statut HTTP + message serveur + requestId pour retrouver la trace côté Dataverse).
function unwrap(result, action) {
  if (result && result.success === false) {
    const err = result.error || {};
    const status = err.status ? `HTTP ${err.status}` : 'échec';
    const reqId = err.requestId ? ` [requestId ${err.requestId}]` : '';
    const e = new Error(`${action} Dataverse — ${status} : ${err.message || 'erreur inconnue'}${reqId}`);
    e.status = err.status;
    e.requestId = err.requestId;
    throw e;
  }
  return result?.data ?? null;
}

// Crée la ligne cr04e_projet. Renvoie l'enregistrement créé (avec cr04e_projetid).
// Lève en cas d'échec (traitement bloquant côté appelant si voulu).
export async function createProjetFromDE(formData, ctx) {
  const payload = buildProjetPayload(formData, ctx);
  const result = await Cr04e_projetsService.create(payload);
  return unwrap(result, 'Création');
}

// Crée une ligne cr04e_divisionprojet rattachée au projet via la relation lookup
// cr04e_Projet. `division` = code Division (Usine) ; `type` = rôle de la ligne
// (ex. « PROD »). À écrire APRÈS la création du projet (le lookup a besoin du GUID).
// Les champs vides sont omis. Lève en cas d'échec (l'appelant décide si bloquant).
export async function createDivisionProjet({ projetId, division, type } = {}) {
  if (!projetId) return null;
  const payload = {
    'cr04e_Projet@odata.bind': `/cr04e_projets(${projetId})`,
  };
  const div = trimOrUndef(division);
  const t = trimOrUndef(type);
  if (div !== undefined) payload.cr04e_division = div;
  if (t !== undefined) payload.cr04e_type = t;
  const result = await Cr04e_divisionprojetsService.create(payload);
  return unwrap(result, 'Création division-projet');
}

// Mappe une ligne cr04e_projet (Dataverse) vers la forme formData attendue par le
// formulaire DE. Sert à rouvrir une DE préremplie depuis Dataverse (redirection
// mail « en attente de code chapeau », ou reprise sur un autre poste). On ne
// remappe que les champs scalaires (issus de beCPG) ; les champs SAP pilotés par
// règle (hiérarchie, classe valo, centre, groupe article) sont recalculés à
// l'ouverture à partir de la division/réseau. La division est reconstituée à
// partir de la colonne d'import `cr04e_divisionimport` (code division).
const toFormData = (p) => ({
  projet_id: p.cr04e_projetid,
  type_de: 'de',
  code_projet: p.cr04e_codeprojet ?? '',
  axe_strategique: normalizeAxeStrategique(p.cr04e_axestrategique) ?? '',
  date_demande: (p.cr04e_datedelademande ?? '').slice(0, 10),
  reseau: p.cr04e_reseau ?? '',
  type_demande_de: p.cr04e_typedelademande ?? '',
  demandeur: p.cr04e_demandeur ?? '',
  designation_article: p.cr04e_nomduproduitdesignation ?? '',
  marque: p.cr04e_secteurdactivite ?? '',
  client: p.cr04e_client ?? '',
  groupe_autorisation: p.cr04e_groupedautorisation ?? '',
  groupe_frais_generaux: p.cr04e_groupedefraisgeneraux ?? '',
  poids_net: p.cr04e_poidsnet ?? '',
  qte_previsionnelle_annuelle: p.cr04e_qteprevisionnelleannuelle ?? '',
  code_chapeau: p.cr04e_codechapeau ?? '',
  // Division reconstituée depuis la colonne d'import : pose la division à
  // l'ouverture pour que les règles deRules cascadent (hiérarchie, classe valo,
  // centre de profit, groupe article). `cr04e_divisionimport` peut contenir le
  // NOM du site (ex. « RIVESALTES ») -> converti en code (2866) via
  // divisionCodeFromPlant, comme le fait l'import beCPG. Si c'est déjà un code,
  // on le garde tel quel.
  division: divisionCodeFromPlant(p.cr04e_divisionimport) || (p.cr04e_divisionimport ?? ''),
  statut: p.cr04e_statut_en_cours || PROJET_STATUT.de_attente_cc,
});

// Lit une ligne cr04e_projet par son GUID et la renvoie au format formData DE.
// Renvoie null si introuvable.
export async function getProjetById(id) {
  if (!id) return null;
  const result = await Cr04e_projetsService.get(id);
  const p = unwrap(result, 'Lecture');
  return p ? toFormData(p) : null;
}

// Met à jour une ligne cr04e_projet existante.
export async function updateProjetFromDE(id, formData, ctx) {
  const payload = buildProjetPayload(formData, ctx);
  const result = await Cr04e_projetsService.update(id, payload);
  return unwrap(result, 'Mise à jour');
}

// Met à jour UNIQUEMENT le statut du projet (cr04e_statut_en_cours). Sert aux
// transitions DL (envoi en validation, validation, refus) pour faire remonter
// l'état dans Dataverse sans réécrire l'ensemble des champs de la DE.
export async function updateProjetStatut(id, statut) {
  if (!id || !statut) return null;
  const result = await Cr04e_projetsService.update(id, {
    cr04e_statut_en_cours: statut,
  });
  return unwrap(result, 'Mise à jour statut');
}

// Mappe une ligne cr04e_projet vers la forme attendue par la liste DE
// (DemandesEtude). Type « ds » si le statut est un statut DS, sinon « de » ;
// usine = nom du lookup Division/Usine.
const toListShape = (p) => ({
  id: p.cr04e_projetid,
  type_de: DS_STATUTS.includes(p.cr04e_statut_en_cours) ? 'ds' : 'de',
  code_projet: p.cr04e_codeprojet ?? '',
  designation_article: p.cr04e_nomduproduitdesignation ?? '',
  demandeur: p.cr04e_demandeur ?? '',
  type_demande_de: p.cr04e_typedelademande ?? '',
  usine_validee: p.cr04e_divisionusinename ?? '',
  // Réseau : sert à dériver le secteur d'activité pour le préremplissage FL
  // (computeSecteurFromReseau), même règle que la DE.
  reseau: p.cr04e_reseau ?? '',
  statut: p.cr04e_statut_en_cours || PROJET_STATUT.de_brouillon,
  code_chapeau: p.cr04e_codechapeau ?? '',
  created_date: p.createdon ?? null,
});

// Alias d'export pour les tests (la fonction reste interne par ailleurs).
export const listShapeForTest = toListShape;

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
    all.push(...(unwrap(result, 'Liste') ?? []));
    skipToken = result?.skipToken;
    guard += 1;
  } while (skipToken && guard < 100);

  return all
    .map(toListShape)
    .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
}
