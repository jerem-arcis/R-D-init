import { describe, it, expect } from 'vitest';
import { diffSitesStockage } from './ficheSitesStockage';

describe('diffSitesStockage', () => {
  it('classe création / suppression par code, dédoublonne et ignore les vides', () => {
    const d = diffSitesStockage(
      [{ id: 'r1', code: '2820' }, { id: 'r2', code: '2824' }],
      ['2820', '2860', '2860', '', '  '],
    );
    expect(d.toCreate).toEqual(['2860']);
    expect(d.toDelete.map((x) => x.id)).toEqual(['r2']);
  });

  it('ne crée ni ne supprime rien si la sélection est identique', () => {
    const d = diffSitesStockage(
      [{ id: 'r1', code: '2820' }, { id: 'r2', code: '2823' }],
      ['2823', '2820'],
    );
    expect(d.toCreate).toEqual([]);
    expect(d.toDelete).toEqual([]);
  });

  it('supprime tout quand la sélection est vide', () => {
    const d = diffSitesStockage([{ id: 'r1', code: '2820' }], []);
    expect(d.toCreate).toEqual([]);
    expect(d.toDelete.map((x) => x.id)).toEqual(['r1']);
  });

  it('2 sites déjà en base + 1 coché = 1 seule création, aucune ligne existante touchée', () => {
    const existants = [{ id: 'r1', code: '2820' }, { id: 'r2', code: '2824' }];
    const d = diffSitesStockage(existants, ['2820', '2824', '2860']);
    expect(d.toCreate).toEqual(['2860']);
    expect(d.toDelete).toEqual([]);
  });

  it('apparie malgré les espaces (pas de suppression/recréation inutile)', () => {
    const d = diffSitesStockage(
      [{ id: 'r1', code: ' 2820 ' }, { id: 'r2', code: '2824' }],
      ['2820', '2824'],
    );
    expect(d.toCreate).toEqual([]);
    expect(d.toDelete).toEqual([]);
  });

  it('nettoie les doublons de code (une seule ligne conservée)', () => {
    const d = diffSitesStockage(
      [{ id: 'r1', code: '2820' }, { id: 'r2', code: '2820' }, { id: 'r3', code: '2820' }],
      ['2820'],
    );
    expect(d.toCreate).toEqual([]);
    expect(d.toDelete.map((x) => x.id)).toEqual(['r2', 'r3']);
  });
});
