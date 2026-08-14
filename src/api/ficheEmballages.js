// Table fille cr04e_unitofmeasure (lookup cr04e_IDprojet -> cr04e_projet) : les
// unités de mesure SAP (A_ProductUnitsOfMeasure) de l'article. Elle contient les
// 8 lignes GÉNÉRÉES (U, UE, ZCO, CAR, PAL + PCB, ZPP, ZUG) — voir computeEmballagesSap.
// La FL saisit 5 blocs (uvc/element/couche/colis/palette) ; on génère les 8 lignes à
// l'écriture, et on reconstruit les 5 blocs à la relecture (option B).
// Synchronisation ligne par ligne (create/update/delete) à la sauvegarde de la FL.

import { Cr04e_unitofmeasuresService } from '@/generated';
import { computeEmballagesSap } from '@/lib/emballagesSap';

// Unité alternative SAP « primaire » de chaque bloc FL (pour la relecture).
// PCB/ZPP/ZUG sont dérivées et ne correspondent à aucun bloc.
export const BLOC_UNIT = {
  uvc_block: 'U',
  element_block: 'UE',
  couche_block: 'ZCO',
  colis_block: 'CAR',
  palette_block: 'PAL',
};

const isBlank = (v) => v === null || v === undefined || v === '';
const num = (v) => (isBlank(v) ? null : Number(v));
// Dimension SAP (cm) -> saisie FL (mm) : ×10.
const mm = (v) => (isBlank(v) ? null : Number(v) * 10);
// Volume CDM (dm³) -> saisie FL (m³) : ÷1000.
const m3 = (v) => (isBlank(v) ? null : Number(v) / 1000);

// Un bloc est vide si aucun de ses sous-champs n'est renseigné.
export function isEmptyBloc(bloc = {}) {
  return ['unite', 'poids_brut', 'poids_net', 'long', 'larg', 'haut', 'volume', 'gtin']
    .every((f) => isBlank(bloc[f]));
}

function rowDiffers(existing, row) {
  return Object.keys(row).some((k) => (existing[k] ?? '') !== (row[k] ?? ''));
}

// Diff pur entre lignes existantes et lignes générées (par computeEmballagesSap).
// Appariement par code unité (cr04e_alternativeunit).
export function diffEmballages(existants = [], blocs = {}) {
  const desired = computeEmballagesSap(blocs);
  const byUnit = new Map(existants.map((r) => [r.cr04e_alternativeunit, r]));
  const desiredUnits = new Set(desired.map((r) => r.cr04e_alternativeunit));

  const toCreate = [];
  const toUpdate = [];
  for (const row of desired) {
    const ex = byUnit.get(row.cr04e_alternativeunit);
    if (!ex) toCreate.push(row);
    else if (rowDiffers(ex, row)) toUpdate.push({ id: ex.cr04e_unitofmeasureid, row });
  }
  const toDelete = existants.filter((r) => !desiredUnits.has(r.cr04e_alternativeunit));
  return { toCreate, toUpdate, toDelete };
}

// Lignes générées -> { uvc_block, element_block, couche_block, colis_block, palette_block }.
// Le compteur `unite` se lit au numérateur (UE) ou au dénominateur (CAR/ZCO/PAL) ;
// le volume UVC (L) provient de ZUG, les volumes colis/couche/palette (m³) du CDM.
export function blocsFromRows(rows = []) {
  const by = Object.fromEntries((rows || []).map((r) => [r.cr04e_alternativeunit, r]));
  const blocs = {};
  const fill = (r, b) => {
    b.poids_brut = num(r.cr04e_grossweight);
    b.poids_net = num(r.cr04e_netweight);
    b.long = mm(r.cr04e_unitspecificproductlength);
    b.larg = mm(r.cr04e_unitspecificproductwidth);
    b.haut = mm(r.cr04e_unitspecificproductheight);
    b.gtin = r.cr04e_globaltradeitemnumber ?? null;
  };

  if (by.U) {
    const r = by.U;
    const b = { unite: num(r.cr04e_quantitynumerator) };
    fill(r, b);
    b.volume = by.ZUG ? num(by.ZUG.cr04e_materialvolume) : null; // volume UVC saisi (L)
    blocs.uvc_block = b;
  }
  if (by.UE) {
    blocs.element_block = { unite: num(by.UE.cr04e_quantitynumerator) };
  }
  for (const [unit, key] of [['CAR', 'colis_block'], ['ZCO', 'couche_block'], ['PAL', 'palette_block']]) {
    const r = by[unit];
    if (!r) continue;
    const b = { unite: num(r.cr04e_quantitydenominator) };
    fill(r, b);
    b.volume = m3(r.cr04e_materialvolume);
    blocs[key] = b;
  }
  return blocs;
}

function unwrap(result, action) {
  if (result && result.success === false) {
    const err = result.error || {};
    const status = err.status ? `HTTP ${err.status}` : 'échec';
    throw new Error(`${action} Dataverse - ${status} : ${err.message || 'erreur inconnue'}`);
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

// Synchronise les lignes emballage d'un projet avec les blocs saisis (génère les 8 lignes).
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
