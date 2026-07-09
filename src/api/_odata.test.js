import { describe, it, expect } from 'vitest';
import { toNumber, decimalStr, trimOrUndef } from './_odata';

describe('toNumber', () => {
  it('convertit un nombre normal (point)', () => {
    expect(toNumber('1.598')).toBe(1.598);
    expect(toNumber(6.123)).toBe(6.123);
  });
  it('tolère la virgule décimale française', () => {
    expect(toNumber('1,598')).toBe(1.598);
  });
  it("'' / null -> undefined (champ omis)", () => {
    expect(toNumber('')).toBeUndefined();
    expect(toNumber(null)).toBeUndefined();
  });
  it('non numérique -> undefined', () => {
    expect(toNumber('abc')).toBeUndefined();
  });
});

describe('decimalStr', () => {
  it('renvoie une chaîne à point pour SAP', () => {
    expect(decimalStr('1.598')).toBe('1.598');
    expect(decimalStr(6.123)).toBe('6.123');
  });
  it('convertit la virgule française en point (cause du 400 SAP)', () => {
    expect(decimalStr('1,598')).toBe('1.598');
  });
  it("'' / null -> '' (champ vide)", () => {
    expect(decimalStr('')).toBe('');
    expect(decimalStr(null)).toBe('');
  });
});

describe('trimOrUndef', () => {
  it('trim et vide -> undefined', () => {
    expect(trimOrUndef('  x  ')).toBe('x');
    expect(trimOrUndef('   ')).toBeUndefined();
  });
});
