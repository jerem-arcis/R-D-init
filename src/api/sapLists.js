import {
  Cr04e_divisionusinesService,
  Cr04e_classedevalorisationsService,
  Cr04e_groupearticledivisionsService,
  Cr04e_groupedefraisgenerauxesService,
  Cr04e_hierarchieproduitfamillesService,
  Cr04e_centredeprofitcepctsService,
} from '@/generated';

// Référentiels alimentés par SAP : chaque liste déroulante est désormais une
// table Dataverse dédiée (et non plus une clé de la table option-set).
// key -> { service, valueField (code affiché), designationField, idField (PK),
//          entitySet (collection OData, pour les @odata.bind des lookups) }
export const SAP_LIST_CONFIG = {
  divisions: {
    service: Cr04e_divisionusinesService,
    valueField: 'cr04e_division',
    designationField: 'cr04e_nom1',
    idField: 'cr04e_divisionusineid',
    entitySet: 'cr04e_divisionusines',
  },
  classes_valorisation: {
    service: Cr04e_classedevalorisationsService,
    valueField: 'cr04e_classevalorisation',
    designationField: 'cr04e_designation',
    idField: 'cr04e_classedevalorisationid',
    entitySet: 'cr04e_classedevalorisations',
  },
  groupes_article: {
    service: Cr04e_groupearticledivisionsService,
    valueField: 'cr04e_groupedarticles',
    designationField: 'cr04e_designgroupemarch',
    idField: 'cr04e_groupearticledivisionid',
    entitySet: 'cr04e_groupearticledivisions',
  },
  groupes_frais_generaux: {
    service: Cr04e_groupedefraisgenerauxesService,
    valueField: 'cr04e_groupedefraisgen',
    designationField: 'cr04e_domainevalorisation',
    idField: 'cr04e_groupedefraisgenerauxid',
    entitySet: 'cr04e_groupedefraisgenerauxes',
  },
  familles_produit: {
    service: Cr04e_hierarchieproduitfamillesService,
    valueField: 'cr04e_hierarchieproduits',
    designationField: 'cr04e_description',
    idField: 'cr04e_hierarchieproduitfamilleid',
    entitySet: 'cr04e_hierarchieproduitfamilles',
  },
  // Centre de profit (table CEPCT, alimentée SAP). Plusieurs lignes par centre
  // (une par périmètre analytique) -> dédupliqué par code dans listSapTable.
  centres_profit: {
    service: Cr04e_centredeprofitcepctsService,
    valueField: 'cr04e_centredeprofit',
    designationField: 'cr04e_designation',
    idField: 'cr04e_centredeprofitcepctid',
    entitySet: 'cr04e_centredeprofitcepcts',
  },
};

export const SAP_LIST_KEYS = Object.keys(SAP_LIST_CONFIG);

// Lit une table SAP en entier (Dataverse pagine : on suit le skipToken), normalise
// chaque ligne en { value, designation }, ignore les lignes sans code, et trie par
// code croissant. Renvoie [] si la table est encore vide (avant import).
export async function listSapTable(key) {
  const cfg = SAP_LIST_CONFIG[key];
  if (!cfg) throw new Error(`Liste SAP inconnue : ${key}`);
  const { service, valueField, designationField, idField } = cfg;

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
      all.push({
        id: row[idField] ?? '',
        value: String(value),
        designation: row[designationField] ?? '',
      });
    }
    skipToken = result?.skipToken;
    guard += 1;
  } while (skipToken && guard < 100);

  // Déduplication par code (CEPCT a plusieurs lignes par centre de profit) :
  // on conserve la 1ère occurrence.
  const seen = new Set();
  const deduped = all.filter((r) => (seen.has(r.value) ? false : seen.add(r.value)));
  deduped.sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
  return deduped;
}

// Construit la valeur d'un lookup @odata.bind vers une table SAP à partir du code
// sélectionné et des lignes déjà chargées ({ id, value }). Renvoie null si le code
// est vide ou introuvable (lookup laissé vide).
export function lookupBind(key, code, rows = []) {
  const cfg = SAP_LIST_CONFIG[key];
  if (!cfg || !code) return null;
  const match = rows.find((r) => r.value === code);
  if (!match || !match.id) return null;
  return `/${cfg.entitySet}(${match.id})`;
}

// Rétro-résolution : à partir du GUID d'un lookup (_..._value renvoyé par Dataverse)
// et des lignes déjà chargées ({ id, value }), retrouve le code affiché. Sert à
// réhydrater un formulaire (DE/DS) ouvert depuis Dataverse. '' si introuvable.
export function codeFromLookupValue(key, guid, rows = []) {
  if (!guid) return '';
  const match = rows.find((r) => r.id === guid);
  return match ? String(match.value) : '';
}
