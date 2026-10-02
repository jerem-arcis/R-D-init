import { useQuery } from '@tanstack/react-query';
import { listAll } from '@/api/optionSet';

// Listes réellement stockées dans la table option-set (cr04e_optionsetcodeapps).
// Les référentiels alimentés par SAP (divisions, groupes_article,
// classes_valorisation, familles_produit, centres_profit) ont leur propre
// table Dataverse et sont gérés via @/lib/sapLists — voir SAP_LIST_KEYS.
// (Le groupe de frais généraux n'en fait plus partie : c'est un champ texte
// simple FG / NEGO, plus de table annexe.)
export const DROPDOWN_KEYS = [
  'reseaux',
  'groupes_autorisation',
  'axes_strategiques',
  'secteurs_activite',
  'categories_vif',
  'types_logistique',
  'services_demandeur',
  // Ancienne liste des canaux (FL) : remplacée par le référentiel Canaux de
  // distribution (cf. lib/perimetre.js). Encore LUE comme repli tant que le
  // référentiel est vide, mais plus éditable dans l'Admin (ADMIN_LIST_KEYS).
  'canaux_distrib',
];

// Listes option-set éditables dans l'onglet Admin.
export const ADMIN_LIST_KEYS = DROPDOWN_KEYS.filter((k) => k !== 'canaux_distrib');

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

// Variante qui conserve la désignation : par clé, un tableau de
// { value, designation }. Sert à alimenter les SearchableSelect (affichage
// « code — désignation » et recherche sur les deux).
export function useAdminOptions() {
  const { data = [] } = useOptionSetRows();
  const grouped = emptyByKey();
  for (const row of data) {
    if (row.dropdownId && grouped[row.dropdownId]) {
      grouped[row.dropdownId].push({ value: row.value, designation: row.designation ?? '' });
    }
  }
  return grouped;
}

// Construit les options d'un SearchableSelect à partir des lignes
// { value, designation } d'une liste. `current` (le code déjà sélectionné) est
// ajouté s'il n'est pas présent, pour ne jamais perdre une valeur existante.
export function buildOptions(rows = [], current) {
  const options = rows.map(({ value, designation }) => ({
    value,
    label: designation ? `${value} - ${designation}` : value,
    keywords: designation ? `${value} ${designation}` : value,
  }));
  if (current && !options.some((o) => o.value === current)) {
    options.push({ value: current, label: current, keywords: current });
  }
  return options;
}
