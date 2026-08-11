import { describe, it, expect } from 'vitest';
import { diffCanaux } from './ficheCanaux';

describe('diffCanaux', () => {
  it('classe création / suppression par code, dédoublonne et ignore les vides', () => {
    const d = diffCanaux(
      [{ id: 'r1', code: 'GMS' }, { id: 'r2', code: 'Export' }],
      ['GMS', 'RHF', 'RHF', '', '  '],
    );
    expect(d.toCreate).toEqual(['RHF']);
    expect(d.toDelete.map((x) => x.id)).toEqual(['r2']);
  });

  it('ne crée ni ne supprime rien si la sélection est identique', () => {
    const d = diffCanaux(
      [{ id: 'r1', code: 'GMS' }, { id: 'r2', code: 'BtoB' }],
      ['BtoB', 'GMS'],
    );
    expect(d.toCreate).toEqual([]);
    expect(d.toDelete).toEqual([]);
  });

  it('supprime tout quand la sélection est vide', () => {
    const d = diffCanaux([{ id: 'r1', code: 'GMS' }], []);
    expect(d.toCreate).toEqual([]);
    expect(d.toDelete.map((x) => x.id)).toEqual(['r1']);
  });
});
