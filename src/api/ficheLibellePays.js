// Table fille new_libellepays (lookup new_IDProjet -> cr04e_projet) : le tableau
// « Libellé par pays » de la FL. Une ligne = { new_langue (code pays), new_libelle }.
// On synchronise ligne par ligne (create/update/delete) à la sauvegarde de la FL.

import { New_libellepaysesService } from '@/generated';

// Diff pur entre les lignes existantes et la saisie courante. Appariement par code
// (langue/pays). Les libellés vides sont ignorés (non créés) et provoquent la
// suppression d'une ligne existante de même code.
// existants: [{ id, code, libelle }] ; saisis: [{ code, libelle }].
export function diffLibelles(existants = [], saisis = []) {
  const byCode = new Map(existants.map((r) => [r.code, r]));
  const effectifs = saisis
    .map((s) => ({ code: (s.code ?? '').trim(), libelle: (s.libelle ?? '').trim() }))
    .filter((s) => s.code && s.libelle);
  const codesSaisis = new Set(effectifs.map((s) => s.code));

  const toCreate = [];
  const toUpdate = [];
  for (const s of effectifs) {
    const ex = byCode.get(s.code);
    if (!ex) toCreate.push({ code: s.code, libelle: s.libelle });
    else if (ex.libelle !== s.libelle) toUpdate.push({ id: ex.id, code: s.code, libelle: s.libelle });
  }
  const toDelete = existants.filter((r) => !codesSaisis.has(r.code));
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

// Lignes libellé par pays d'un projet -> [{ id, code, libelle }].
export async function listForProjet(projetId) {
  if (!projetId) return [];
  const result = await New_libellepaysesService.getAll({
    filter: `_new_idprojet_value eq ${projetId}`,
    maxPageSize: 5000,
  });
  const rows = unwrap(result, 'Liste libellés pays') ?? [];
  return rows.map((r) => ({
    id: r.new_libellepaysid,
    code: r.new_langue ?? '',
    libelle: r.new_libelle ?? '',
  }));
}

// Synchronise les lignes libellé par pays d'un projet avec la saisie courante.
export async function syncForProjet(projetId, saisis = []) {
  if (!projetId) return;
  const existants = await listForProjet(projetId);
  const { toCreate, toUpdate, toDelete } = diffLibelles(existants, saisis);

  for (const c of toCreate) {
    unwrap(
      await New_libellepaysesService.create({
        new_langue: c.code,
        new_libelle: c.libelle,
        'new_IDProjet@odata.bind': `/cr04e_projets(${projetId})`,
      }),
      'Création libellé pays',
    );
  }
  for (const u of toUpdate) {
    unwrap(await New_libellepaysesService.update(u.id, { new_libelle: u.libelle }), 'Maj libellé pays');
  }
  for (const d of toDelete) {
    await New_libellepaysesService.delete(d.id);
  }
}
