import { useQuery } from '@tanstack/react-query';
import { listAll } from '@/api/optionSet';

export const DROPDOWN_KEYS = [
  'reseaux',
  'divisions',
  'groupes_article',
  'classes_valorisation',
  'centres_profit',
  'groupes_autorisation',
  'groupes_frais_generaux',
  'axes_strategiques',
  'familles_produit',
  'secteurs_activite',
  'categories_vif',
  'types_logistique',
  'services_demandeur',
];

export const OPTIONSET_QUERY_KEY = ['optionset'];

const emptyByKey = () =>
  Object.fromEntries(DROPDOWN_KEYS.map((k) => [k, []]));

export function useOptionSetRows() {
  return useQuery({
    queryKey: OPTIONSET_QUERY_KEY,
    queryFn: listAll,
  });
}

export function useAdminLists() {
  const { data = [] } = useOptionSetRows();
  const grouped = emptyByKey();
  for (const row of data) {
    if (row.dropdownId && grouped[row.dropdownId]) {
      grouped[row.dropdownId].push(row.value);
    }
  }
  return grouped;
}
