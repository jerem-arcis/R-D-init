import {
  Cr04e_divisionusinesService,
  Cr04e_classedevalorisationsService,
  Cr04e_groupearticledivisionsService,
  Cr04e_groupedefraisgenerauxesService,
  Cr04e_hierarchieproduitfamillesService,
} from '@/generated';

// Référentiels alimentés par SAP : chaque liste déroulante est désormais une
// table Dataverse dédiée (et non plus une clé de la table option-set).
// key -> { service, valueField (code affiché), designationField }
export const SAP_LIST_CONFIG = {
  divisions: {
    service: Cr04e_divisionusinesService,
    valueField: 'cr04e_division',
    designationField: 'cr04e_nom1',
  },
  classes_valorisation: {
    service: Cr04e_classedevalorisationsService,
    valueField: 'cr04e_classevalorisation',
    designationField: 'cr04e_designation',
  },
  groupes_article: {
    service: Cr04e_groupearticledivisionsService,
    valueField: 'cr04e_groupedarticles',
    designationField: 'cr04e_designgroupemarch',
  },
  groupes_frais_generaux: {
    service: Cr04e_groupedefraisgenerauxesService,
    valueField: 'cr04e_groupedefraisgen',
    designationField: 'cr04e_domainevalorisation',
  },
  familles_produit: {
    service: Cr04e_hierarchieproduitfamillesService,
    valueField: 'cr04e_hierarchieproduits',
    designationField: 'cr04e_description',
  },
};

export const SAP_LIST_KEYS = Object.keys(SAP_LIST_CONFIG);

// Lit une table SAP en entier (Dataverse pagine : on suit le skipToken), normalise
// chaque ligne en { value, designation }, ignore les lignes sans code, et trie par
// code croissant. Renvoie [] si la table est encore vide (avant import).
export async function listSapTable(key) {
  const cfg = SAP_LIST_CONFIG[key];
  if (!cfg) throw new Error(`Liste SAP inconnue : ${key}`);
  const { service, valueField, designationField } = cfg;

  const all = [];
  let skipToken;
  let guard = 0;
  do {
    const result = await service.getAll({
      maxPageSize: 5000,
      ...(skipToken ? { skipToken } : {}),
    });
    const rows = result?.data ?? [];
    for (const row of rows) {
      const value = row[valueField];
      if (value == null || value === '') continue;
      all.push({ value: String(value), designation: row[designationField] ?? '' });
    }
    skipToken = result?.skipToken;
    guard += 1;
  } while (skipToken && guard < 100);

  all.sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
  return all;
}
