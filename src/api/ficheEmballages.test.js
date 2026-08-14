import { describe, it, expect } from 'vitest';
import { diffEmballages, blocsFromRows, isEmptyBloc } from './ficheEmballages';

const blocs = {
  uvc_block: { poids_brut: 5.649, poids_net: 5, long: 400, larg: 300, haut: 200, volume: 0, gtin: '3270160893614' },
  element_block: { unite: 4 },
  colis_block: { unite: 1, poids_brut: 5.649, poids_net: 5, long: 316, larg: 203, haut: 410, gtin: '03270161009267' },
  couche_block: { unite: 12, poids_brut: 67.788, poids_net: 60, long: 1200, larg: 800, haut: 410, gtin: '0000000000000' },
  palette_block: { unite: 48, poids_brut: 296.152, poids_net: 240, long: 1200, larg: 800, haut: 1790, gtin: '03270162009495' },
};

describe('diffEmballages (option B — 8 lignes générées)', () => {
  it('crée les 8 unités SAP quand la table est vide', () => {
    const { toCreate, toUpdate, toDelete } = diffEmballages([], blocs);
    expect(toCreate.map((r) => r.cr04e_alternativeunit).sort()).toEqual(
      ['CAR', 'PAL', 'PCB', 'U', 'UE', 'ZCO', 'ZPP', 'ZUG'].sort(),
    );
    expect(toUpdate).toHaveLength(0);
    expect(toDelete).toHaveLength(0);
  });

  it('met à jour une ligne modifiée et supprime les codes obsolètes', () => {
    const existants = [
      { cr04e_unitofmeasureid: 'car1', cr04e_alternativeunit: 'CAR', cr04e_quantitydenominator: '99' },
      { cr04e_unitofmeasureid: 'old1', cr04e_alternativeunit: 'ST' }, // ancien code -> à supprimer
    ];
    const { toUpdate, toDelete } = diffEmballages(existants, blocs);
    expect(toUpdate.find((u) => u.id === 'car1')).toBeTruthy();
    expect(toDelete.map((d) => d.cr04e_unitofmeasureid)).toContain('old1');
  });
});

describe('blocsFromRows (relecture)', () => {
  it('round-trip : génère puis reconstruit les 5 blocs', () => {
    const rows = diffEmballages([], blocs).toCreate.map((r, i) => ({ ...r, cr04e_unitofmeasureid: `id${i}` }));
    const back = blocsFromRows(rows);

    expect(back.uvc_block).toMatchObject({ poids_brut: 5.649, poids_net: 5, long: 400, larg: 300, haut: 200, gtin: '3270160893614' });
    expect(back.uvc_block.volume).toBe(0); // volume UVC (L) via ZUG
    expect(back.element_block).toEqual({ unite: 4 });
    expect(back.colis_block).toMatchObject({ unite: 1, long: 316, larg: 203, haut: 410, gtin: '03270161009267' });
    expect(back.couche_block).toMatchObject({ unite: 12, gtin: '0000000000000' });
    expect(back.colis_block.volume).toBeCloseTo(0.02630068, 8); // CDM -> m³
    expect(back.palette_block).toMatchObject({ unite: 48, haut: 1790, gtin: '03270162009495' });
  });

  it('round-trip : un volume colis saisi revient à l’identique', () => {
    const avec = { ...blocs, colis_block: { ...blocs.colis_block, volume: 0.0263 } };
    const rows = diffEmballages([], avec).toCreate.map((r, i) => ({ ...r, cr04e_unitofmeasureid: `id${i}` }));
    expect(blocsFromRows(rows).colis_block.volume).toBe(0.0263);
  });
});

describe('isEmptyBloc', () => {
  it('détecte un bloc vide vs renseigné', () => {
    expect(isEmptyBloc({})).toBe(true);
    expect(isEmptyBloc({ unite: null, gtin: '' })).toBe(true);
    expect(isEmptyBloc({ unite: 6 })).toBe(false);
  });
});
