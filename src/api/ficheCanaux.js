// Table fille cr04e_canauxdedistribution (lookup cr04e_IDProjet -> cr04e_projet) :
// les « Canaux de distribution » d'une FL, stockés une ligne par canal (comme les
// libellés par pays et les EAN). Une ligne = { cr04e_code, cr04e_nom }.
// On synchronise à la sauvegarde de la FL (create/delete, pas d'update : un canal
// est une simple étiquette sans valeur associée).

import { Cr04e_canauxdedistributionsService } from '@/generated';

// Diff pur entre canaux existants et saisie courante. La valeur d'un canal (issue
// du multi-select) sert à la fois de code et de libellé (liste courte figée).
// existants: [{ id, code }] ; saisis: [string].
export function diffCanaux(existants = [], saisis = []) {
  const voulus = [...new Set((saisis || []).map((s) => (s ?? '').toString().trim()).filter(Boolean))];
  const voulusSet = new Set(voulus);
  const existantsCodes = new Set(existants.map((r) => r.code));

  const toCreate = voulus.filter((c) => !existantsCodes.has(c));
  const toDelete = existants.filter((r) => !voulusSet.has(r.code));
  return { toCreate, toDelete };
}

function unwrap(result, action) {
  if (result && result.success === false) {
    const err = result.error || {};
    const status = err.status ? `HTTP ${err.status}` : 'échec';
    throw new Error(`${action} Dataverse - ${status} : ${err.message || 'erreur inconnue'}`);
  }
  return result?.data ?? null;
}

// Canaux de distribution d'un projet -> [{ id, code }].
export async function listForProjet(projetId) {
  if (!projetId) return [];
  const result = await Cr04e_canauxdedistributionsService.getAll({
    filter: `_cr04e_idprojet_value eq ${projetId}`,
    maxPageSize: 5000,
  });
  const rows = unwrap(result, 'Liste canaux de distribution') ?? [];
  return rows.map((r) => ({
    id: r.cr04e_canauxdedistributionid,
    code: r.cr04e_code ?? r.cr04e_nom ?? '',
  }));
}

// Valeur exploitée par le multi-select : simple tableau de chaînes (les canaux).
export async function listValuesForProjet(projetId) {
  const rows = await listForProjet(projetId);
  return rows.map((r) => r.code).filter(Boolean);
}

// Synchronise les canaux d'un projet avec la saisie courante (tableau de chaînes).
export async function syncForProjet(projetId, saisis = []) {
  if (!projetId) return;
  const existants = await listForProjet(projetId);
  const { toCreate, toDelete } = diffCanaux(existants, saisis);

  for (const c of toCreate) {
    unwrap(
      await Cr04e_canauxdedistributionsService.create({
        cr04e_code: c,
        cr04e_nom: c,
        'cr04e_IDProjet@odata.bind': `/cr04e_projets(${projetId})`,
      }),
      'Création canal de distribution',
    );
  }
  for (const d of toDelete) {
    await Cr04e_canauxdedistributionsService.delete(d.id);
  }
}
