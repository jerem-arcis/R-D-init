// Périmètre société & droits par groupe — règles PURES (testées dans
// perimetre.test.js). Tout part de la table société : ses groupes de sécurité
// déterminent qui voit quelles divisions / canaux / dossiers et qui modifie quoi.
// Les écrans n'implémentent aucune règle : ils passent par ces fonctions (via
// usePerimetre). Spec : docs/superpowers/specs/2026-10-02-perimetre-societe-droits-design.md
//
// Entrées normalisées (cf. src/api/referentiels.js) :
//   societe  = { id, code, nom, groupes: { admin, adv, commerce, industrie, qualite } }
//   division = { id, value, designation, societe, type }
//   orgCo    = { id, value, designation, societe }
//   canal    = { id, value, designation, orgCo }

import { DE_DIVISION_CODES } from './deRules';

export const ROLES = ['admin', 'adv', 'commerce', 'industrie', 'qualite'];

// Bloc FL (owner de ficheSchema) -> rôle qui peut le modifier et le viser. Le rôle
// qualité n'a pas encore de bloc : il suffira d'ajouter sa ligne ici.
export const ROLE_PAR_BLOC = { sc: 'adv', ind: 'industrie', com: 'commerce' };

export const TYPES_DIVISION = ['PROD', 'STOCK'];

// Les liens entre tables sont des codes texte : comparaison sans espaces ni casse.
const norm = (v) => String(v ?? '').trim().toUpperCase();
const parCode = (a, b) => a.value.localeCompare(b.value, undefined, { numeric: true });

// Cellule de groupes -> GUID distincts en minuscules. Tolère `;`, `,`, espaces.
export function parseGroupIds(cell) {
  const ids = String(cell ?? '').split(/[;,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  return [...new Set(ids)];
}

// Tous les GUID de groupes référencés par les sociétés (à résoudre au démarrage).
export function allGroupIds(societes = []) {
  const ids = new Set();
  for (const s of societes) {
    for (const role of ROLES) parseGroupIds(s.groupes?.[role]).forEach((g) => ids.add(g));
  }
  return [...ids];
}

export function buildPerimetre({ societes = [], divisions = [], orgCos = [], canaux = [], mesGroupes = [] } = {}) {
  const mine = new Set(mesGroupes.map((g) => String(g).toLowerCase()));

  const socs = societes.map((s) => {
    const ids = Object.fromEntries(ROLES.map((r) => [r, parseGroupIds(s.groupes?.[r])]));
    // Société ouverte = aucun groupe renseigné : les règles ne s'appliquent pas.
    const ouverte = ROLES.every((r) => ids[r].length === 0);
    const roles = new Set(ouverte ? ROLES : ROLES.filter((r) => ids[r].some((g) => mine.has(g))));
    return {
      ...s,
      key: norm(s.code),
      ouverte,
      roles,
      visible: ouverte || roles.size > 0,
      aGroupeAdmin: ids.admin.length > 0,
      // Membre réel du groupe admin (≠ rôle admin « offert » par une société ouverte).
      estAdmin: ids.admin.some((g) => mine.has(g)),
    };
  });

  const socByKey = new Map(socs.map((s) => [s.key, s]));
  const socByNom = new Map(socs.filter((s) => norm(s.nom)).map((s) => [norm(s.nom), s]));
  // Référence société portée par une ligne (code, à défaut nom) -> clé société | null.
  const socKey = (ref) => {
    const k = norm(ref);
    if (!k) return null;
    return (socByKey.get(k) || socByNom.get(k))?.key ?? null;
  };

  const divs = divisions.map((d) => ({ ...d, socKey: socKey(d.societe), type: norm(d.type) }));
  const ocs = orgCos.map((o) => ({ ...o, socKey: socKey(o.societe) }));
  const ocByKey = new Map(ocs.map((o) => [norm(o.value), o]));
  const cans = canaux.map((c) => ({ ...c, socKey: ocByKey.get(norm(c.orgCo))?.socKey ?? null }));

  const adminOuvert = !socs.some((s) => s.aGroupeAdmin);
  return {
    societes: socs,
    socByKey,
    divisions: divs,
    divByKey: new Map(divs.map((d) => [norm(d.value), d])),
    orgCos: ocs,
    canaux: cans,
    mesSocietes: socs.filter((s) => s.visible).map((s) => s.code),
    adminOuvert,
    isAdmin: adminOuvert || socs.some((s) => s.estAdmin),
  };
}

// Code société d'une division, ou null (division vide, inconnue ou sans société).
export function societeDeDivision(p, codeDivision) {
  const key = p?.divByKey.get(norm(codeDivision))?.socKey;
  return key ? p.socByKey.get(key).code : null;
}

const socDuDossier = (p, codeDivision) => {
  const key = p?.divByKey.get(norm(codeDivision))?.socKey;
  return key ? p.socByKey.get(key) : null;
};

// Une ligne sans société connue n'est rattachée à personne : visible par tous.
const ligneVisible = (p, row) => !row.socKey || p.socByKey.get(row.socKey).visible;

// Un dossier sans division (ou sans société déductible) reste visible par tous.
export function peutVoirDossier(p, codeDivision) {
  if (!p) return true;
  const s = socDuDossier(p, codeDivision);
  return !s || s.visible;
}

const sortie = (rows) =>
  rows.map(({ id, value, designation }) => ({ id, value, designation })).sort(parCode);

// Divisions proposées dans une liste déroulante.
//  - DE : type PROD parmi mes sociétés. Tant qu'AUCUNE division n'est typée PROD
//    (référentiel pas encore qualifié), repli sur les sites de fabrication
//    historiques pour ne pas vider la liste.
//  - FL : type STOCK de la société du dossier ; aucune STOCK -> toutes ses divisions.
//    Dossier sans société -> même règle sur mes sociétés.
//  - DS : toutes les divisions visibles (règles métier à venir).
export function divisionsPour(p, usage, codeDivisionDossier) {
  if (!p) return [];
  const visibles = p.divisions.filter((d) => ligneVisible(p, d));
  if (usage === 'DE') {
    const qualifie = p.divisions.some((d) => d.type === 'PROD');
    return sortie(visibles.filter((d) =>
      (qualifie ? d.type === 'PROD' : DE_DIVISION_CODES.includes(String(d.value).trim()))));
  }
  if (usage === 'FL') {
    const s = socDuDossier(p, codeDivisionDossier);
    const pool = s ? p.divisions.filter((d) => d.socKey === s.key) : visibles;
    const stock = pool.filter((d) => d.type === 'STOCK');
    return sortie(stock.length ? stock : pool);
  }
  return sortie(visibles);
}

// Canaux proposés dans une FL : ceux des orgCo de la société du dossier, dédoublonnés
// par code (un même canal existe sous plusieurs orgCo). Dossier sans société ->
// canaux de mes sociétés.
export function canauxPour(p, codeDivisionDossier) {
  if (!p) return [];
  const s = socDuDossier(p, codeDivisionDossier);
  const pool = s ? p.canaux.filter((c) => c.socKey === s.key) : p.canaux.filter((c) => ligneVisible(p, c));
  const vus = new Set();
  const uniques = pool.filter((c) => {
    const k = norm(c.value);
    if (!k || vus.has(k)) return false;
    vus.add(k);
    return true;
  });
  return uniques.map(({ value, designation }) => ({ value, designation })).sort(parCode);
}

const aLeRole = (s, role) => s.ouverte || s.roles.has('admin') || (!!role && s.roles.has(role));

// Droit de modifier (et de viser) un bloc de la FL. Dossier sans société : il suffit
// de détenir le rôle dans au moins une de ses sociétés.
export function peutModifierBloc(p, owner, codeDivisionDossier) {
  if (!p || p.societes.length === 0) return true;
  const role = ROLE_PAR_BLOC[owner];
  const s = socDuDossier(p, codeDivisionDossier);
  if (s) return s.visible && aLeRole(s, role);
  return p.societes.some((x) => x.visible && aLeRole(x, role));
}

// Suis-je admin de la société du dossier ? Sert au déblocage d'une FL dont l'envoi
// SAP a échoué (seuls les admins modifient et relancent). Société ouverte : tout le
// monde ; société sans groupe admin ou dossier sans société : n'importe quel admin.
export function estAdminDossier(p, codeDivisionDossier) {
  if (!p || p.societes.length === 0) return true;
  const s = socDuDossier(p, codeDivisionDossier);
  if (!s) return p.isAdmin;
  return s.ouverte || s.estAdmin || (!s.aGroupeAdmin && p.isAdmin);
}

// Sociétés dont je peux gérer les référentiels dans l'Admin. Une société sans groupe
// admin est gérable par n'importe quel admin.
export function societesAdministrables(p) {
  if (!p || !p.isAdmin) return [];
  return p.societes.filter((s) => p.adminOuvert || s.estAdmin || !s.aGroupeAdmin).map((s) => s.code);
}

// Lignes des quatre référentiels visibles dans l'Admin (périmètre de l'admin). Les
// lignes sans société connue sont gérables par n'importe quel admin.
export function lignesAdmin(p) {
  if (!p || !p.isAdmin) return { societes: [], divisions: [], orgCos: [], canaux: [] };
  const keys = new Set(societesAdministrables(p).map(norm));
  const ok = (row) => !row.socKey || keys.has(row.socKey);
  return {
    societes: p.societes.filter((s) => keys.has(s.key)),
    divisions: p.divisions.filter(ok).sort(parCode),
    orgCos: p.orgCos.filter(ok).sort(parCode),
    canaux: p.canaux.filter(ok).sort(parCode),
  };
}
