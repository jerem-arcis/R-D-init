import { describe, it, expect } from 'vitest';
import { val, dims, formatDateFr, dureeVie, eanChars, visaInfo, pillsList, DASH } from './fichePdfData';

describe('val', () => {
  it('renvoie la valeur, — si vide, « 0 » conservé', () => {
    expect(val('Boncolac')).toBe('Boncolac');
    expect(val('')).toBe(DASH);
    expect(val(null)).toBe(DASH);
    expect(val(undefined)).toBe(DASH);
    expect(val([])).toBe(DASH);
    expect(val(0)).toBe('0');
    expect(val('0')).toBe('0');
  });
});

describe('dims', () => {
  it('formate L × l × H, — si tout vide', () => {
    expect(dims({ long: 220, larg: 220, haut: 45 })).toBe('220 × 220 × 45');
    expect(dims({})).toBe(DASH);
    expect(dims(null)).toBe(DASH);
  });
});

describe('formatDateFr', () => {
  it('formate en français, — si vide, brut si illisible', () => {
    expect(formatDateFr('2026-06-20')).toBe('20 juin 2026');
    expect(formatDateFr('')).toBe(DASH);
    expect(formatDateFr('pas-une-date')).toBe('pas-une-date');
  });
});

describe('dureeVie', () => {
  it('valeur + 1er token de l’unité', () => {
    expect(dureeVie({ duree_vie: 21, unite_duree_vie: 'J - Jours' })).toBe('21 J');
    expect(dureeVie({ duree_vie: 548 })).toBe('548');
    expect(dureeVie({ duree_vie: '' })).toBe(DASH);
  });
});

describe('eanChars', () => {
  it('découpe le 1er code en caractères, null si vide', () => {
    expect(eanChars(['03251511124014'])).toEqual('03251511124014'.split(''));
    expect(eanChars('0327016109429')).toEqual('0327016109429'.split(''));
    expect(eanChars([])).toBeNull();
    expect(eanChars('')).toBeNull();
    expect(eanChars(null)).toBeNull();
  });
});

describe('visaInfo', () => {
  it('signé / refusé / en attente + date + motif', () => {
    expect(visaInfo('supply_chain', { visa_supply_chain: true, visa_supply_chain_date: '2026-06-20' }))
      .toMatchObject({ status: 'signe', label: 'Signé', date: '20 juin 2026' });
    expect(visaInfo('commerce', { refus_commerce: true, refus_commerce_motif: 'trop tard' }))
      .toMatchObject({ status: 'refuse', label: 'Refusé', motif: 'trop tard' });
    expect(visaInfo('industriel', {})).toMatchObject({ status: 'attente', label: 'En attente' });
  });
});

describe('pillsList', () => {
  it('tableau ou valeur simple → array; [] si vide', () => {
    expect(pillsList(['a', 'b'])).toEqual(['a', 'b']);
    expect(pillsList('x')).toEqual(['x']);
    expect(pillsList([])).toEqual([]);
    expect(pillsList(null)).toEqual([]);
  });
});
