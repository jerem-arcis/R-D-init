// Fiche de Lancement (FL) sur Dataverse : la ligne cr04e_projet EST la FL.
// Ce module traduit cr04e_projet <-> objet FL (mêmes noms de champs que l'UI/PDF
// historiques) et porte les accès service (lecture/écriture/liste). Miroir de
// src/api/projet.js. Les tables filles (libellé par pays, emballages) sont
// branchées en Phase 2/3 dans getFicheById/updateFiche.

import { Cr04e_projetsService } from '@/generated';
import { lookupBind } from '@/api/sapLists';
import { trimOrUndef } from '@/api/_odata';
import { withQueue } from '@/api/_serialize';
import { listForProjet as listLibellePays, syncForProjet as syncLibellePays } from '@/api/ficheLibellePays';
import { listForProjet as listEmballages, syncForProjet as syncEmballages, blocsFromRows } from '@/api/ficheEmballages';
import { listValuesForProjet as listCanaux, syncForProjet as syncCanaux } from '@/api/ficheCanaux';

// Clés des 5 blocs emballage (tables filles) : jamais envoyées au payload parent.
const BLOC_KEYS = ['uvc_block', 'element_block', 'couche_block', 'colis_block', 'palette_block'];

const FMT = '@OData.Community.Display.V1.FormattedValue';

// Statut SAP : porté par cr04e_statut_en_cours (version minimale, sans métadonnées).
const SAP_STATUT = 'fl_sap_cree';
const SAP_LABEL = 'Création SAP effectuée';

// Statuts des projets considérés comme des FL (liste Accueil / badge).
const FL_STATUTS = new Set(['dl_validee', SAP_STATUT]);

// Champs texte scalaires : champ FL -> colonne cr04e_projet.
const TEXT_MAP = {
  code_chapeau: 'cr04e_codechapeau',
  code_article: 'cr04e_codechapeau', // même colonne (le code article = code chapeau)
  libelle_article: 'cr04e_nomduproduitdesignation',
  code_etude_rd: 'cr04e_codeprojet',
  date_demande: 'cr04e_datedelademande',
  date_envoi_ficher: 'cr04e_dateenvoidelafiche',
  date_limite_creation_mm01: 'cr04e_datelimitedecreationsouhaitee',
  design_normalisee: 'cr04e_designnormalisee',
  libelle_long_40: 'cr04e_libellelong40caracteres',
  libelle_caisse: 'cr04e_libellearticlecaisse',
  marque: 'cr04e_marque',
  secteur_activite: 'cr04e_secteurdactivite',
  origine_fabrication: 'cr04e_originedefabrication',
  libelle_etiquette_colis: 'cr04e_libelleproduitsuretiquettecolis',
  masque_etiquette_colis: 'cr04e_masquedeletiquettecolis',
  designation_client_colis: 'cr04e_designationclientsurcolis',
  format_date_etiquette_colis: 'cr04e_formatdateetiquettecolis',
  format_dluo_etiquette_colis: 'cr04e_formatdluoetiquettecolis',
  type_magasin: 'cr04e_typedemagasinem',
  // MARA-BISMT (ProductOldID côté OData A_Product) : ancien n° d'article.
  ancien_numero_article: 'cr04e_anciennarticle',
  eclatement_groupe_marchandise: 'cr04e_eclatementgroupedemarchandise',
  type_usine: 'cr04e_typedusine',
  type_palette: 'cr04e_typedesupportpalette',
  duree_vie: 'cr04e_dureedevie',
  unite_duree_vie: 'cr04e_unitedureedevie',
  temps_reception_usine: 'cr04e_tempsdereceptionusinej',
  groupe_statistique_article: 'cr04e_oc2groupestatistiquearticle',
  groupe_article: 'cr04e_oc2groupedarticle',
  groupe_ristourne: 'cr04e_oc2groupederistournes',
  groupe_imputation: 'cr04e_oc2groupeimputationarticle',
};

// Nomenclature douanière : deux colonnes coexistent sur cr04e_projet. La NOUVELLE
// (cr04e_nomenclature_douaniere) est celle que le métier alimente ; l'ancienne
// (cr04e_nomenclaturedouaniere) reste écrite en parallèle tant que des flux la
// lisent encore. Lecture : la nouvelle d'abord, repli sur l'ancienne pour les
// fiches créées avant l'ajout de la colonne. Hors TEXT_MAP (1 champ -> 2 colonnes).
const NOMENCLATURE_COL = 'cr04e_nomenclature_douaniere';
const NOMENCLATURE_COL_LEGACY = 'cr04e_nomenclaturedouaniere';

// Champs date : lus tronqués à AAAA-MM-JJ (input type=date).
const DATE_FIELDS = new Set(['date_demande', 'date_envoi_ficher', 'date_limite_creation_mm01']);

// Visas : champ FL (booléen) -> colonne cr04e_projet.
const VISA_MAP = {
  visa_supply_chain: 'cr04e_visasupplychain',
  visa_industriel: 'cr04e_visaindustriel',
  visa_commerce: 'cr04e_visacommerce',
};

// Lookups : champ FL -> [clé référentiel SAP, propriété @odata.bind, colonne _value].
const LOOKUP_MAP = {
  centre_profit: ['centres_profit', 'cr04e_Centredeprofit@odata.bind', '_cr04e_centredeprofit_value'],
  hierarchie_produit: ['familles_produit', 'cr04e_Hierarchieproduitfamille@odata.bind', '_cr04e_hierarchieproduitfamille_value'],
};

// ---------- Mapping pur ----------

// Ligne cr04e_projet -> objet FL (parent ; les tables filles sont ajoutées ailleurs).
export function toFicheShape(p) {
  if (!p) return null;
  const f = { id: p.cr04e_projetid };
  for (const [ff, col] of Object.entries(TEXT_MAP)) {
    const raw = p[col] ?? '';
    f[ff] = DATE_FIELDS.has(ff) ? String(raw).slice(0, 10) : raw;
  }
  for (const [ff, col] of Object.entries(VISA_MAP)) {
    f[ff] = p[col] === true;
  }
  for (const [ff, [, , valueCol]] of Object.entries(LOOKUP_MAP)) {
    f[ff] = p[`${valueCol}${FMT}`] ?? '';
  }
  f.nomenclature_douaniere =
    (p[NOMENCLATURE_COL] ?? '').trim() || (p[NOMENCLATURE_COL_LEGACY] ?? '').trim();
  if (p.cr04e_statut_en_cours === SAP_STATUT) f.statut_sap = SAP_LABEL;
  return f;
}

// Extrait le code de tête d'une valeur « CODE — LABEL » / « CODE - LABEL » /
// « CODE : LABEL » / « CODE = LABEL ». Les espaces autour du séparateur sont
// facultatifs : le fichier FM écrit aussi bien « Z004 - Carcassonne » que
// « 01-produits finis ». Sans séparateur, renvoie la valeur telle quelle.
// '' -> undefined.
function leadingCode(v) {
  const s = (v ?? '').toString().trim();
  return s ? s.split(/\s*[—:=-]\s*/)[0].trim() : undefined;
}

// Champs dont SEUL LE CODE est stocké puis poussé dans SAP : la désignation
// n'existe que pour l'affichage de la liste déroulante. Les listes fournissent
// déjà le code seul en `value` ; l'extraction ci-dessous nettoie en plus les
// valeurs historiques enregistrées en toutes lettres (« Z004 - Carcassonne »).
const CODE_ONLY_FIELDS = new Set([
  'type_usine',
  'eclatement_groupe_marchandise',
  'nomenclature_douaniere',
  'groupe_imputation',
]);

// Objet FL partiel -> payload cr04e_projet (seuls les champs présents dans `patch`).
// Les lookups sont poussés par leur code, résolus en @odata.bind via le référentiel.
export function buildFichePayload(patch = {}, { sapOptions = {} } = {}) {
  const payload = {};
  for (const [ff, col] of Object.entries(TEXT_MAP)) {
    if (ff in patch) {
      const v = trimOrUndef(patch[ff]);
      if (v !== undefined) payload[col] = CODE_ONLY_FIELDS.has(ff) ? leadingCode(v) : v;
    }
  }
  for (const [ff, col] of Object.entries(VISA_MAP)) {
    if (ff in patch) payload[col] = patch[ff] === true;
  }
  if ('nomenclature_douaniere' in patch) {
    // Seul le code douanier part dans SAP (« 19059030 », pas la ligne complète).
    const v = leadingCode(trimOrUndef(patch.nomenclature_douaniere));
    if (v !== undefined) {
      payload[NOMENCLATURE_COL] = v;
      payload[NOMENCLATURE_COL_LEGACY] = v;
    }
  }
  for (const [ff, [key, bindProp]] of Object.entries(LOOKUP_MAP)) {
    if (ff in patch) {
      // Le lookup matche sur le CODE seul (ex. « 22PF »). La valeur FL peut arriver
      // en « CODE — LABEL » (libellé formaté) : on extrait le code de tête.
      const bind = lookupBind(key, leadingCode(patch[ff]), sapOptions[key]);
      if (bind) payload[bindProp] = bind;
    }
  }
  if ('statut_sap' in patch && patch.statut_sap === SAP_LABEL) {
    payload.cr04e_statut_en_cours = SAP_STATUT;
  }
  // Nombre d'UC / palette : dénormalisé sur la fiche projet depuis le tableau
  // emballage (ligne Palette, colonne Unité = palette_block.unite).
  if ('palette_block' in patch) {
    const uc = patch.palette_block?.unite;
    payload.cr04e_nombreducpalette = uc == null || uc === '' ? '' : String(uc);
  }
  return payload;
}

// Ligne cr04e_projet -> item de la liste FL (Accueil / badge).
export function toFicheListShape(p) {
  const visas = [p.cr04e_visasupplychain, p.cr04e_visaindustriel, p.cr04e_visacommerce];
  return {
    id: p.cr04e_projetid,
    code_article: p.cr04e_codechapeau ?? '',
    libelle_article: p.cr04e_nomduproduitdesignation ?? '',
    usine: p.cr04e_divisionusinename ?? '',
    type_demande: p.cr04e_typedelademande ?? '',
    statut_sap: p.cr04e_statut_en_cours === SAP_STATUT ? SAP_LABEL : '',
    visas_valides: visas.filter((v) => v === true).length,
    created_date: p.createdon ?? null,
  };
}

// ---------- Accès service ----------

// Le client Power Apps ne lève pas : il résout { success:false, error }. On
// transforme l'échec en exception lisible (cf. src/api/projet.js).
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

// Lit une FL (projet) par GUID -> objet FL, tables filles incluses. null si introuvable.
export async function getFicheById(id) {
  if (!id) return null;
  const result = await Cr04e_projetsService.get(id);
  const p = unwrap(result, 'Lecture FL');
  if (!p) return null;
  const fiche = toFicheShape(p);
  fiche.libelle_par_pays = await listLibellePays(id);
  fiche.canaux_distribution = await listCanaux(id);
  Object.assign(fiche, blocsFromRows(await listEmballages(id)));
  return fiche;
}

// Résout un code PJ (cr04e_codeprojet, humain) vers le GUID de la ligne
// cr04e_projet, pour les liens profonds des mails. Renvoie null si introuvable.
// Le code PJ est supposé unique (top:1). Les apostrophes sont échappées (OData).
export async function getProjetIdByCodePJ(code) {
  const c = (code ?? '').trim();
  if (!c) return null;
  const safe = c.replace(/'/g, "''");
  const result = await Cr04e_projetsService.getAll({
    filter: `cr04e_codeprojet eq '${safe}'`,
    select: ['cr04e_projetid'],
    top: 1,
  });
  const rows = unwrap(result, 'Résolution code PJ') ?? [];
  return rows[0]?.cr04e_projetid ?? null;
}

// Met à jour une FL (projet + tables filles). `patch` = objet FL partiel. Le parent
// n'est écrit que si son payload n'est pas vide. `sapOptions` résout les lookups.
// Les sauvegardes d'une MÊME fiche sont sérialisées : les tables filles se
// synchronisent en « lire -> diff -> écrire », donc deux sauvegardes concurrentes
// liraient le même état d'avant écriture (cf. src/api/_serialize.js).
export async function updateFiche(id, patch, { sapOptions = {} } = {}) {
  if (!id) return;
  return withQueue(id, () => writeFiche(id, patch, { sapOptions }));
}

async function writeFiche(id, patch, { sapOptions }) {
  const payload = buildFichePayload(patch, { sapOptions });
  if (Object.keys(payload).length) {
    const result = await Cr04e_projetsService.update(id, payload);
    unwrap(result, 'Mise à jour FL');
  }
  if (Array.isArray(patch?.libelle_par_pays)) {
    await syncLibellePays(id, patch.libelle_par_pays);
  }
  if (Array.isArray(patch?.canaux_distribution)) {
    await syncCanaux(id, patch.canaux_distribution);
  }
  // Emballages : EmballagesTable n'envoie qu'un bloc à la fois. On fusionne le(s)
  // bloc(s) du patch avec les blocs existants (relus) avant de synchroniser, sinon
  // les blocs absents du patch seraient supprimés à tort.
  if (BLOC_KEYS.some((k) => k in (patch || {}))) {
    const current = blocsFromRows(await listEmballages(id));
    for (const k of BLOC_KEYS) if (k in patch) current[k] = patch[k];
    await syncEmballages(id, current);
  }
}

// Liste des FL = projets en phase FL (dl_validee / fl_sap_cree), triés récents d'abord.
export async function listFiches() {
  const all = [];
  let skipToken;
  let guard = 0;
  do {
    const result = await Cr04e_projetsService.getAll({
      maxPageSize: 5000,
      ...(skipToken ? { skipToken } : {}),
    });
    all.push(...(unwrap(result, 'Liste FL') ?? []));
    skipToken = result?.skipToken;
    guard += 1;
  } while (skipToken && guard < 100);

  return all
    .filter((p) => FL_STATUTS.has(p.cr04e_statut_en_cours))
    .map(toFicheListShape)
    .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
}
