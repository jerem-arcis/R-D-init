// Table fille cr04e_unitofmeasure (lookup cr04e_IDprojet -> cr04e_projet) : le
// tableau « Saisie des GTIN / emballages » de la FL. Une ligne = 1 type d'emballage
// réellement renseigné, identifié par cr04e_alternativeunit (code AUoM SAP).
// Synchronisation ligne par ligne (create/update/delete) à la sauvegarde de la FL.

import { Cr04e_unitofmeasuresService } from '@/generated';

// Type d'emballage (clé bloc FL) -> code unité alternative SAP.
// ⚠️ Codes AUoM à confirmer avec le référentiel SAP réel.
export const BLOC_UNIT = {
  uvc_block: 'ST',
  element_block: 'PCE',
  couche_block: 'LAY',
  colis_block: 'CAR',
  palette_block: 'PAL',
};
const UNIT_BLOC = Object.fromEntries(Object.entries(BLOC_UNIT).map(([k, v]) => [v, k]));

// Sous-champ bloc FL -> colonne cr04e_unitofmeasure.
const FIELD_COL = {
  unite: 'cr04e_quantitynumerator',
  poids_brut: 'cr04e_grossweight',
  poids_net: 'cr04e_netweight',
  long: 'cr04e_unitspecificproductlength',
  larg: 'cr04e_unitspecificproductwidth',
  haut: 'cr04e_unitspecificproductheight',
  volume: 'cr04e_materialvolume',
  gtin: 'cr04e_globaltradeitemnumber',
};

const isBlank = (v) => v === null || v === undefined || v === '';

// Un bloc est vide si aucun de ses sous-champs n'est renseigné.
export function isEmptyBloc(bloc = {}) {
  return Object.keys(FIELD_COL).every((f) => isBlank(bloc[f]));
}

// Bloc FL -> ligne cr04e_unitofmeasure (valeurs en chaînes, champs vides omis).
export function blocToRow(blocKey, bloc = {}) {
  const row = { cr04e_alternativeunit: BLOC_UNIT[blocKey] };
  for (const [field, col] of Object.entries(FIELD_COL)) {
    if (!isBlank(bloc[field])) row[col] = String(bloc[field]);
  }
  return row;
}

// Ligne cr04e_unitofmeasure -> { key (clé bloc FL), bloc, id }.
export function rowToBloc(row = {}) {
  const num = (v) => (isBlank(v) ? null : Number(v));
  const bloc = {
    unite: num(row.cr04e_quantitynumerator),
    poids_brut: num(row.cr04e_grossweight),
    poids_net: num(row.cr04e_netweight),
    long: num(row.cr04e_unitspecificproductlength),
    larg: num(row.cr04e_unitspecificproductwidth),
    haut: num(row.cr04e_unitspecificproductheight),
    volume: num(row.cr04e_materialvolume),
    gtin: row.cr04e_globaltradeitemnumber ?? null,
  };
  return { key: UNIT_BLOC[row.cr04e_alternativeunit], bloc, id: row.cr04e_unitofmeasureid };
}

function rowDiffers(existing, row) {
  return Object.keys(row).some((k) => (existing[k] ?? '') !== (row[k] ?? ''));
}

// Diff pur entre lignes existantes et blocs saisis. Appariement par code unité.
// existants: [row cr04e_unitofmeasure] ; blocs: { uvc_block, element_block, ... }.
export function diffEmballages(existants = [], blocs = {}) {
  const desired = [];
  for (const [key, unit] of Object.entries(BLOC_UNIT)) {
    const bloc = blocs[key];
    if (bloc && !isEmptyBloc(bloc)) desired.push({ unit, row: blocToRow(key, bloc) });
  }
  const byUnit = new Map(existants.map((r) => [r.cr04e_alternativeunit, r]));
  const desiredUnits = new Set(desired.map((d) => d.unit));

  const toCreate = [];
  const toUpdate = [];
  for (const d of desired) {
    const ex = byUnit.get(d.unit);
    if (!ex) toCreate.push(d.row);
    else if (rowDiffers(ex, d.row)) toUpdate.push({ id: ex.cr04e_unitofmeasureid, row: d.row });
  }
  const toDelete = existants.filter((r) => !desiredUnits.has(r.cr04e_alternativeunit));
  return { toCreate, toUpdate, toDelete };
}

function unwrap(result, action) {
  if (result && result.success === false) {
    const err = result.error || {};
    const status = err.status ? `HTTP ${err.status}` : 'échec';
    throw new Error(`${action} Dataverse — ${status} : ${err.message || 'erreur inconnue'}`);
  }
  return result?.data ?? null;
}

// Lignes emballage brutes d'un projet.
export async function listForProjet(projetId) {
  if (!projetId) return [];
  const result = await Cr04e_unitofmeasuresService.getAll({
    filter: `_cr04e_idprojet_value eq ${projetId}`,
    maxPageSize: 5000,
  });
  return unwrap(result, 'Liste emballages') ?? [];
}

// Lignes -> { uvc_block, element_block, couche_block, colis_block, palette_block }.
export function blocsFromRows(rows = []) {
  const blocs = {};
  for (const row of rows) {
    const { key, bloc } = rowToBloc(row);
    if (key) blocs[key] = bloc;
  }
  return blocs;
}

// Synchronise les lignes emballage d'un projet avec les blocs saisis.
export async function syncForProjet(projetId, blocs = {}) {
  if (!projetId) return;
  const existants = await listForProjet(projetId);
  const { toCreate, toUpdate, toDelete } = diffEmballages(existants, blocs);

  for (const row of toCreate) {
    unwrap(
      await Cr04e_unitofmeasuresService.create({
        ...row,
        'cr04e_IDprojet@odata.bind': `/cr04e_projets(${projetId})`,
      }),
      'Création emballage',
    );
  }
  for (const u of toUpdate) {
    unwrap(await Cr04e_unitofmeasuresService.update(u.id, u.row), 'Maj emballage');
  }
  for (const d of toDelete) {
    await Cr04e_unitofmeasuresService.delete(d.cr04e_unitofmeasureid);
  }
}
