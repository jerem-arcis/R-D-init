import { describe, it, expect } from 'vitest';
import {
  codeDivisionOrigine,
  codeDivisionFabrication,
  computeHierarchieDS,
  computeClasseValoDS,
  computeCentreProfitDS,
  computeSecteurDS,
  isTypeNegoce,
} from './dsRules';

describe('codeDivisionOrigine', () => {
  it('mappe chaque usine d\'origine vers son code', () => {
    expect(codeDivisionOrigine('Bonloc')).toBe('2886');
    expect(codeDivisionOrigine('Rivesaltes')).toBe('2866');
    expect(codeDivisionOrigine('Aire')).toBe('2859');
    expect(codeDivisionOrigine('Agen')).toBe('2847');
    expect(codeDivisionOrigine('Faux frais STEF Agen')).toBe('2823');
    expect(codeDivisionOrigine('Produit negoce')).toBe('2820');
  });
  it('vide si inconnu', () => {
    expect(codeDivisionOrigine('')).toBe('');
    expect(codeDivisionOrigine('X')).toBe('');
  });
});

describe('isTypeNegoce', () => {
  it('vrai pour 4 et 5', () => {
    expect(isTypeNegoce('4')).toBe(true);
    expect(isTypeNegoce('5')).toBe(true);
    expect(isTypeNegoce('1')).toBe(false);
  });
});

describe('codeDivisionFabrication', () => {
  it('types negoce 4/5 -> 2820 quelle que soit l\'usine', () => {
    expect(codeDivisionFabrication({ type_demande: '4', usine: 'Bonloc' })).toBe('2820');
    expect(codeDivisionFabrication({ type_demande: '5', usine: 'Agen' })).toBe('2820');
  });
  it('Agen + Faux Frais STEF -> 2823, sinon Agen -> 2847', () => {
    expect(codeDivisionFabrication({ type_demande: '1', usine: 'Agen', agen_type: 'Faux Frais STEF' })).toBe('2823');
    expect(codeDivisionFabrication({ type_demande: '1', usine: 'Agen', agen_type: 'Surgele' })).toBe('2847');
    expect(codeDivisionFabrication({ type_demande: '1', usine: 'Agen', agen_type: 'Faux Frais Autre' })).toBe('2847');
  });
  it('autres usines -> leur code', () => {
    expect(codeDivisionFabrication({ type_demande: '1', usine: 'Bonloc' })).toBe('2886');
    expect(codeDivisionFabrication({ type_demande: '6', usine: 'Aire' })).toBe('2859');
  });
});

describe('computeHierarchieDS', () => {
  it('activite -> hierarchie SAP', () => {
    expect(computeHierarchieDS('PATISSERIES')).toBe('22 DE DE DE');
    expect(computeHierarchieDS('TRAITEUR')).toBe('27 DE DE DE');
    expect(computeHierarchieDS('MOCHIS')).toBe('21 DE DE DE');
    expect(computeHierarchieDS('')).toBe('');
  });
});

describe('computeClasseValoDS', () => {
  it('production -> 7012, Aire -> 2038', () => {
    expect(computeClasseValoDS({ usine: 'Bonloc' })).toBe('7012');
    expect(computeClasseValoDS({ usine: 'Rivesaltes' })).toBe('7012');
    expect(computeClasseValoDS({ usine: 'Agen' })).toBe('7012');
    expect(computeClasseValoDS({ usine: 'Aire' })).toBe('2038');
  });
  it('negoce (4/5) : Traiteur -> 2038, Patisseries -> 2030, Mochis -> vide', () => {
    expect(computeClasseValoDS({ type_demande: '4', activite: 'TRAITEUR' })).toBe('2038');
    expect(computeClasseValoDS({ type_demande: '5', activite: 'PATISSERIES' })).toBe('2030');
    expect(computeClasseValoDS({ type_demande: '4', activite: 'MOCHIS' })).toBe('');
  });
});

describe('computeCentreProfitDS', () => {
  it('regles par usine/activite', () => {
    expect(computeCentreProfitDS({ activite: 'MOCHIS' })).toBe('21PF');
    expect(computeCentreProfitDS({ usine: 'Aire' })).toBe('27TDL');
    expect(computeCentreProfitDS({ usine: 'Bonloc' })).toBe('22PF');
    expect(computeCentreProfitDS({ usine: 'Rivesaltes' })).toBe('22PF');
  });
  it('negoce 4/5', () => {
    expect(computeCentreProfitDS({ type_demande: '4', activite: 'PATISSERIES' })).toBe('22HA');
    expect(computeCentreProfitDS({ type_demande: '5', activite: 'TRAITEUR' })).toBe('27HA');
  });
  it('Agen selon le choix', () => {
    expect(computeCentreProfitDS({ usine: 'Agen', agen_choix: 'Pains surprises' })).toBe('27PS');
    expect(computeCentreProfitDS({ usine: 'Agen', agen_choix: 'Assortiments ou plateaux' })).toBe('27CA');
    expect(computeCentreProfitDS({ usine: 'Agen', agen_choix: 'Plaques' })).toBe('27PL');
    expect(computeCentreProfitDS({ usine: 'Agen' })).toBe('27CA');
  });
});

describe('computeSecteurDS', () => {
  it('type de marque -> secteur', () => {
    expect(computeSecteurDS('Marque Nationale RHF / Export')).toBe('10');
    expect(computeSecteurDS('Marque Nationale GMS')).toBe('12');
    expect(computeSecteurDS('Marque distributeur')).toBe('15');
    expect(computeSecteurDS('')).toBe('');
  });
});
