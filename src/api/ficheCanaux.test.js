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

  it('supprime la ligne d’un canal décoché même si d’autres restent cochés', () => {
    const d = diffCanaux(
      [{ id: 'r1', code: 'GMS' }, { id: 'r2', code: 'RHF' }, { id: 'r3', code: 'Export' }],
      ['GMS', 'Export'],
    );
    expect(d.toCreate).toEqual([]);
    expect(d.toDelete.map((x) => x.id)).toEqual(['r2']);
  });

  it('2 canaux déjà en base + 1 coché = 1 seule création, aucune ligne existante touchée', () => {
    const existants = [{ id: 'r1', code: 'GMS' }, { id: 'r2', code: 'RHF' }];
    const d = diffCanaux(existants, ['GMS', 'RHF', 'Export']);
    expect(d.toCreate).toEqual(['Export']);
    expect(d.toDelete).toEqual([]);
  });

  it('apparie malgré les espaces et la casse (pas de suppression/recréation inutile)', () => {
    const d = diffCanaux(
      [{ id: 'r1', code: ' gms ' }, { id: 'r2', code: 'RHF' }],
      ['GMS', 'rhf'],
    );
    expect(d.toCreate).toEqual([]);
    expect(d.toDelete).toEqual([]);
  });

  it('nettoie les doublons de code (une seule ligne conservée)', () => {
    const d = diffCanaux(
      [{ id: 'r1', code: 'GMS' }, { id: 'r2', code: 'GMS' }, { id: 'r3', code: 'GMS' }],
      ['GMS'],
    );
    expect(d.toCreate).toEqual([]);
    expect(d.toDelete.map((x) => x.id)).toEqual(['r2', 'r3']);
  });
});
