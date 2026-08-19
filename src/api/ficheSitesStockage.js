// Sites de stockage d'une FL, stockés dans la table cr04e_divisionprojets — la
// MÊME table que les lignes « division usine » (type PROD). Un site de stockage =
// une ligne { cr04e_division (code, ex. « 2820 »), cr04e_type = 'STOCK' } rattachée
// au projet par le lookup cr04e_Projet. Le flux Power Automate boucle ensuite sur
// ces lignes STOCK. On synchronise à la sauvegarde de la FL (create/delete : un
// site est une simple étiquette code, sans valeur associée).
//
// ⚠️ Sûreté : list ET sync ne regardent QUE les lignes cr04e_type = 'STOCK'. Les
// lignes PROD (division usine du projet) ne sont jamais lues ni supprimées ici.

import { Cr04e_divisionprojetsService } from '@/generated';

// Type porté par une ligne « site de stockage » (par opposition à 'PROD', la
// division usine écrite à la création de la DE, cf. createDivisionProjet).
const TYPE_STOCK = 'STOCK';

// Clé d'appariement d'un code : insensible aux espaces et à la casse. Un
// appariement trop strict ferait « repatcher » des sites inchangés : une ligne
// dont le code lu ne matche pas au caractère près partirait en suppression puis
// serait recréée, alors que rien n'a bougé côté saisie.
const codeKey = (c) => (c ?? '').toString().trim().toLowerCase();

// Diff pur entre les sites existants (lignes STOCK en base) et la saisie courante.
// La valeur d'un site (issue du multi-select) est le code division (ex. « 2820 »),
// qui sert à la fois de code d'appariement et de valeur écrite dans cr04e_division.
// existants: [{ id, code }] ; saisis: [string].
//
// Garanties (identiques aux canaux) :
//  - un site DÉJÀ EN BASE et toujours coché n'est NI supprimé NI recréé ;
//  - un site DÉCOCHÉ voit sa ligne supprimée (sinon elle survit et part au flux) ;
//  - les doublons de code sont ramenés à une seule ligne.
export function diffSitesStockage(existants = [], saisis = []) {
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

// Sites de stockage d'un projet (lignes STOCK uniquement) -> [{ id, code }].
export async function listForProjet(projetId) {
  if (!projetId) return [];
  const result = await Cr04e_divisionprojetsService.getAll({
    // Filtre STRICT : le projet ET le type STOCK. Sans le filtre de type, on lirait
    // aussi la ligne PROD (division usine) et on la supprimerait au premier décochage.
    filter: `_cr04e_projet_value eq ${projetId} and cr04e_type eq '${TYPE_STOCK}'`,
    maxPageSize: 5000,
  });
  const rows = unwrap(result, 'Liste sites de stockage') ?? [];
  return rows.map((r) => ({
    id: r.cr04e_divisionprojetid,
    code: (r.cr04e_division ?? '').trim(),
  }));
}

// Valeur exploitée par le multi-select : simple tableau de codes.
export async function listValuesForProjet(projetId) {
  const rows = await listForProjet(projetId);
  return rows.map((r) => r.code).filter(Boolean);
}

// Synchronise les sites de stockage d'un projet avec la saisie courante (tableau
// de codes division). Chaque ligne créée porte le code (cr04e_division), le type
// STOCK (cr04e_type) et le lien projet (cr04e_Projet).
export async function syncForProjet(projetId, saisis = []) {
  if (!projetId) return;
  const existants = await listForProjet(projetId);
  const { toCreate, toDelete } = diffSitesStockage(existants, saisis);

  for (const code of toCreate) {
    unwrap(
      await Cr04e_divisionprojetsService.create({
        cr04e_division: code,
        cr04e_type: TYPE_STOCK,
        'cr04e_Projet@odata.bind': `/cr04e_projets(${projetId})`,
      }),
      'Création site de stockage',
    );
  }
  for (const d of toDelete) {
    // Le service généré renvoie `void` : un échec de suppression ne lève rien et
    // laisserait un site fantôme (parcouru ensuite par le flux). D'où la relecture
    // de contrôle ci-dessous.
    await Cr04e_divisionprojetsService.delete(d.id);
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
        `Sites de stockage non synchronisés : la base contient [${apres.join(', ') || '-'}]` +
          ` au lieu de [${(saisis || []).join(', ') || '-'}].`,
      );
    }
  }
}
