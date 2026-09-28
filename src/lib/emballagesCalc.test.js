import { describe, it, expect } from 'vitest';
import { computeVolumeM3, computePoidsNet, paletteDimsFromType } from './emballagesCalc';

describe('computeVolumeM3', () => {
  it('L×l×h / 1e9 (mm -> m³), arrondi 6 décimales — cas colis du fichier FM', () => {
    // Industriel!K22 : 316 × 203 × 410 = 0.02630068 m³.
    expect(computeVolumeM3({ long: 316, larg: 203, haut: 410 })).toBe(0.026301);
  });

  it('cas palette du fichier FM (1200 × 800 × 1790)', () => {
    // Industriel!K24 : 1200 × 800 × 1790 = 1.7184 m³.
    expect(computeVolumeM3({ long: 1200, larg: 800, haut: 1790 })).toBe(1.7184);
  });

  it('null si une dimension manque, est nulle ou non numérique', () => {
    expect(computeVolumeM3({ long: 316, larg: 203 })).toBeNull();
    expect(computeVolumeM3({ long: 316, larg: 203, haut: 0 })).toBeNull();
    expect(computeVolumeM3({ long: 316, larg: 203, haut: 'x' })).toBeNull();
    expect(computeVolumeM3({})).toBeNull();
    expect(computeVolumeM3()).toBeNull();
  });
});

describe('computePoidsNet', () => {
  it('poids net UVC × nb d\'UVC du niveau (cascade FM)', () => {
    expect(computePoidsNet(5, 12)).toBe(60); // couche : 5 × 12
    expect(computePoidsNet(0.45, 48)).toBe(21.6); // colis : 0,45 × 48
  });

  it('null si poids net UVC ou nombre manquant / nul / non numérique', () => {
    expect(computePoidsNet(null, 12)).toBeNull();
    expect(computePoidsNet(5, 0)).toBeNull();
    expect(computePoidsNet(5, null)).toBeNull();
    expect(computePoidsNet('x', 12)).toBeNull();
  });
});

describe('paletteDimsFromType', () => {
  it('extrait larg (1er nombre) et long (2e) du libellé, en mm', () => {
    expect(paletteDimsFromType('SME80 - Palette 80 x 120 Europe')).toEqual({ larg: 800, long: 1200 });
    expect(paletteDimsFromType('SM100 - Palette 100 x 120')).toEqual({ larg: 1000, long: 1200 });
  });

  it('null si aucun « N x M » dans le libellé', () => {
    expect(paletteDimsFromType('')).toBeNull();
    expect(paletteDimsFromType('Palette standard')).toBeNull();
    expect(paletteDimsFromType(null)).toBeNull();
  });
});
