import { Cr04e_optionsetcodeappsesService } from '@/generated';

const toLogical = (row) => ({
  id: row.cr04e_optionsetcodeappsid,
  dropdownId: row.cr04e_id_dd ?? '',
  value: row.cr04e_valeur_dd ?? '',
});

export async function listAll() {
  const result = await Cr04e_optionsetcodeappsesService.getAll();
  const rows = result?.data ?? [];
  return rows.map(toLogical);
}

export async function create(dropdownId, value) {
  const result = await Cr04e_optionsetcodeappsesService.create({
    cr04e_id_dd: dropdownId,
    cr04e_valeur_dd: value,
  });
  return toLogical(result?.data ?? {});
}

export async function update(id, value) {
  await Cr04e_optionsetcodeappsesService.update(id, {
    cr04e_valeur_dd: value,
  });
}

export async function remove(id) {
  await Cr04e_optionsetcodeappsesService.delete(id);
}
