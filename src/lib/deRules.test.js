import { describe, it, expect } from 'vitest';
import {
  DE_DIVISION_CODES,
  divisionCodeFromPlant,
  usineFromDivision,
  computeHierarchieDE,
  computeClasseValoDE,
  computeCentreProfitDE,
  computeGroupeArticleDE,
  computeGroupeArticleLockedDE,
  needsSurgeleWarningDE,
  computeSecteurFromReseau,
  normalizeAxeStrategique,
} from './deRules';

describe('DE_DIVISION_CODES', () => {
  it('restreint aux 4 sites de fabrication', () => {
    expect([...DE_DIVISION_CODES].sort()).toEqual(['2847', '2859', '2866', '2886']);
  });
});

describe('divisionCodeFromPlant', () => {
  it('mappe le nom du site beCPG vers le code division', () => {
    expect(divisionCodeFromPlant('BONLOC')).toBe('2886');
    expect(divisionCodeFromPlant('rivesaltes')).toBe('2866');
    expect(divisionCodeFromPlant(' Agen ')).toBe('2847');
    expect(divisionCodeFromPlant('AIRE')).toBe('2859');
  });
  it('renvoie une chaîne vide pour un site inconnu ou absent', () => {
    expect(divisionCodeFromPlant('PARIS')).toBe('');
    expect(divisionCodeFromPlant('')).toBe('');
    expect(divisionCodeFromPlant(null)).toBe('');
  });
});

describe('usineFromDivision', () => {
  it('retrouve l’usine depuis le code', () => {
    expect(usineFromDivision('2886')).toBe('Bonloc');
    expect(usineFromDivision('2859')).toBe('Aire');
    expect(usineFromDivision('9999')).toBe('');
  });
});

describe('computeHierarchieDE', () => {
  it('22 pour Pâtisseries (Bonloc, Rivesaltes) — segments séparés par des tabs', () => {
    expect(computeHierarchieDE('2886')).toBe('22\tDE\tDE\tDE');
    expect(computeHierarchieDE('2866')).toBe('22\tDE\tDE\tDE');
  });
  it('27 pour Traiteur (Agen, Aire) — segments séparés par des tabs', () => {
    expect(computeHierarchieDE('2847')).toBe('27\tDE\tDE\tDE');
    expect(computeHierarchieDE('2859')).toBe('27\tDE\tDE\tDE');
  });
  it('vide si division inconnue', () => {
    expect(computeHierarchieDE('')).toBe('');
  });
});

describe('computeClasseValoDE', () => {
  it('7012 pour les dépôts de production', () => {
    expect(computeClasseValoDE('2886')).toBe('7012');
    expect(computeClasseValoDE('2866')).toBe('7012');
    expect(computeClasseValoDE('2847')).toBe('7012');
  });
  it('2038 pour Aire', () => {
    expect(computeClasseValoDE('2859')).toBe('2038');
  });
});

describe('computeCentreProfitDE', () => {
  it('27TDL pour Aire, 22PF pour Bonloc/Rivesaltes', () => {
    expect(computeCentreProfitDE('2859')).toBe('27TDL');
    expect(computeCentreProfitDE('2886')).toBe('22PF');
    expect(computeCentreProfitDE('2866')).toBe('22PF');
  });
  it('vide (choix libre) pour Agen', () => {
    expect(computeCentreProfitDE('2847')).toBe('');
  });
});

describe('computeGroupeArticleDE', () => {
  it('PF-AS Agen, PF-B Bonloc, PF-F Rivesaltes', () => {
    expect(computeGroupeArticleDE('2847')).toBe('PF-AS');
    expect(computeGroupeArticleDE('2886')).toBe('PF-B');
    expect(computeGroupeArticleDE('2866')).toBe('PF-F');
  });
  it('vide (choix libre) pour Aire', () => {
    expect(computeGroupeArticleDE('2859')).toBe('');
  });
});

describe('computeGroupeArticleLockedDE', () => {
  it('verrouille seulement Bonloc (PF-B) et Rivesaltes (PF-F)', () => {
    expect(computeGroupeArticleLockedDE('2886')).toBe('PF-B');
    expect(computeGroupeArticleLockedDE('2866')).toBe('PF-F');
  });
  it('ne verrouille pas Agen (modifiable) ni Aire (libre)', () => {
    expect(computeGroupeArticleLockedDE('2847')).toBe('');
    expect(computeGroupeArticleLockedDE('2859')).toBe('');
  });
});

describe('needsSurgeleWarningDE', () => {
  it('vrai uniquement pour Agen', () => {
    expect(needsSurgeleWarningDE('2847')).toBe(true);
    expect(needsSurgeleWarningDE('2886')).toBe(false);
  });
});

describe('computeSecteurFromReseau', () => {
  it('mappe chaque réseau vers son secteur', () => {
    expect(computeSecteurFromReseau('MDD')).toBe('15');
    expect(computeSecteurFromReseau('HSFC')).toBe('15');
    expect(computeSecteurFromReseau('GDM')).toBe('12');
    expect(computeSecteurFromReseau('RMN')).toBe('10');
    expect(computeSecteurFromReseau('RMD')).toBe('15');
    expect(computeSecteurFromReseau('BPT_GMS')).toBe('10');
    expect(computeSecteurFromReseau('BPT_RHF')).toBe('10');
    expect(computeSecteurFromReseau('EXPORT RHF')).toBe('10');
    expect(computeSecteurFromReseau('EXPORT RETAIL')).toBe('15');
  });
  it('vide si réseau inconnu', () => {
    expect(computeSecteurFromReseau('AUTRE')).toBe('');
    expect(computeSecteurFromReseau('')).toBe('');
  });
});

describe('normalizeAxeStrategique', () => {
  it('ramène la casse à la forme canonique', () => {
    expect(normalizeAxeStrategique('BUDGET')).toBe('Budget');
    expect(normalizeAxeStrategique('budget')).toBe('Budget');
    expect(normalizeAxeStrategique('  Hors Budget ')).toBe('Hors budget');
    expect(normalizeAxeStrategique('HORS BUDGET')).toBe('Hors budget');
  });
  it('conserve une valeur hors liste inchangée', () => {
    expect(normalizeAxeStrategique('Elargissement offre GMS')).toBe('Elargissement offre GMS');
  });
  it('renvoie la valeur vide/absente telle quelle', () => {
    expect(normalizeAxeStrategique('')).toBe('');
    expect(normalizeAxeStrategique(undefined)).toBe(undefined);
    expect(normalizeAxeStrategique(null)).toBe(null);
  });
});
