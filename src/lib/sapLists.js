import { useQueries } from '@tanstack/react-query';
import { SAP_LIST_KEYS, listSapTable } from '@/api/sapLists';

// Renvoie { divisions: [{value,designation}], classes_valorisation: [...], ... }
// — même forme que useAdminOptions, directement consommable par buildOptions.
// Une requête React Query par table : une erreur sur une liste n'affecte pas
// les autres.
export function useSapOptions() {
  const results = useQueries({
    queries: SAP_LIST_KEYS.map((key) => ({
      queryKey: ['sap-list', key],
      queryFn: () => listSapTable(key),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const grouped = Object.fromEntries(SAP_LIST_KEYS.map((k) => [k, []]));
  SAP_LIST_KEYS.forEach((key, i) => {
    grouped[key] = results[i]?.data ?? [];
  });
  return grouped;
}
