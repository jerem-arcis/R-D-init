// Fiche de Lancement (FL) sur Dataverse : la ligne cr04e_projet EST la FL.
// Ce module traduit cr04e_projet <-> objet FL (mêmes noms de champs que l'UI/PDF
// historiques) et porte les accès service (lecture/écriture/liste). Miroir de
// src/api/projet.js. Les tables filles (libellé par pays, emballages) sont
// branchées en Phase 2/3 dans getFicheById/updateFiche.

import { Cr04e_projetsService, Cr04e_divisionprojetsService } from '@/generated';
import { lookupBind } from '@/api/sapLists';
import {
  DE_DIVISION_CODES,
  computeProfilFabricRepetDE,
  divisionCodeFromPlant,
  usineLabelFromDivision,
} from '@/lib/deRules';
import { FIELD_OWNERS, FORMATS_DATE_ETIQUETTE, GROUPE_STATISTIQUE_DEFAUT, codeSecteur, isFieldEditable } from '@/lib/ficheSchema';
import { trimOrUndef } from '@/api/_odata';
import { withQueue } from '@/api/_serialize';
import { listForProjet as listLibellePays, syncForProjet as syncLibellePays } from '@/api/ficheLibellePays';
import { listForProjet as listEmballages, syncForProjet as syncEmballages, blocsFromRows } from '@/api/ficheEmballages';
import { listValuesForProjet as listCanaux, syncForProjet as syncCanaux } from '@/api/ficheCanaux';
import { listValuesForProjet as listSitesStockage, syncForProjet as syncSitesStockage } from '@/api/ficheSitesStockage';

// Clés des 5 blocs emballage (tables filles) : jamais envoyées au payload parent.
const BLOC_KEYS = ['uvc_block', 'element_block', 'couche_block', 'colis_block', 'palette_block'];

// Colonnes EAN du projet (écrites par la DE/DS depuis le code chapeau) <-> bloc FL.
const EAN_COLS = {
  colis_block: 'cr04e_eancar',
  couche_block: 'cr04e_eanzco',
  palette_block: 'cr04e_eanpal',
};

const FMT = '@OData.Community.Display.V1.FormattedValue';

// Statut SAP : porté par cr04e_statut_en_cours (version minimale, sans métadonnées).
const SAP_STATUT = 'fl_sap_cree';
const SAP_LABEL = 'Création SAP effectuée';

// Statuts des projets considérés comme des FL (liste Accueil / badge) :
//   dl_validee  — DE validée par le CDG
//   ds_validee  — DS validée (négoce) : même droit d'entrée en FL que la DE.
//                 Cohérent avec dashboardStats, qui compte déjà les deux comme
//                 « validées ».
//   fl_sap_cree — article déjà créé dans SAP (le statut écrase le précédent,
//                 quelle que soit la voie d'origine).
const FL_STATUTS = new Set(['dl_validee', 'ds_validee', SAP_STATUT]);

// Un projet est-il entré en phase FL ? (prédicat pur, testable)
export const isPhaseFL = (statut) => FL_STATUTS.has(statut);

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
  // Formats date / DLUO : stockés sans leur numéro (« JJ MM AA », seul le motif part
  // dans SAP) ; on retrouve l'option « 2 - JJ MM AA » pour qu'elle soit présélectionnée.
  for (const ff of LABEL_ONLY_FIELDS) f[ff] = optionFormatDate(f[ff]);
  // Secteur : code seul (une ancienne saisie FL a pu écrire « 15 - Marques Distrib. »).
  f.secteur_activite = codeSecteur(f.secteur_activite);
  for (const [ff, col] of Object.entries(VISA_MAP)) {
    f[ff] = p[col] === true;
  }
  for (const [ff, [, , valueCol]] of Object.entries(LOOKUP_MAP)) {
    f[ff] = p[`${valueCol}${FMT}`] ?? '';
  }
  f.nomenclature_douaniere =
    (p[NOMENCLATURE_COL] ?? '').trim() || (p[NOMENCLATURE_COL_LEGACY] ?? '').trim();
  // Type de produit de la demande (PFIN / NEGO) : non éditable en FL, sert de flag
  // métier (négoce -> pas de type d'usine, cf. isFicheNegoce dans ficheSchema).
  f.type_produit = String(p.cr04e_typedeproduit ?? '').trim().toUpperCase();
  if (p.cr04e_statut_en_cours === SAP_STATUT) f.statut_sap = SAP_LABEL;
  // Suivi de l'envoi FL vers SAP : statut posé par le flux (vide = jamais envoyé)
  // et horodatage système de la ligne, servant de baseline au polling (cf.
  // resolveFluxOutcome / getFicheFluxState).
  f.flux_envoi_fl = p.cr04e_fluxenvoiefl;
  f.modified_on = p.modifiedon ?? null;
  f.demande = demandeOrigine(p);
  // Code division du dossier (non éditable en FL) : sert à déduire sa société.
  f.division =
    String(p[`_cr04e_divisionusine_value${FMT}`] ?? '').trim() ||
    divisionCodeFromPlant(p.cr04e_divisionimport);
  return f;
}

// ---------- Reprise DE/DS -> FL ----------
// La demande (DE ou DS) et la FL partagent la ligne cr04e_projet : les colonnes
// communes (libellé, code projet, date, centre de profit, hiérarchie, secteur)
// s'affichent donc telles quelles. Les champs ci-dessous ont une colonne FL
// distincte, vide à l'ouverture : on les déduit de ce que la demande a déjà saisi.

// Demande d'origine (libellé du tag « depuis DE / DS »). fl_sap_cree écrase le
// statut ds_* : repli sur l'activité, colonne propre à la DS.
export function demandeOrigine(p = {}) {
  const statut = String(p.cr04e_statut_en_cours ?? '');
  return statut.startsWith('ds_') || String(p.cr04e_activite_ds ?? '').trim() ? 'DS' : 'DE';
}

// Valeurs FL déductibles de la demande. `profilFabricRepet` = profil porté par la
// ligne cr04e_divisionprojet (écrit à la création DE/DS, négoce inclus) ; à défaut,
// recalculé depuis la division.
export function valeursDemande(p = {}, { profilFabricRepet } = {}) {
  const division = String(p[`_cr04e_divisionusine_value${FMT}`] ?? '').trim();
  const v = {};
  // Origine de fabrication : code division d'origine saisi en DS (usine de
  // fabrication d'origine) ; sinon division DE/DS, seulement si c'est un site de
  // fabrication (en négoce la division est un entrepôt, ex. 2820).
  const origineDS = String(p.cr04e_codedivisionorigine ?? '').trim();
  if (origineDS) v.origine_fabrication = origineDS;
  else if (DE_DIVISION_CODES.includes(division)) v.origine_fabrication = division;
  // Type d'usine = profil de fabrication répétitive (même champ SAP MARC-SFEPR).
  const profil = String(profilFabricRepet ?? '').trim() || computeProfilFabricRepetDE(division);
  if (profil) v.type_usine = profil;
  // Groupe imputation article : 01 produits finis (PFIN) / 05 produits négoce (NEGO).
  const typeProduit = String(p.cr04e_typedeproduit ?? '').trim().toUpperCase();
  if (typeProduit === 'PFIN') v.groupe_imputation = '01';
  if (typeProduit === 'NEGO') v.groupe_imputation = '05';
  // Groupe statistique article : règle atelier « toujours 1 » — prérempli sur toute
  // FL (l'ADV n'a plus à le choisir, cf. GROUPES_STATISTIQUE réduit à « 1 »).
  v.groupe_statistique_article = GROUPE_STATISTIQUE_DEFAUT;
  // Poids net UVC en kg, comme la DE/DS (ZUG = poids × 1000 des deux côtés).
  const poids = p.cr04e_poidsnet;
  if (poids !== null && poids !== undefined && poids !== '' && Number.isFinite(Number(poids))) {
    v.poids_net_uvc = Number(poids);
  }
  // GTIN colis / couche / palette : EAN déjà calculés et stockés par la DE/DS
  // (même dérivation GS1 que la FL, cf. lib/ean.js).
  const gtin = {};
  for (const [bloc, col] of Object.entries(EAN_COLS)) {
    const ean = String(p[col] ?? '').trim();
    if (ean) gtin[bloc] = ean;
  }
  if (Object.keys(gtin).length) v.gtin = gtin;
  return v;
}

const vide = (v) => v === null || v === undefined || v === '';

// Complète la fiche avec les valeurs de la demande, UNIQUEMENT sur les champs vides
// et encore éditables (section non visée, article non créé) : une saisie FL n'est
// jamais écrasée, et une section visée montre ce qui est réellement en base.
// `fiche.herite` = { champ: section qui l'écrit au visa } (tag « depuis DE » + visa).
export function appliquerHeritage(fiche, valeurs = {}) {
  const herite = {};
  for (const champ of ['origine_fabrication', 'type_usine', 'groupe_imputation', 'groupe_statistique_article']) {
    if (valeurs[champ] && vide(fiche[champ]) && isFieldEditable(champ, fiche)) {
      fiche[champ] = valeurs[champ];
      herite[champ] = FIELD_OWNERS[champ];
    }
  }
  const uvc = fiche.uvc_block || {};
  if (valeurs.poids_net_uvc != null && vide(uvc.poids_net) && isFieldEditable('uvc_block', fiche)) {
    fiche.uvc_block = { ...uvc, poids_net: valeurs.poids_net_uvc };
    herite.uvc_block = 'ind';
  }
  // GTIN : saisis par le Commerce (colonne éditable tant que le visa Commerce n'est
  // pas posé), même si les blocs emballage appartiennent à l'Industriel.
  const gtinEditable = fiche.statut_sap !== SAP_LABEL && !fiche.visa_commerce;
  for (const [bloc, gtin] of Object.entries(valeurs.gtin || {})) {
    const b = fiche[bloc] || {};
    if (vide(b.gtin) && gtinEditable) {
      fiche[bloc] = { ...b, gtin };
      herite[bloc] = 'com';
    }
  }
  fiche.herite = herite;
  return fiche;
}

// Champs repris de la demande pour une section (`owner` = sc | ind | com), à écrire
// avec son visa : le flux SAP relit Dataverse, la valeur validée doit y être.
export function patchHeritage(fiche, owner) {
  const patch = {};
  for (const [champ, section] of Object.entries(fiche?.herite || {})) {
    if (section === owner) patch[champ] = fiche[champ];
  }
  return patch;
}

// Extrait le code de tête d'une valeur « CODE — LABEL » / « CODE - LABEL » /
// « CODE : LABEL » / « CODE = LABEL ». Les espaces autour du séparateur sont
// facultatifs : le fichier FM écrit aussi bien « Z008 - Bonloc » que
// « 01-produits finis ». Sans séparateur, renvoie la valeur telle quelle.
// '' -> undefined.
function leadingCode(v) {
  const s = (v ?? '').toString().trim();
  return s ? s.split(/\s*[—:=-]\s*/)[0].trim() : undefined;
}

// Champs dont SEUL LE CODE est stocké puis poussé dans SAP : la désignation
// n'existe que pour l'affichage de la liste déroulante. Les listes fournissent
// déjà le code seul en `value` ; l'extraction ci-dessous nettoie en plus les
// valeurs historiques enregistrées en toutes lettres (« Z008 - Bonloc »).
const CODE_ONLY_FIELDS = new Set([
  'type_usine',
  'eclatement_groupe_marchandise',
  'nomenclature_douaniere',
  'groupe_imputation',
]);

// Champs « N - LABEL » (formats date / DLUO de l'étiquette colis) dont SEUL LE
// LABEL part dans SAP : « 2 - JJ MM AA » -> « JJ MM AA ». La liste déroulante
// stocke la valeur préfixée du numéro (issue du fichier FM) ; SAP n'attend que le
// motif de date. Miroir de CODE_ONLY_FIELDS, côté label.
const LABEL_ONLY_FIELDS = new Set([
  'format_date_etiquette_colis',
  'format_dluo_etiquette_colis',
]);

// Retire le préfixe « N - » d'une valeur « N - LABEL » et renvoie le label seul.
// Sans préfixe numérique en tête, renvoie la valeur inchangée.
function labelSansCode(v) {
  return (v ?? '').toString().replace(/^\s*\d+\s*[—:=-]\s*/, '').trim();
}

// Inverse de labelSansCode à la lecture : « JJ MM AA » -> option « 2 - JJ MM AA ».
// Valeur inconnue de la liste : renvoyée telle quelle.
function optionFormatDate(v) {
  const s = (v ?? '').toString().trim();
  if (!s) return v ?? '';
  return FORMATS_DATE_ETIQUETTE.find((o) => o === s || labelSansCode(o) === s) || s;
}

// Objet FL partiel -> payload cr04e_projet (seuls les champs présents dans `patch`).
// Les lookups sont poussés par leur code, résolus en @odata.bind via le référentiel.
export function buildFichePayload(patch = {}, { sapOptions = {} } = {}) {
  const payload = {};
  for (const [ff, col] of Object.entries(TEXT_MAP)) {
    if (ff in patch) {
      const v = trimOrUndef(patch[ff]);
      if (v !== undefined) {
        payload[col] = CODE_ONLY_FIELDS.has(ff)
          ? leadingCode(v)
          : LABEL_ONLY_FIELDS.has(ff)
            ? labelSansCode(v)
            : v;
      }
    }
  }
  // Secteur d'activité : code seul, comme la DE/DS (« 15 », pas le libellé de la liste).
  if (payload.cr04e_secteurdactivite) {
    payload.cr04e_secteurdactivite = codeSecteur(payload.cr04e_secteurdactivite);
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
  // GTIN colis / couche / palette : le tableau FL fait foi (un GTIN peut changer
  // après la DE). On repousse donc la saisie dans les colonnes EAN du projet, en
  // plus des lignes cr04e_unitofmeasure. Bloc sans clé `gtin` -> colonne non touchée.
  for (const [bloc, col] of Object.entries(EAN_COLS)) {
    const b = patch[bloc];
    if (b && typeof b === 'object' && 'gtin' in b) {
      payload[col] = vide(b.gtin) ? '' : String(b.gtin).trim();
    }
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
    // Usine = libellé dérivé de la DIVISION du projet (valeur formatée du lookup),
    // pas du champ `...name` qui revient null en prod. Repli sur le nom de site des
    // imports beCPG. Même logique que toListShape (src/api/projet.js).
    usine: usineLabelFromDivision(
      String(p[`_cr04e_divisionusine_value${FMT}`] ?? '').trim() ||
        divisionCodeFromPlant(p.cr04e_divisionimport),
    ),
    // Code division du dossier : sert à déduire sa société (cf. lib/perimetre.js).
    division:
      String(p[`_cr04e_divisionusine_value${FMT}`] ?? '').trim() ||
      divisionCodeFromPlant(p.cr04e_divisionimport),
    type_demande: p.cr04e_typedelademande ?? '',
    statut_sap: p.cr04e_statut_en_cours === SAP_STATUT ? SAP_LABEL : '',
    visas_valides: visas.filter((v) => v === true).length,
    created_date: p.createdon ?? null,
    // Statuts d'envoi SAP posés par le flux Power Automate (TEXTE brut ; vide =
    // jamais envoyé). Interprétés via `fluxStatut` (erreursSap.js) à l'affichage.
    flux_envoi_de: p.cr04e_fluxenvoiede,
    flux_envoi_fl: p.cr04e_fluxenvoiefl,
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
  fiche.sites_stockage = await listSitesStockage(id);
  Object.assign(fiche, blocsFromRows(await listEmballages(id)));
  const profilFabricRepet = await lireProfilFabricRepet(id);
  return appliquerHeritage(fiche, valeursDemande(p, { profilFabricRepet }));
}

// Lecture LÉGÈRE pour le polling de l'envoi FL -> SAP : uniquement l'horodatage
// système et le statut de flux, sans les tables filles (chaque tick doit rester
// bon marché). Renvoie { modifiedon, flux } ; { modifiedon: null } si introuvable.
export async function getFicheFluxState(id) {
  if (!id) return { modifiedon: null, flux: null };
  const result = await Cr04e_projetsService.getAll({
    filter: `cr04e_projetid eq ${id}`,
    select: ['modifiedon', 'cr04e_fluxenvoiefl'],
    top: 1,
  });
  const rows = unwrap(result, 'Lecture statut flux FL') ?? [];
  const row = rows[0];
  if (!row) return { modifiedon: null, flux: null };
  return { modifiedon: row.modifiedon ?? null, flux: row.cr04e_fluxenvoiefl ?? null };
}

// Profil de fabrication répétitive porté par les lignes cr04e_divisionprojet du
// projet (PROD, ou STOCK en négoce). Best-effort : '' si absent ou en échec, la FL
// retombe alors sur la règle division (valeursDemande).
async function lireProfilFabricRepet(projetId) {
  try {
    const result = await Cr04e_divisionprojetsService.getAll({
      filter: `_cr04e_projet_value eq ${projetId} and cr04e_profilfabricrepet ne null`,
      select: ['cr04e_profilfabricrepet'],
      top: 1,
    });
    const rows = unwrap(result, 'Lecture profil de fabrication') ?? [];
    return rows[0]?.cr04e_profilfabricrepet ?? '';
  } catch (err) {
    console.warn('[FL profil de fabrication]', err);
    return '';
  }
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
  if (Array.isArray(patch?.sites_stockage)) {
    await syncSitesStockage(id, patch.sites_stockage);
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
    .filter((p) => isPhaseFL(p.cr04e_statut_en_cours))
    .map(toFicheListShape)
    .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
}
