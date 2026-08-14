import { describe, it, expect } from 'vitest';
import { computeEmballagesSap } from './emballagesSap';

// Blocs FL de l'article de test 4198 (fichier 419805-FM, onglets Industriel/Imprimable).
// unite = compteur cumulé d'UVC par niveau (element = U.élém/UVC).
const blocs4198 = {
  uvc_block: { poids_brut: 5.649, poids_net: 5, long: 400, larg: 300, haut: 200, volume: 0, gtin: '3270160893614' },
  element_block: { unite: 4 },
  colis_block: { unite: 1, poids_brut: 5.649, poids_net: 5, long: 316, larg: 203, haut: 410, gtin: '03270161009267' },
  couche_block: { unite: 12, poids_brut: 67.788, poids_net: 60, long: 1200, larg: 800, haut: 410, gtin: '0000000000000' },
  palette_block: { unite: 48, poids_brut: 296.152, poids_net: 240, long: 1200, larg: 800, haut: 1790, gtin: '03270162009495' },
};

const byUnit = (rows) => Object.fromEntries(rows.map((r) => [r.cr04e_alternativeunit, r]));

describe('computeEmballagesSap — exemple 4198', () => {
  const rows = computeEmballagesSap(blocs4198);
  const u = byUnit(rows);

  it('génère exactement les 8 unités attendues', () => {
    expect(rows.map((r) => r.cr04e_alternativeunit).sort()).toEqual(
      ['CAR', 'PAL', 'PCB', 'U', 'UE', 'ZCO', 'ZPP', 'ZUG'].sort(),
    );
  });

  it('U — 1/1, volume CM3 depuis dimensions, GTIN UVC', () => {
    expect(u.U).toMatchObject({
      cr04e_quantitynumerator: '1', cr04e_quantitydenominator: '1', cr04e_baseunit: 'U',
      cr04e_grossweight: '5.649', cr04e_netweight: '5', cr04e_weightunit: 'KG',
      cr04e_materialvolume: '24000', cr04e_volumeunit: 'CM3',
      cr04e_unitspecificproductlength: '40', cr04e_unitspecificproductwidth: '30',
      cr04e_unitspecificproductheight: '20', cr04e_productmeasurementunit: 'CM',
      cr04e_globaltradeitemnumber: '3270160893614',
    });
  });

  it('UE — 4/1, WeightUnit KG, sans dimensions ni GTIN', () => {
    expect(u.UE).toMatchObject({
      cr04e_quantitynumerator: '4', cr04e_quantitydenominator: '1', cr04e_baseunit: 'U', cr04e_weightunit: 'KG',
    });
    expect(u.UE.cr04e_globaltradeitemnumber).toBeUndefined();
    expect(u.UE.cr04e_materialvolume).toBeUndefined();
  });

  it('CAR — 1/colis.unite, volume CDM (÷1e6), GTIN colis', () => {
    expect(u.CAR).toMatchObject({
      cr04e_quantitynumerator: '1', cr04e_quantitydenominator: '1',
      cr04e_materialvolume: '26.30068', cr04e_volumeunit: 'CDM',
      cr04e_unitspecificproductlength: '31.6', cr04e_unitspecificproductwidth: '20.3',
      cr04e_unitspecificproductheight: '41', cr04e_globaltradeitemnumber: '03270161009267',
    });
  });

  it('ZCO — 1/12, volume 393.6 CDM', () => {
    expect(u.ZCO).toMatchObject({
      cr04e_quantitynumerator: '1', cr04e_quantitydenominator: '12',
      cr04e_grossweight: '67.788', cr04e_netweight: '60',
      cr04e_materialvolume: '393.6', cr04e_globaltradeitemnumber: '0000000000000',
    });
  });

  it('PAL — 1/48, volume 1718.4 CDM', () => {
    expect(u.PAL).toMatchObject({
      cr04e_quantitynumerator: '1', cr04e_quantitydenominator: '48',
      cr04e_grossweight: '296.152', cr04e_netweight: '240',
      cr04e_materialvolume: '1718.4', cr04e_unitspecificproductheight: '179',
      cr04e_globaltradeitemnumber: '03270162009495',
    });
  });

  it('PCB — colis.unite/1, GTIN UVC', () => {
    expect(u.PCB).toMatchObject({
      cr04e_quantitynumerator: '1', cr04e_quantitydenominator: '1',
      cr04e_baseunit: 'U', cr04e_globaltradeitemnumber: '3270160893614',
    });
  });

  it('ZPP — palette.unite/1, GTIN UVC', () => {
    expect(u.ZPP).toMatchObject({
      cr04e_quantitynumerator: '48', cr04e_quantitydenominator: '1',
      cr04e_baseunit: 'U', cr04e_globaltradeitemnumber: '3270160893614',
    });
  });

  it('ZUG — net×1000 / 1000, VolumeUnit L', () => {
    expect(u.ZUG).toMatchObject({
      cr04e_quantitynumerator: '5000', cr04e_quantitydenominator: '1000',
      cr04e_baseunit: 'U', cr04e_volumeunit: 'L', cr04e_materialvolume: '0',
    });
  });
});

describe('computeEmballagesSap — robustesse', () => {
  it('ne génère que les unités dont les blocs sont renseignés', () => {
    const rows = computeEmballagesSap({ uvc_block: { poids_net: 0.25, gtin: '123' } });
    const units = rows.map((r) => r.cr04e_alternativeunit);
    // U (bloc UVC non vide) + ZUG (poids_net présent) ; pas de CAR/ZCO/PAL/UE/PCB/ZPP.
    expect(units).toContain('U');
    expect(units).toContain('ZUG');
    expect(units).not.toContain('CAR');
    expect(units).not.toContain('PAL');
  });

  it('ZUG gère un poids net décimal < 1 kg (pas de troncature)', () => {
    const rows = computeEmballagesSap({ uvc_block: { poids_net: 0.18 } });
    const zug = rows.find((r) => r.cr04e_alternativeunit === 'ZUG');
    expect(zug.cr04e_quantitynumerator).toBe('180');
  });

  it('objet vide -> aucune ligne', () => {
    expect(computeEmballagesSap({})).toEqual([]);
    expect(computeEmballagesSap()).toEqual([]);
  });
});
