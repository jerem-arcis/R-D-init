// File d'attente par clé : au plus UNE tâche à la fois pour une même clé.
//
// Pourquoi : la sauvegarde d'une FL synchronise ses tables filles en
// « lire l'existant -> diff -> create/delete ». Deux sauvegardes rapprochées
// (chaque clic du multi-select des canaux en déclenche une) lisent alors TOUTES
// LES DEUX l'état d'AVANT écriture. Un canal coché puis décoché aussitôt donne :
//   save#1 : lit [] -> planifie create(A)
//   save#2 : lit [] -> rien à supprimer (le create de #1 n'est pas encore commité)
//   -> create(A) atterrit APRÈS : la ligne survit en base, case décochée. Le flux
//      SAP_SEND_FL relit ce canal fantôme et fausse la création d'article.
// En sérialisant, save#2 lit forcément [A] et supprime la ligne.

const queues = new Map();

// Enchaîne `task` derrière les tâches déjà en attente pour `key` et renvoie sa
// promesse (rejet compris : l'échec est propagé à l'appelant, pas à la file, qui
// continue avec la tâche suivante).
export function withQueue(key, task) {
  const prev = queues.get(key) ?? Promise.resolve();
  const result = prev.then(task, task);
  // Maillon « neutralisé » : la file ne doit jamais se casser sur un échec.
  const tail = result.then(
    () => {},
    () => {},
  );
  queues.set(key, tail);
  // Libère l'entrée quand plus personne ne s'est enfilé derrière.
  tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return result;
}

// Vide les files (tests).
export function resetQueues() {
  queues.clear();
}
