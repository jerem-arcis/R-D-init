import { Cr04e_projetsService, Cr04e_divisionprojetsService } from '@/generated';
import { lookupBind, codeFromLookupValue } from '@/api/sapLists';
import { DS_STATUTS } from '@/api/ds';
import { divisionCodeFromPlant, normalizeAxeStrategique } from '@/lib/deRules';
import { toNumber, trimOrUndef } from '@/api/_odata';

// Suffixe d'annotation OData portant le libellé lisible d'un lookup (ex.
// "_cr04e_centredeprofit_value@OData...FormattedValue" = "12043").
const FMT_VALUE = '@OData.Community.Display.V1.FormattedValue';

// Lookups cr04e_projet : [clé liste SAP, champ formulaire, propriété @odata.bind].
const PROJET_LOOKUPS = [
  ['divisions', 'division', 'cr04e_DivisionUsine@odata.bind'],
  ['classes_valorisation', 'classe_valorisation', 'cr04e_Classedevalorisation@odata.bind'],
  ['groupes_article', 'groupe_article', 'cr04e_Groupearticledivision@odata.bind'],
  ['familles_produit', 'famille_produit', 'cr04e_Hierarchieproduitfamille@odata.bind'],
  // Centre de profit : lookup vers la table CEPCT. formData.centre_profit porte le
  // CODE brut (ex. « 22PF », cf. computeCentreProfitDE) qui matche la valeur du
  // référentiel — comme les autres lookups. Était absent : le centre n'était jamais
  // poussé dans cr04e_Centredeprofit.
  ['centres_profit', 'centre_profit', 'cr04e_Centredeprofit@odata.bind'],
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
  // Phase FL : article créé dans SAP (porte l'ancien statut_sap « Création SAP
  // effectuée » de la FL, désormais unifiée avec le projet).
  fl_sap_cree: 'fl_sap_cree',
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
    // Type de produit SAP : une DE est toujours un produit FINI. Constante et non
    // saisissable — même valeur que le champ TypeProduit du payload SAP_SEND.
    // Le pendant DS (négoce) vaut NEGO, cf. buildDsPayload.
    cr04e_typedeproduit: 'PFIN',
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
    const e = new Error(`${action} Dataverse - ${status} : ${err.message || 'erreur inconnue'}${reqId}`);
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

// Écrit une ligne cr04e_divisionprojet SEULEMENT si elle n'existe pas déjà pour ce
// projet (même division ET même type) — idempotent, évite les doublons quand la DS
// est ré-enregistrée / renvoyée. Division vide -> no-op (rien à écrire).
export async function ensureDivisionProjet({ projetId, division, type } = {}) {
  if (!projetId) return null;
  const div = trimOrUndef(division);
  const t = trimOrUndef(type);
  if (div === undefined) return null;
  const safeDiv = div.replace(/'/g, "''");
  const filter =
    `_cr04e_projet_value eq ${projetId} and cr04e_division eq '${safeDiv}'` +
    (t ? ` and cr04e_type eq '${t.replace(/'/g, "''")}'` : '');
  const existing = await Cr04e_divisionprojetsService.getAll({
    filter,
    select: ['cr04e_divisionprojetid'],
    top: 1,
  });
  const rows = unwrap(existing, 'Lecture division-projet') ?? [];
  if (rows.length) return null; // déjà présente : on ne recrée pas
  return createDivisionProjet({ projetId, division: div, type: t });
}

// Mappe une ligne cr04e_projet (Dataverse) vers la forme formData attendue par le
// formulaire DE. Sert à rouvrir une DE préremplie depuis Dataverse (redirection
// mail « en attente de code chapeau », ou reprise sur un autre poste).
// Les lookups SAP (division, classe valo, groupe article, hiérarchie, centre de
// profit) sont résolus par leur GUID via le référentiel chargé (`codeFromLookupValue`,
// comme getDsById) — les DE créées par l'app n'alimentent PAS la colonne texte
// `cr04e_divisionimport`, donc la division doit venir du lookup, sinon les règles
// deRules ne cascadent pas et tous les champs pilotés restent vides à la réouverture.
// La division garde un repli sur `cr04e_divisionimport` (imports beCPG).
const toFormData = (p, sapOptions = {}) => {
  const divisionLookup = codeFromLookupValue('divisions', p._cr04e_divisionusine_value, sapOptions.divisions);
  return {
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
    // Division : lookup en priorité, repli sur la colonne d'import (nom -> code).
    division: divisionLookup || divisionCodeFromPlant(p.cr04e_divisionimport) || (p.cr04e_divisionimport ?? ''),
    // Champs pilotés : repris du lookup stocké. La cascade deRules les réécrit
    // depuis la division pour les usines à règle ; les choix libres (Agen centre
    // profit, Aire groupe article) survivent car `force()` n'écrase pas avec ''.
    classe_valorisation: codeFromLookupValue('classes_valorisation', p._cr04e_classedevalorisation_value, sapOptions.classes_valorisation),
    groupe_article: codeFromLookupValue('groupes_article', p._cr04e_groupearticledivision_value, sapOptions.groupes_article),
    famille_produit: codeFromLookupValue('familles_produit', p._cr04e_hierarchieproduitfamille_value, sapOptions.familles_produit),
    centre_profit: codeFromLookupValue('centres_profit', p._cr04e_centredeprofit_value, sapOptions.centres_profit),
    statut: p.cr04e_statut_en_cours || PROJET_STATUT.de_attente_cc,
  };
};

// Lit une ligne cr04e_projet par son GUID et la renvoie au format formData DE.
// `sapOptions` sert à résoudre les lookups (à charger avant l'appel). null si introuvable.
export async function getProjetById(id, sapOptions = {}) {
  if (!id) return null;
  const result = await Cr04e_projetsService.get(id);
  const p = unwrap(result, 'Lecture');
  return p ? toFormData(p, sapOptions) : null;
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
  // Lookups SAP portés par le projet : on lit le LIBELLÉ FORMATÉ fourni par
  // Dataverse (annotation @OData...FormattedValue). C'est la seule source fiable :
  // les champs `...name` reviennent null, et résoudre le GUID via la table de
  // référence échoue quand celle-ci n'est pas importée (ex. hiérarchie famille vide).
  // La valeur formatée, elle, est toujours présente dès que le lookup est renseigné.
  centre_profit: p[`_cr04e_centredeprofit_value${FMT_VALUE}`] ?? '',
  hierarchie_produit_famille: p[`_cr04e_hierarchieproduitfamille_value${FMT_VALUE}`] ?? '',
  // Date de la demande (champ scalaire, revient tel quel).
  date_demande: (p.cr04e_datedelademande ?? '').slice(0, 10),
  statut: p.cr04e_statut_en_cours || PROJET_STATUT.de_brouillon,
  code_chapeau: p.cr04e_codechapeau ?? '',
  created_date: p.createdon ?? null,
  // Statuts d'envoi SAP posés par le flux Power Automate (TEXTE : « reussi » /
  // « erreur », vide = jamais envoyé). Passe-plat : l'interprétation vit dans
  // `fluxStatut` (erreursSap.js). Le texte permet l'état nul, impossible avec un
  // Oui/Non Dataverse (défaut forcé).
  flux_envoi_de: p.cr04e_fluxenvoiede,
  flux_envoi_fl: p.cr04e_fluxenvoiefl,
});

// Alias d'export pour les tests (la fonction reste interne par ailleurs).
export const listShapeForTest = toListShape;
export const formDataForTest = toFormData;

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
