import { describe, it, expect } from 'vitest';
import { diffLibelles } from './ficheLibellePays';

describe('diffLibelles', () => {
  it('classe création / mise à jour / suppression par code, ignore les libellés vides', () => {
    const d = diffLibelles(
      [{ id: 'r1', code: 'FR', libelle: 'Vieux' }, { id: 'r2', code: 'EN', libelle: 'Old' }],
      [{ code: 'FR', libelle: 'Neuf' }, { code: 'ES', libelle: 'Nuevo' }, { code: 'DE', libelle: '' }],
    );
    expect(d.toUpdate).toEqual([{ id: 'r1', code: 'FR', libelle: 'Neuf' }]);
    expect(d.toCreate).toEqual([{ code: 'ES', libelle: 'Nuevo' }]);
    expect(d.toDelete.map((x) => x.id)).toEqual(['r2']);
  });

  it('ne met pas à jour un libellé inchangé', () => {
    const d = diffLibelles(
      [{ id: 'r1', code: 'FR', libelle: 'Pareil' }],
      [{ code: 'FR', libelle: 'Pareil' }],
    );
    expect(d.toCreate).toEqual([]);
    expect(d.toUpdate).toEqual([]);
    expect(d.toDelete).toEqual([]);
  });
});
