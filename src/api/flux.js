import { Cr04e_fluxregistresService } from '@/generated';

// Registre des flux Power Automate (table Dataverse cr04e_fluxregistre).
// Chaque ligne = { cr04e_cle, cr04e_url, cr04e_description }. On résout l'URL
// d'un flux par sa CLÉ au lieu de la coder en dur dans les pages : ajouter /
// modifier un flux se fait désormais dans Dataverse, sans redéploiement.

// Clés attendues dans la colonne cr04e_cle. À garder synchronisées avec les
// lignes saisies dans Dataverse. `description`/`url` y sont libres.
export const FLUX = {
  BECPG: 'BECPG',
  NOUVEAU_CODE: 'NOUVEAU_CODE',
  VALIDATION: 'VALIDATION',
  SAP_SEND: 'SAP_SEND',
  VL_CODE: 'VL_CODE',
  DOCUMENT: 'DOCUMENT',
  VERIF_DE: 'VERIF_DE',
};

// Cache mémoire : la première demande déclenche un seul appel Dataverse dont la
// promesse (Map clé -> url) est mémorisée et réutilisée par tous les appelants.
let registrePromise = null;

// Charge le registre et construit la Map cle -> url (lignes actives uniquement :
// statecode 0). Lève une Error lisible si l'appel échoue.
async function loadRegistre() {
  const result = await Cr04e_fluxregistresService.getAll({ maxPageSize: 5000 });
  const rows = result?.data ?? [];
  const map = new Map();
  for (const row of rows) {
    const cle = (row?.cr04e_cle ?? '').trim();
    const url = (row?.cr04e_url ?? '').trim();
    // statecode: 0 = Active, 1 = Inactive. On ignore les lignes désactivées.
    if (cle && url && row?.statecode !== 1) map.set(cle, url);
  }
  return map;
}

// Renvoie la Map du registre (chargée une seule fois). En cas d'échec, on oublie
// la promesse pour permettre une nouvelle tentative au prochain appel.
function getRegistre() {
  if (!registrePromise) {
    registrePromise = loadRegistre().catch((err) => {
      registrePromise = null;
      throw err;
    });
  }
  return registrePromise;
}

// Vide le cache (tests, ou rechargement forcé après modification du registre).
export function resetFluxRegistre() {
  registrePromise = null;
}

// Résout l'URL d'un flux par sa clé. Lève une Error explicite si la clé est
// absente du registre (ligne manquante ou désactivée dans Dataverse).
export async function getFluxUrl(cle) {
  const map = await getRegistre();
  const url = map.get(cle);
  if (!url) {
    throw new Error(`Flux « ${cle} » introuvable dans le registre (cr04e_fluxregistre).`);
  }
  return url;
}

// POST JSON vers un flux Power Automate (désigné par sa CLÉ), renvoyant la
// Response BRUTE sans lever sur !res.ok : l'appelant inspecte res.status (utile
// quand 400 est une réponse métier, ex. VERIF_DE « déjà existant »). Lève tout de
// même si le registre ne résout pas la clé ou si le réseau échoue. `body` omis =>
// POST sans corps.
export async function postFlowRaw(cle, body) {
  const url = await getFluxUrl(cle);
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Force la culture du run Power Automate en invariant/EN. Sans ça, le
      // navigateur envoie « Accept-Language: fr-FR », et le connecteur SAP
      // OData sérialise les Edm.Decimal (NetWeight) avec la virgule décimale
      // française -> SAP renvoie « ungültiger Wert '6,123' » (400 BadRequest).
      'Accept-Language': 'en-US',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

// POST JSON vers un flux Power Automate, désigné par sa CLÉ (résolue via le
// registre). Lève une Error lisible si la réponse n'est pas OK, sinon renvoie la
// Response (à lire selon le besoin : .text() / .arrayBuffer()). `body` omis =>
// POST sans corps.
export async function postFlow(cle, body) {
  const res = await postFlowRaw(cle, body);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res;
}
