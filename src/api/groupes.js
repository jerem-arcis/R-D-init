// Appartenance de l'utilisateur connecté aux groupes Entra référencés par la table
// société. On passe par ListGroupMembers (connecteur Office 365 Groups) : il
// fonctionne pour les groupes de sécurité comme pour les groupes Microsoft 365,
// contrairement aux opérations « mes groupes » du connecteur.
// Limite : seuls les membres DIRECTS sont listés (pas les groupes imbriqués), et
// au plus 999 membres par groupe.

import { Office365GroupsService } from '@/generated';

const low = (v) => String(v ?? '').trim().toLowerCase();

// user = { objectId, upn } (contexte Power Apps). Correspondance sur l'identifiant
// Entra, à défaut sur l'UPN ou l'e-mail.
export function estMembre(membres = [], user = {}) {
  const id = low(user.objectId);
  const upn = low(user.upn);
  if (!id && !upn) return false;
  return membres.some((m) =>
    (id && low(m.id) === id) ||
    (upn && (low(m.userPrincipalName) === upn || low(m.mail) === upn)));
}

async function listerMembres(groupId) {
  const result = await Office365GroupsService.ListGroupMembers(groupId, 999);
  if (result && result.success === false) {
    throw new Error(result.error?.message || 'groupe introuvable ou connecteur en échec');
  }
  return result?.data?.value ?? [];
}

// Renvoie les GUID (parmi groupIds) dont l'utilisateur est membre. Un groupe qui ne
// se résout pas (supprimé, droits, connecteur) compte comme « non membre » et est
// remonté dans `erreurs` : une erreur n'ouvre JAMAIS l'accès.
export async function resoudreMesGroupes(groupIds = [], user = {}, lister = listerMembres) {
  const results = await Promise.allSettled(groupIds.map((id) => lister(id)));
  const groupes = [];
  const erreurs = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') erreurs.push(groupIds[i]);
    else if (estMembre(r.value, user)) groupes.push(groupIds[i]);
  });
  return { groupes, erreurs };
}
