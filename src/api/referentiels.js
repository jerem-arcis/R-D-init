// Référentiels de structure SAP (Société -> Division, Société -> Organisation
// commerciale -> Canal). Lecture normalisée pour src/lib/perimetre.js + écritures
// de l'onglet Admin (modification seule : les lignes sont créées par SAP).
// Les liens entre tables sont des codes texte, pas des lookups.

import {
  Cr04e_societereferentielsService,
  Cr04e_divisionusinesService,
  Cr04e_organisationcommercialereferentielsService,
  Cr04e_canaldedistributionreferentielsService,
} from '@/generated';

// Le client Power Apps ne lève pas : il résout { success:false, error }.
function unwrap(result, action) {
  if (result && result.success === false) {
    const err = result.error || {};
    const status = err.status ? `HTTP ${err.status}` : 'échec';
    throw new Error(`${action} Dataverse - ${status} : ${err.message || 'erreur inconnue'}`);
  }
  return result?.data ?? null;
}

// Dataverse pagine : on suit le skipToken pour lire la table en entier.
async function readAll(service, action) {
  const all = [];
  let skipToken;
  let guard = 0;
  do {
    const result = await service.getAll({ maxPageSize: 5000, ...(skipToken ? { skipToken } : {}) });
    all.push(...(unwrap(result, action) ?? []));
    skipToken = result?.skipToken;
    guard += 1;
  } while (skipToken && guard < 100);
  return all;
}

const txt = (v) => String(v ?? '').trim();

export const toSociete = (r) => ({
  id: r.cr04e_societereferentielid,
  code: txt(r.cr04e_ste),
  nom: txt(r.cr04e_nomsociete),
  groupes: {
    admin: txt(r.cr04e_groupeadmin),
    adv: txt(r.cr04e_groupeadv),
    commerce: txt(r.cr04e_groupecommerce),
    industrie: txt(r.cr04e_groupeindustrie),
    qualite: txt(r.cr04e_groupequalite),
  },
});

export const toDivision = (r) => ({
  id: r.cr04e_divisionusineid,
  value: txt(r.cr04e_division),
  designation: txt(r.cr04e_nom1),
  societe: txt(r.cr04e_societe),
  type: txt(r.cr04e_type),
});

export const toOrgCo = (r) => ({
  id: r.cr04e_organisationcommercialereferentielid,
  value: txt(r.cr04e_orgco),
  designation: txt(r.cr04e_designation),
  societe: txt(r.cr04e_nomsociete),
});

export const toCanal = (r) => ({
  id: r.cr04e_canaldedistributionreferentielid,
  value: txt(r.cr04e_canal),
  designation: txt(r.cr04e_designation),
  orgCo: txt(r.cr04e_orgco),
});

export async function listReferentiels() {
  const [societes, divisions, orgCos, canaux] = await Promise.all([
    readAll(Cr04e_societereferentielsService, 'Lecture sociétés'),
    readAll(Cr04e_divisionusinesService, 'Lecture divisions'),
    readAll(Cr04e_organisationcommercialereferentielsService, 'Lecture organisations commerciales'),
    readAll(Cr04e_canaldedistributionreferentielsService, 'Lecture canaux de distribution'),
  ]);
  return {
    societes: societes.map(toSociete).filter((s) => s.code),
    divisions: divisions.map(toDivision).filter((d) => d.value),
    orgCos: orgCos.map(toOrgCo).filter((o) => o.value),
    canaux: canaux.map(toCanal).filter((c) => c.value),
  };
}

// ---- Écritures Admin (modification seule) ----

const GROUPE_COLS = {
  admin: 'cr04e_groupeadmin',
  adv: 'cr04e_groupeadv',
  commerce: 'cr04e_groupecommerce',
  industrie: 'cr04e_groupeindustrie',
  qualite: 'cr04e_groupequalite',
};

export async function updateSociete(id, { nom, groupes } = {}) {
  const fields = {};
  if (nom !== undefined) fields.cr04e_nomsociete = nom;
  for (const [role, col] of Object.entries(GROUPE_COLS)) {
    if (groupes?.[role] !== undefined) fields[col] = groupes[role];
  }
  unwrap(await Cr04e_societereferentielsService.update(id, fields), 'Mise à jour société');
}

export async function updateDivision(id, { designation, type } = {}) {
  const fields = {};
  if (designation !== undefined) fields.cr04e_nom1 = designation;
  if (type !== undefined) fields.cr04e_type = type;
  unwrap(await Cr04e_divisionusinesService.update(id, fields), 'Mise à jour division');
}

export async function updateOrgCo(id, { designation } = {}) {
  unwrap(
    await Cr04e_organisationcommercialereferentielsService.update(id, { cr04e_designation: designation }),
    'Mise à jour organisation commerciale',
  );
}

export async function updateCanal(id, { designation } = {}) {
  unwrap(
    await Cr04e_canaldedistributionreferentielsService.update(id, { cr04e_designation: designation }),
    'Mise à jour canal de distribution',
  );
}
