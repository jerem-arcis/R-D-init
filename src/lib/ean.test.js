import { describe, it, expect } from 'vitest';
import {
  gs1CheckDigit,
  eanUV,
  eanCarton,
  eanCouche,
  eanPalette,
  buildEANSet,
  buildGtinSet,
  baseCodeFromCode,
  isValidBaseCode,
} from './ean';

// Valeurs de référence extraites du fichier EAN13UV.xls (Feuil1) :
//   F=Code | M=EAN-13 UV (suffixe 00) | O=EAN14CT/01 | Q=EAN14CO/02 | S=EAN14PL/03
//   les clés (N/P/R/T) sont celles calculées par le classeur.
describe('gs1CheckDigit', () => {
  // Corps EAN-13 (12 chiffres) : la clé attendue est le 13e chiffre du fichier.
  it('EAN-13 : corps 325151112400 -> clé 7', () => {
    expect(gs1CheckDigit('325151112400')).toBe(7);
  });
  it('EAN-13 : corps 325151112500 -> clé 4', () => {
    expect(gs1CheckDigit('325151112500')).toBe(4);
  });
  // Corps GTIN-14 (13 chiffres) : la clé attendue est le 14e chiffre.
  it('GTIN-14 : corps 0325151112401 -> clé 4', () => {
    expect(gs1CheckDigit('0325151112401')).toBe(4);
  });
  it('GTIN-14 : corps 0325151112402 -> clé 1', () => {
    expect(gs1CheckDigit('0325151112402')).toBe(1);
  });
  it('GTIN-14 : corps 0325151112403 -> clé 8', () => {
    expect(gs1CheckDigit('0325151112403')).toBe(8);
  });
  // Exemple GS1 de référence (GTIN-14 données 1234567890123 -> clé 1).
  it('GTIN-14 : exemple GS1 1234567890123 -> clé 1', () => {
    expect(gs1CheckDigit('1234567890123')).toBe(1);
  });
});

describe('constructions EAN (code 1124)', () => {
  it('UV = EAN-13 325151 + code + 00 + clé', () => {
    expect(eanUV('1124')).toBe('3251511124007');
  });
  it('Carton = GTIN-14 0325151 + code + 01 + clé (EAN14CT)', () => {
    expect(eanCarton('1124')).toBe('03251511124014');
  });
  it('Couche = GTIN-14 0325151 + code + 02 + clé (EAN14CO)', () => {
    expect(eanCouche('1124')).toBe('03251511124021');
  });
  it('Palette = GTIN-14 0325151 + code + 03 + clé (EAN14PL)', () => {
    expect(eanPalette('1124')).toBe('03251511124038');
  });
});

describe('constructions EAN (code 1125)', () => {
  it('UV', () => expect(eanUV('1125')).toBe('3251511125004'));
  it('Carton', () => expect(eanCarton('1125')).toBe('03251511125011'));
  it('Couche', () => expect(eanCouche('1125')).toBe('03251511125028'));
  it('Palette', () => expect(eanPalette('1125')).toBe('03251511125035'));
});

describe('buildEANSet', () => {
  it('renvoie Couche / Carton / Palette pour un code à 4 chiffres', () => {
    expect(buildEANSet('1124')).toEqual({
      ean_couche: '03251511124021',
      ean_carton: '03251511124014',
      ean_palette: '03251511124038',
    });
  });
  it('normalise un code non numérique (garde les chiffres)', () => {
    expect(buildEANSet(' 11 24 ')).toEqual(buildEANSet('1124'));
  });
  it('prend les 4 PREMIERS chiffres d’un code chapeau plus long', () => {
    // code chapeau « 741603 » -> base « 7416 »
    expect(buildEANSet('741603')).toEqual(buildEANSet('7416'));
  });
  it('renvoie des chaînes vides si moins de 4 chiffres', () => {
    expect(buildEANSet('741')).toEqual({ ean_couche: '', ean_carton: '', ean_palette: '' });
    expect(buildEANSet('')).toEqual({ ean_couche: '', ean_carton: '', ean_palette: '' });
  });
});

describe('baseCodeFromCode', () => {
  it('prend les 4 premiers chiffres', () => {
    expect(baseCodeFromCode('741603')).toBe('7416');
    expect(baseCodeFromCode('1124')).toBe('1124');
    expect(baseCodeFromCode('11242006')).toBe('1124');
  });
  it('ignore les caractères non numériques', () => {
    expect(baseCodeFromCode(' 74-16-03 ')).toBe('7416');
  });
  it('renvoie "" si moins de 4 chiffres', () => {
    expect(baseCodeFromCode('741')).toBe('');
    expect(baseCodeFromCode('')).toBe('');
    expect(baseCodeFromCode(null)).toBe('');
  });
});

describe('isValidBaseCode', () => {
  it('vrai pour exactement 4 chiffres', () => {
    expect(isValidBaseCode('1124')).toBe(true);
    expect(isValidBaseCode(' 1124 ')).toBe(true);
  });
  it('faux sinon', () => {
    expect(isValidBaseCode('112')).toBe(false);
    expect(isValidBaseCode('11245')).toBe(false);
    expect(isValidBaseCode('741603')).toBe(false);
    expect(isValidBaseCode('')).toBe(false);
    expect(isValidBaseCode(null)).toBe(false);
  });
});

// Valeurs de référence : 419805-FM-2025-10-29.xlsm, feuille EAN (article 4198).
// Les résultats attendus sont ceux calculés par le classeur lui-même.
describe('buildGtinSet — conforme au fichier FM 419805', () => {
  it('dérive les 5 GTIN depuis le code article', () => {
    expect(buildGtinSet('419805')).toEqual({
      uvc: '3251514198005',       // EAN 13 UB  : 325151 + 4198 + 00 + clé
      element: '3251514198999',   // EAN 13 UE  : 325151 + 4198 + 99 + clé
      colis: '03251514198012',    // EAN 14 CT  : 0325151 + 4198 + 01 + clé
      couche: '03251514198029',   // EAN 14 CO  : 0325151 + 4198 + 02 + clé
      palette: '03251514198036',  // EAN 14 PL  : 0325151 + 4198 + 03 + clé
    });
  });

  it("pas d'EAN d'unité d'élément pour les origines 2834 et 2866", () => {
    expect(buildGtinSet('419805', { origine: '2866 - Rivesaltes' }).element).toBe('');
    expect(buildGtinSet('419805', { origine: '2834' }).element).toBe('');
    expect(buildGtinSet('419805', { origine: '2886 - Bonloc' }).element).toBe('3251514198999');
  });

  it('renvoie des chaînes vides si le code fournit moins de 4 chiffres', () => {
    expect(buildGtinSet('41')).toEqual({ uvc: '', element: '', couche: '', colis: '', palette: '' });
  });
});
