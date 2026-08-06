import { describe, it, expect } from 'vitest';
import { blocToRow, rowToBloc, diffEmballages } from './ficheEmballages';

describe('blocToRow', () => {
  it('mappe un bloc colis vers une ligne cr04e_unitofmeasure', () => {
    const r = blocToRow('colis_block', {
      unite: 6, poids_brut: 2.4, poids_net: 2, long: 300, larg: 200, haut: 150,
      volume: 0.009, gtin: '3251510000010',
    });
    expect(r).toMatchObject({
      cr04e_alternativeunit: 'CAR',
      cr04e_quantitynumerator: '6',
      cr04e_grossweight: '2.4',
      cr04e_netweight: '2',
      cr04e_unitspecificproductlength: '300',
      cr04e_unitspecificproductwidth: '200',
      cr04e_unitspecificproductheight: '150',
      cr04e_materialvolume: '0.009',
      cr04e_globaltradeitemnumber: '3251510000010',
    });
  });

  it('rowToBloc est la réciproque (valeurs numériques)', () => {
    const { key, bloc } = rowToBloc({
      cr04e_alternativeunit: 'PAL', cr04e_grossweight: '120', cr04e_globaltradeitemnumber: '3251510000027',
    });
    expect(key).toBe('palette_block');
    expect(bloc.poids_brut).toBe(120);
    expect(bloc.gtin).toBe('3251510000027');
  });
});

describe('diffEmballages', () => {
  it('ignore les blocs vides, crée les nouveaux et supprime les obsolètes', () => {
    const d = diffEmballages(
      [{ cr04e_unitofmeasureid: 'u1', id: 'u1', cr04e_alternativeunit: 'PAL' }],
      { colis_block: { unite: 6 }, palette_block: {} },
    );
    expect(d.toCreate).toHaveLength(1);
    expect(d.toCreate[0].cr04e_alternativeunit).toBe('CAR');
    expect(d.toDelete.map((x) => x.id)).toEqual(['u1']);
  });
});
