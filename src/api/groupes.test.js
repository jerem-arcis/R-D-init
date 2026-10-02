import { describe, it, expect } from 'vitest';
import { estMembre, resoudreMesGroupes } from './groupes';

const membres = [
  { id: 'AAA-1', userPrincipalName: 'Alice@onore.fr', mail: 'alice.martin@onore.fr' },
  { id: 'bbb-2', userPrincipalName: 'bob@onore.fr' },
];

describe('estMembre', () => {
  it('reconnaît par objectId, UPN ou e-mail, sans tenir compte de la casse', () => {
    expect(estMembre(membres, { objectId: 'aaa-1' })).toBe(true);
    expect(estMembre(membres, { upn: 'BOB@onore.fr' })).toBe(true);
    expect(estMembre(membres, { upn: 'alice.martin@onore.fr' })).toBe(true);
    expect(estMembre(membres, { objectId: 'zzz', upn: 'eve@onore.fr' })).toBe(false);
  });
  it('utilisateur inconnu : jamais membre, même d\'un membre sans identifiant', () => {
    expect(estMembre([{ id: '', userPrincipalName: '' }], {})).toBe(false);
    expect(estMembre(membres, {})).toBe(false);
  });
});

describe('resoudreMesGroupes', () => {
  it('ne garde que mes groupes ; un groupe en échec est non-membre et signalé', async () => {
    const lister = async (id) => {
      if (id === 'g-ko') throw new Error('404');
      return id === 'g-moi' ? membres : [];
    };
    const r = await resoudreMesGroupes(['g-moi', 'g-autre', 'g-ko'], { objectId: 'bbb-2' }, lister);
    expect(r).toEqual({ groupes: ['g-moi'], erreurs: ['g-ko'] });
  });
  it('aucun groupe à résoudre', async () => {
    expect(await resoudreMesGroupes([], { objectId: 'x' }, async () => [])).toEqual({ groupes: [], erreurs: [] });
  });
});
