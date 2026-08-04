import { Cr04e_gestiondeserreursesService } from '@/generated';

// Nom du champ Dataverse portant le code chapeau côté journal d'erreurs.
// ⚠️ Les fichiers `src/generated` ne l'exposent pas encore (source récemment
// ajoutée -> régénération Power Apps à relancer). On lit donc la ligne brute avec
// ce nom présumé (même convention que cr04e_projet.cr04e_codechapeau) et un repli
// tolérant : si le champ est absent, le code chapeau reste vide (jointure projet
// silencieusement ignorée, colonne « code projet » à « — »). Un seul endroit à
// corriger le jour où le nom réel diffère.
export const ERREUR_CODECHAPEAU_FIELD = 'cr04e_codechapeau';

// Le client Power Apps NE LÈVE PAS en cas d'échec : il résout un IOperationResult
// { success:false, error }. On transforme l'échec en exception explicite (même garde
// que @/api/projet).
function unwrap(result, action) {
  if (result && result.success === false) {
    const err = result.error || {};
    const status = err.status ? `HTTP ${err.status}` : 'échec';
    const reqId = err.requestId ? ` [requestId ${err.requestId}]` : '';
    const e = new Error(
      `${action} Dataverse — ${status} : ${err.message || 'erreur inconnue'}${reqId}`,
    );
    e.status = err.status;
    e.requestId = err.requestId;
    throw e;
  }
  return result?.data ?? null;
}

// Mappe une ligne Dataverse `cr04e_gestiondeserreurs` vers la forme normalisée
// consommée par la logique pure (@/lib/erreursSap). Le parsing du paramètre envoyé
// et l'agrégation restent dans la lib.
const toRow = (r) => ({
  id: r.cr04e_gestiondeserreursid,
  reference: r.cr04e_referenceproduit ?? '',
  vue: r.cr04e_vue ?? '',
  codeErreurSap: r.cr04e_codeerreursap ?? '',
  messageErreur: r.cr04e_messageerreur ?? '',
  statutTraitement: r.cr04e_statuttraitement ?? '',
  statutCode: r.cr04e_statutcode ?? '',
  entite: r.cr04e_nomdelentite ?? '',
  parametre: r.cr04e_parametreenvoye ?? '',
  createdOn: r.createdon ?? null,
  createdBy: r.createdbyname ?? '',
  codeChapeau: r[ERREUR_CODECHAPEAU_FIELD] ?? '',
});

// Alias d'export pour les tests éventuels (la fonction reste interne par ailleurs).
export const rowShapeForTest = toRow;

// Liste toutes les lignes d'erreurs SAP (Dataverse, paginé). Renvoie des lignes
// normalisées, triées de la plus récente à la plus ancienne.
export async function listErreurs() {
  const all = [];
  let skipToken;
  let guard = 0;
  do {
    const result = await Cr04e_gestiondeserreursesService.getAll({
      maxPageSize: 5000,
      ...(skipToken ? { skipToken } : {}),
    });
    all.push(...(unwrap(result, 'Liste') ?? []));
    skipToken = result?.skipToken;
    guard += 1;
  } while (skipToken && guard < 100);

  return all
    .map(toRow)
    .sort((a, b) => (b.createdOn || '').localeCompare(a.createdOn || ''));
}
