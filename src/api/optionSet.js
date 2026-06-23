import { Cr04e_optionsetcodeappsesService } from '@/generated';

const toLogical = (row) => ({
  id: row.cr04e_optionsetcodeappsid,
  dropdownId: row.cr04e_id_dd ?? '',
  value: row.cr04e_valeur_dd ?? '',
  designation: row.cr04e_designation ?? '',
});

export async function listAll() {
  // Dataverse pagine les résultats : on suit le skipToken pour tout récupérer
  // (sinon seule la 1ère page — ~300 lignes — remonte).
  const all = [];
  let skipToken;
  let guard = 0;
  do {
    const result = await Cr04e_optionsetcodeappsesService.getAll({
      maxPageSize: 5000,
      ...(skipToken ? { skipToken } : {}),
    });
    const rows = result?.data ?? [];
    all.push(...rows.map(toLogical));
    skipToken = result?.skipToken;
    guard += 1;
  } while (skipToken && guard < 100);
  return all;
}

export async function create(dropdownId, value, designation = '') {
  const result = await Cr04e_optionsetcodeappsesService.create({
    cr04e_id_dd: dropdownId,
    cr04e_valeur_dd: value,
    cr04e_designation: designation,
  });
  return toLogical(result?.data ?? {});
}

export async function update(id, value, designation) {
  const changedFields = { cr04e_valeur_dd: value };
  if (designation !== undefined) changedFields.cr04e_designation = designation;
  await Cr04e_optionsetcodeappsesService.update(id, changedFields);
}

export async function remove(id) {
  if (!id) throw new Error('Identifiant de ligne manquant (cr04e_optionsetcodeappsid vide).');
  await Cr04e_optionsetcodeappsesService.delete(id);
}
