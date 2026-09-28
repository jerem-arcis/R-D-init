// Logique pure du suivi des créations SAP (Admin).
//
// La table Dataverse `cr04e_gestiondeserreurs` est un JOURNAL D'ÉTAPES EN ERREUR :
// une ligne = une vue/action SAP qui a échoué pour une référence produit. Une même
// référence peut cumuler plusieurs erreurs (à des endroits différents). On regroupe
// donc les lignes PAR RÉFÉRENCE pour reconstituer une « création » et son état.
//
// Aucune I/O ici : ce module ne fait que transformer des lignes déjà lues. La lecture
// Dataverse et le mapping des noms de champs vivent dans `@/api/gestionErreurs`.

// ---------------------------------------------------------------------------
// Statut de traitement (champ texte `cr04e_statuttraitement`).
// Valeurs métier connues ; le champ reste libre côté Dataverse donc on tolère
// les valeurs inconnues (traitées comme « non résolues »).
// ---------------------------------------------------------------------------
export const STATUT_TRAITEMENT = {
  Nouvelle: { key: 'Nouvelle', label: 'Nouvelle', resolved: false },
  PriseEnCompte: { key: 'PriseEnCompte', label: 'Prise en compte', resolved: false },
  Corrigee: { key: 'Corrigee', label: 'Corrigée', resolved: true },
  Ignoree: { key: 'Ignoree', label: 'Ignorée', resolved: true },
};

// Une étape en erreur est « résolue » quand elle a été corrigée ou volontairement
// ignorée. Tout le reste (Nouvelle, PriseEnCompte, valeur inconnue) reste ouvert.
export const isStatutResolu = (statut) =>
  STATUT_TRAITEMENT[statut]?.resolved === true;

// ---------------------------------------------------------------------------
// Résultat agrégé d'une création (dérivé des statuts de ses étapes en erreur).
// ---------------------------------------------------------------------------
export const RESULTAT = {
  reussie: { key: 'reussie', label: 'Réussie', tone: 'emerald' },
  partielle: { key: 'partielle', label: 'Partielle', tone: 'amber' },
  echec: { key: 'echec', label: 'Échec', tone: 'red' },
};

// - aucune étape ouverte  -> Réussie (toutes corrigées/ignorées)
// - toutes ouvertes       -> Échec
// - mélange               -> Partielle
export function computeResultat(errors = []) {
  if (errors.length === 0) return RESULTAT.reussie.key;
  const resolus = errors.filter((e) => isStatutResolu(e.statutTraitement)).length;
  if (resolus === 0) return RESULTAT.echec.key;
  if (resolus === errors.length) return RESULTAT.reussie.key;
  return RESULTAT.partielle.key;
}

// ---------------------------------------------------------------------------
// Référence produit : on retire les zéros de tête (000000000000810501 -> 810501).
// ---------------------------------------------------------------------------
export function stripLeadingZeros(ref) {
  if (ref == null) return '';
  const s = String(ref).trim();
  if (!s) return '';
  const stripped = s.replace(/^0+/, '');
  return stripped === '' ? '0' : stripped;
}

// ---------------------------------------------------------------------------
// Paramètre envoyé : JSON à plat (clés « entryInput/... ») décrivant l'appel OData
// SAP. On en extrait de quoi enrichir l'affichage (désignation, usine…).
// Tolérant : renvoie {} si le JSON est absent/illisible.
// ---------------------------------------------------------------------------
export function parseParametre(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function extractParametre(raw) {
  const obj = typeof raw === 'string' ? parseParametre(raw) : raw;
  if (!obj || typeof obj !== 'object') return {};

  const descriptions = obj['entryInput/to_Description/results'];
  let designation = '';
  if (Array.isArray(descriptions) && descriptions.length) {
    const fr = descriptions.find((d) => (d?.Language || '').toUpperCase() === 'FR');
    const chosen = fr || descriptions[0];
    designation = chosen?.ProductDescription || '';
  }

  const valuations = obj['entryInput/to_Valuation/results'];
  const usine =
    (Array.isArray(valuations) && valuations[0]?.ValuationArea) || '';

  return {
    entity: obj.entity || '',
    product: obj['entryInput/Product'] || '',
    productType: obj['entryInput/ProductType'] || '',
    netWeight: obj['entryInput/NetWeight'] || '',
    designation,
    usine: usine || '',
  };
}

// Aplatit le paramètre envoyé (JSON de forme variable selon l'entité : A_Product,
// A_ProductStorage, Z_ProductCharcValueSet…) en une liste ordonnée de paires
// { key, value } lisibles. Le préfixe technique « entryInput/ » est retiré, les
// objets/tableaux imbriqués sont dépliés en notation pointée. Tolérant : [] si vide.
export function flattenParametre(raw) {
  const obj = typeof raw === 'string' ? parseParametre(raw) : raw;
  if (!obj || typeof obj !== 'object') return [];

  const clean = (k) => String(k).replace(/^entryInput\//, '');
  const out = [];
  const walk = (value, prefix) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        out.push({ key: prefix, value: '[]' });
      } else {
        value.forEach((v, i) => walk(v, `${prefix}[${i}]`));
      }
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        const label = clean(k);
        walk(v, prefix ? `${prefix}.${label}` : label);
      }
    } else {
      out.push({ key: prefix, value: value === null ? '' : String(value) });
    }
  };
  walk(obj, '');
  return out;
}

// ---------------------------------------------------------------------------
// Vues SAP canoniques : liste fixe et ordonnée des étapes de création d'un article.
// Le panneau détail affiche TOUTES ces étapes et marque en rouge celles qui portent
// une ligne d'erreur. Les vraies valeurs de `cr04e_vue` étant susceptibles de varier,
// on matche par mots-clés (insensible casse/accents) ; toute vue non reconnue est
// ajoutée en fin de liste avec son libellé brut.
// ---------------------------------------------------------------------------
export const SAP_VUES = [
  { key: 'donnees_base', label: 'Données de base', keywords: ['base', 'basic', 'general', 'donnees de base'] },
  { key: 'division', label: 'Division et planification', keywords: ['division', 'planification', 'mrp', 'plant'] },
  { key: 'vue_vente', label: 'Vue vente', keywords: ['vente', 'sales'] },
  { key: 'classification', label: 'Classification', keywords: ['classif'] },
  { key: 'emballage', label: 'Emballage', keywords: ['emballage', 'packaging', 'unit'] },
  { key: 'valorisation', label: 'Valorisation / Comptabilité', keywords: ['valorisation', 'valuation', 'costing', 'comptab', 'accounting'] },
];

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
const normalize = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim();

// Table SAP (préfixe du code erreur, ex. « MVKE » dans « MVKE-MTPOS ») -> vue
// canonique. C'est le signal LE PLUS FIABLE : chaque table matériau SAP correspond
// à une vue précise.
export const SAP_TABLE_TO_VUE = {
  MARA: 'donnees_base', // données générales
  MAKT: 'donnees_base', // désignations
  MLAN: 'donnees_base', // données fiscales
  MARC: 'division', // données division / MRP
  MVKE: 'vue_vente', // données commerciales
  MBEW: 'valorisation', // valorisation comptable
  MARM: 'emballage', // unités de mesure
  MEAN: 'emballage', // codes EAN
};

// Indices de classification dans le code/message (pas de préfixe de table dédié).
const CLASSIF_HINTS = ['classification', 'caracteristique', 'classe'];

// Extrait le préfixe de table SAP d'un code erreur : « MVKE-MTPOS » -> « MVKE ».
// Renvoie '' si le code n'a pas la forme TABLE-CHAMP.
export function sapTablePrefix(code) {
  if (!code) return '';
  const m = String(code).trim().toUpperCase().match(/^([A-Z][A-Z0-9]{2,})[-_]/);
  return m ? m[1] : '';
}

// Renvoie la clé de vue canonique correspondant à un libellé `vue`, ou null.
// (Secours : le champ cr04e_vue étant souvent le nom de l'entité, peu fiable.)
export function matchVue(vue) {
  const n = normalize(vue);
  if (!n) return null;
  for (const v of SAP_VUES) {
    if (v.keywords.some((k) => n.includes(normalize(k)))) return v.key;
  }
  return null;
}

// Résout la vue impactée par une ligne d'erreur, par ordre de fiabilité :
//   1) préfixe de table SAP dans cr04e_codeerreursap (MVKE, MARC, MARA…)
//   2) classification, détectée via le code/message
//   3) repli sur le libellé cr04e_vue (mots-clés)
// Renvoie la clé de vue canonique, ou null si rien ne matche.
export function resolveVue(err = {}) {
  const prefix = sapTablePrefix(err.codeErreurSap);
  if (prefix && SAP_TABLE_TO_VUE[prefix]) return SAP_TABLE_TO_VUE[prefix];

  const hay = normalize(`${err.codeErreurSap || ''} ${err.messageErreur || ''}`);
  if (CLASSIF_HINTS.some((h) => hay.includes(normalize(h)))) return 'classification';

  return matchVue(err.vue);
}

// Construit la checklist des étapes d'une création à partir de ses erreurs.
// Chaque étape canonique reçoit son statut : 'erreur' si au moins une ligne d'erreur
// la vise, sinon 'neutre' (non traitée / pas d'info positive côté journal d'erreurs).
// Les vues en erreur non reconnues sont ajoutées en fin de liste.
export function buildChecklist(errors = []) {
  const byKey = new Map();
  const extras = [];
  for (const err of errors) {
    const key = resolveVue(err);
    if (key) {
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(err);
    } else {
      extras.push(err);
    }
  }

  const steps = SAP_VUES.map((v) => ({
    key: v.key,
    label: v.label,
    status: byKey.has(v.key) ? 'erreur' : 'neutre',
    errors: byKey.get(v.key) || [],
  }));

  // Lignes non rattachées à une vue canonique : regroupées sous une seule étape
  // « Autre » (évite de créer de fausses vues à partir de codes/libellés parasites
  // comme « M3 » / « MG »).
  if (extras.length) {
    steps.push({ key: 'autre', label: 'Autre', status: 'erreur', errors: extras });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// Regroupement : lignes normalisées -> créations (une par référence produit).
//
// Chaque ligne normalisée attendue :
//   { id, reference, vue, codeErreurSap, messageErreur, statutTraitement,
//     entite, parametre, createdOn, createdBy, codeChapeau }
// ---------------------------------------------------------------------------
export function buildCreations(rows = []) {
  const byRef = new Map();

  for (const row of rows) {
    const reference = stripLeadingZeros(row.reference);
    const groupKey = reference || row.reference || row.id;
    if (!byRef.has(groupKey)) {
      byRef.set(groupKey, {
        reference,
        referenceRaw: row.reference || '',
        entite: row.entite || '',
        codeChapeau: row.codeChapeau || '',
        errors: [],
        _params: [],
      });
    }
    const creation = byRef.get(groupKey);

    // Métadonnées : on garde la première valeur non vide rencontrée.
    if (!creation.entite && row.entite) creation.entite = row.entite;
    if (!creation.codeChapeau && row.codeChapeau) creation.codeChapeau = row.codeChapeau;

    const params = extractParametre(row.parametre);
    creation._params.push(params);

    creation.errors.push({
      id: row.id,
      vue: row.vue || '',
      codeErreurSap: row.codeErreurSap || '',
      messageErreur: row.messageErreur || '',
      statutTraitement: row.statutTraitement || '',
      entite: row.entite || '',
      parametre: row.parametre || '',
      createdOn: row.createdOn || null,
      createdBy: row.createdBy || '',
    });
  }

  return Array.from(byRef.values()).map((c) => {
    // Désignation / usine : première valeur non vide extraite du paramètre envoyé.
    const designation = c._params.map((p) => p.designation).find(Boolean) || '';
    const usine = c._params.map((p) => p.usine).find(Boolean) || '';
    const dates = c.errors.map((e) => e.createdOn).filter(Boolean).sort();
    const demandeur = c.errors.map((e) => e.createdBy).find(Boolean) || '';

    const { _params, ...rest } = c;
    return {
      ...rest,
      designation,
      usine,
      demandeur,
      createdOn: dates.length ? dates[dates.length - 1] : null,
      resultat: computeResultat(c.errors),
    };
  });
}

// ---------------------------------------------------------------------------
// Statut d'un flux d'envoi SAP porté par le projet (colonnes TEXTE posées par le
// flux Power Automate : cr04e_fluxenvoiede / cr04e_fluxenvoiefl).
//
// Le texte a été choisi car un Oui/Non Dataverse n'est jamais nul (défaut forcé),
// ce qui interdit l'état « jamais envoyé ». Ici : vide/absent = non renseigné
// (pas affiché), sinon on interprète la valeur écrite par le flux.
//
// Valeurs acceptées (tolérant : casse/espaces, 0/1, ou booléen historique) :
//   réussi  <- 'reussi' | 'réussi' | 'ok' | 'success' | '0' | false
//   erreur  <- 'erreur' | 'error' | 'ko' | 'echec' | 'échec' | '1' | true
// Toute autre valeur non vide -> null (on préfère « — » à un statut faux).
// ---------------------------------------------------------------------------
const FLUX_REUSSI = new Set(['reussi', 'réussi', 'ok', 'success', '0', 'false']);
const FLUX_ERREUR = new Set(['erreur', 'error', 'ko', 'echec', 'échec', '1', 'true']);

export function fluxStatut(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 'erreur' : 'reussi';
  const v = String(value).trim().toLowerCase();
  if (v === '') return null;
  if (FLUX_REUSSI.has(v)) return 'reussi';
  if (FLUX_ERREUR.has(v)) return 'erreur';
  return null;
}

// ---------------------------------------------------------------------------
// Résultat d'un envoi FL vers SAP suivi par POLLING de la ligne cr04e_projet.
//
// Le flux Power Automate met > 2 min : on ne peut pas se fier à sa réponse HTTP
// (timeout). On capture `modifiedon` AVANT l'envoi (baseline), puis on relit la
// ligne : tant que `modifiedon` n'a pas bougé, le flux n'a rien écrit -> 'pending'.
// Quand il a bougé, on lit `flux_envoi_fl` pour conclure. Un rebond intermédiaire
// de `modifiedon` sans statut lisible reste 'pending' (le flux écrira le statut
// plus tard). Détecter le CHANGEMENT (pas juste « non vide ») gère le ré-envoi
// d'une fiche dont flux_envoi_fl valait déjà 'erreur'.
//
//   baseline : `modifiedon` au moment de l'envoi (string ISO, ou null si inconnu)
//   state    : { modifiedon, flux } relu de la ligne
//   -> 'reussi' | 'erreur' | 'pending'
// ---------------------------------------------------------------------------
export function resolveFluxOutcome(baseline, state = {}) {
  const { modifiedon, flux } = state;
  const changed = !!modifiedon && modifiedon !== baseline;
  if (!changed) return 'pending';
  const statut = fluxStatut(flux);
  return statut ?? 'pending';
}

// ---------------------------------------------------------------------------
// Suivi par flux (Admin, vue project-driven) : à partir de TOUS les projets, on
// ne garde que ceux ayant une valeur sur au moins un flux (DE ou FL), et on
// rattache la « création » d'erreurs correspondante (jointure par code chapeau,
// zéros de tête tolérés) pour que le panneau de détail rouge reste disponible.
// Une DS écrit la même colonne que la DE (cr04e_fluxenvoiede) : rien de spécial.
// ---------------------------------------------------------------------------
export function buildSuiviFlux(projets = [], creations = []) {
  const byChapeau = new Map();
  for (const c of creations) {
    const key = stripLeadingZeros(c.referenceRaw || c.reference);
    if (key) byChapeau.set(key, c);
  }

  return projets
    .map((p) => {
      const fluxDe = fluxStatut(p.flux_envoi_de);
      const fluxFl = fluxStatut(p.flux_envoi_fl);
      if (fluxDe === null && fluxFl === null) return null;
      const key = stripLeadingZeros(p.code_chapeau);
      return {
        id: p.id,
        codeProjet: p.code_projet || '',
        codeChapeau: p.code_chapeau || '',
        reference: p.code_chapeau || '',
        designation: p.designation_article || '',
        usine: p.usine_validee || '',
        demandeur: p.demandeur || '',
        typeDe: p.type_de || '',
        createdOn: p.created_date || null,
        fluxDe,
        fluxFl,
        creation: (key && byChapeau.get(key)) || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.createdOn || '').localeCompare(a.createdOn || ''));
}

// ---------------------------------------------------------------------------
// KPIs : créations sur les N derniers jours (par date de création), par résultat.
// ---------------------------------------------------------------------------
export function computeKpis(creations = [], { now = new Date(), days = 7 } = {}) {
  const since = new Date(now);
  since.setDate(since.getDate() - days);

  const recentes = creations.filter((c) => {
    if (!c.createdOn) return false;
    const d = new Date(c.createdOn);
    return !Number.isNaN(d.getTime()) && d >= since;
  });

  const count = (key) => recentes.filter((c) => c.resultat === key).length;

  return {
    total: recentes.length,
    reussies: count(RESULTAT.reussie.key),
    partielle: count(RESULTAT.partielle.key),
    echec: count(RESULTAT.echec.key),
  };
}

// ---------------------------------------------------------------------------
// Jointure Admin : enrichit chaque création avec les infos de son projet.
// Clé de liaison : l'ARTICLE du journal (referenceproduit) == le code chapeau du
// projet, aux zéros de tête près (le journal préfixe parfois « 00000 », pas la
// table projet). Repli sur les valeurs déjà extraites quand le projet manque.
// ---------------------------------------------------------------------------
export function joinCodeProjet(creations = [], projets = []) {
  const byChapeau = new Map();
  for (const p of projets) {
    const key = stripLeadingZeros(p.code_chapeau);
    if (key) byChapeau.set(key, p);
  }

  return creations.map((c) => {
    const key = stripLeadingZeros(c.referenceRaw || c.reference);
    const projet = key ? byChapeau.get(key) : undefined;
    return {
      ...c,
      codeProjet: projet?.code_projet || '',
      designation: projet?.designation_article || c.designation || '',
      usine: projet?.usine_validee || c.usine || '',
      demandeur: projet?.demandeur || c.demandeur || '',
    };
  });
}
