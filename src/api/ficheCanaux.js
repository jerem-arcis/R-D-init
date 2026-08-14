// Table fille cr04e_canauxdedistribution (lookup cr04e_IDProjet -> cr04e_projet) :
// les « Canaux de distribution » d'une FL, stockés une ligne par canal (comme les
// libellés par pays et les EAN). Une ligne = { cr04e_code, cr04e_nom }.
// On synchronise à la sauvegarde de la FL (create/delete, pas d'update : un canal
// est une simple étiquette sans valeur associée).

import { Cr04e_canauxdedistributionsService } from '@/generated';
import { listAll as listOptionSet } from '@/api/optionSet';

// Catégorie admin (option-set) qui porte les canaux + leur désignation.
const CANAUX_DROPDOWN_ID = 'canaux_distrib';

// Map code -> désignation, depuis la catégorie « canaux_distrib » de l'Admin.
// Sert à enregistrer la désignation dans cr04e_nom (le code seul est saisi côté FL).
async function designationsByCode() {
  const rows = await listOptionSet();
  const map = new Map();
  for (const r of rows) {
    if (r.dropdownId === CANAUX_DROPDOWN_ID && r.value) map.set(String(r.value), r.designation ?? '');
  }
  return map;
}

// Clé d'appariement d'un canal : insensible aux espaces et à la casse. Un
// appariement TROP STRICT est ce qui fait « repatcher » des canaux inchangés : une
// ligne dont le code lu ne matche pas au caractère près part en suppression ET est
// recréée, alors que rien n'a bougé côté saisie.
const codeKey = (c) => (c ?? '').toString().trim().toLowerCase();

// Diff pur entre canaux existants et saisie courante. La valeur d'un canal (issue
// du multi-select) sert à la fois de code et de libellé (liste courte figée).
// existants: [{ id, code }] ; saisis: [string].
//
// Garanties :
//  - un canal DÉJÀ EN BASE et toujours coché n'est NI supprimé NI recréé (sa ligne
//    et son GUID sont conservés tels quels) — cocher un 3e canal quand il y en a 2
//    ne produit qu'UNE création ;
//  - un canal DÉCOCHÉ voit sa ligne supprimée (sinon elle survit en base et part
//    dans SAP via SAP_SEND_FL) ;
//  - les doublons de code (même canal créé deux fois) sont ramenés à une ligne.
export function diffCanaux(existants = [], saisis = []) {
  // Saisie normalisée, dédoublonnée, dans l'ordre de sélection.
  const voulus = [];
  const voulusKeys = new Set();
  for (const s of saisis || []) {
    const v = (s ?? '').toString().trim();
    if (!v || voulusKeys.has(codeKey(v))) continue;
    voulusKeys.add(codeKey(v));
    voulus.push(v);
  }

  // Lignes conservées telles quelles : celles dont le code est toujours coché
  // (première occurrence seulement). Tout le reste part en suppression.
  const gardes = new Set();
  const toDelete = [];
  for (const r of existants) {
    const k = codeKey(r.code);
    if (voulusKeys.has(k) && !gardes.has(k)) gardes.add(k);
    else toDelete.push(r);
  }

  // On ne crée QUE ce qui n'est pas déjà couvert par une ligne conservée.
  const toCreate = voulus.filter((c) => !gardes.has(codeKey(c)));
  return { toCreate, toDelete };
}

function unwrap(result, action) {
  if (result && result.success === false) {
    const err = result.error || {};
    const status = err.status ? `HTTP ${err.status}` : 'échec';
    throw new Error(`${action} Dataverse - ${status} : ${err.message || 'erreur inconnue'}`);
  }
  return result?.data ?? null;
}

// Canaux de distribution d'un projet -> [{ id, code }].
export async function listForProjet(projetId) {
  if (!projetId) return [];
  const result = await Cr04e_canauxdedistributionsService.getAll({
    filter: `_cr04e_idprojet_value eq ${projetId}`,
    maxPageSize: 5000,
  });
  const rows = unwrap(result, 'Liste canaux de distribution') ?? [];
  return rows.map((r) => ({
    id: r.cr04e_canauxdedistributionid,
    // cr04e_code fait foi. Repli sur cr04e_nom quand le code est VIDE (pas
    // seulement null) : les lignes historiques créées avant la colonne code
    // seraient sinon lues avec un code vide, jamais appariées, donc supprimées
    // puis recréées à chaque sauvegarde.
    code: (r.cr04e_code ?? '').trim() || (r.cr04e_nom ?? '').trim(),
  }));
}

// Valeur exploitée par le multi-select : simple tableau de chaînes (les canaux).
export async function listValuesForProjet(projetId) {
  const rows = await listForProjet(projetId);
  return rows.map((r) => r.code).filter(Boolean);
}

// Synchronise les canaux d'un projet avec la saisie courante (tableau de codes).
// Chaque ligne créée porte le code (cr04e_code), la désignation (cr04e_nom) résolue
// depuis la catégorie admin, et le lien projet (cr04e_IDProjet).
export async function syncForProjet(projetId, saisis = []) {
  if (!projetId) return;
  const existants = await listForProjet(projetId);
  const { toCreate, toDelete } = diffCanaux(existants, saisis);

  const designations = toCreate.length ? await designationsByCode() : null;
  for (const code of toCreate) {
    unwrap(
      await Cr04e_canauxdedistributionsService.create({
        cr04e_code: code,
        cr04e_nom: designations?.get(code) || code,
        'cr04e_IDProjet@odata.bind': `/cr04e_projets(${projetId})`,
      }),
      'Création canal de distribution',
    );
  }
  for (const d of toDelete) {
    // Le service généré renvoie `void` : un échec de suppression ne lève rien et
    // laisserait un canal fantôme (envoyé ensuite à SAP par SAP_SEND_FL). D'où la
    // relecture de contrôle ci-dessous.
    await Cr04e_canauxdedistributionsService.delete(d.id);
  }

  // Contrôle après écriture : la base doit refléter EXACTEMENT la sélection. On
  // échoue bruyamment plutôt que de laisser une ligne décochée survivre en base.
  if (toCreate.length || toDelete.length) {
    const apres = await listValuesForProjet(projetId);
    const attendu = new Set((saisis || []).map(codeKey).filter(Boolean));
    const obtenu = new Set(apres.map(codeKey).filter(Boolean));
    const ecart =
      obtenu.size !== attendu.size || [...attendu].some((c) => !obtenu.has(c));
    if (ecart) {
      throw new Error(
        `Canaux de distribution non synchronisés : la base contient [${apres.join(', ') || '-'}]` +
          ` au lieu de [${(saisis || []).join(', ') || '-'}].`,
      );
    }
  }
}
