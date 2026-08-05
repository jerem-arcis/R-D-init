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
  computeProfilFabricRepetDE,
  computeGroupeAutorisationDE,
  computeGroupeFraisGenerauxDE,
  familleGroupeArticle,
  hierarchiePrefix,
  centresProfitAutorises,
  classesValoAutorisees,
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
    expect(computeHierarchieDE('2886')).toBe('22\tDE\tDE');
    expect(computeHierarchieDE('2866')).toBe('22\tDE\tDE');
  });
  it('27 pour Traiteur (Agen, Aire) — segments séparés par des tabs', () => {
    expect(computeHierarchieDE('2847')).toBe('27\tDE\tDE');
    expect(computeHierarchieDE('2859')).toBe('27\tDE\tDE');
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

describe('computeProfilFabricRepetDE', () => {
  it('mappe la division vers le profil de fabrication répétitive', () => {
    expect(computeProfilFabricRepetDE('2847')).toBe('Z006'); // Agen
    expect(computeProfilFabricRepetDE('2823')).toBe('Z006'); // Agen FF STEF
    expect(computeProfilFabricRepetDE('2886')).toBe('Z008'); // Bonloc
    expect(computeProfilFabricRepetDE('2866')).toBe('Z010'); // Rivesaltes
  });
  it('vide pour Aire, négoce ou inconnu', () => {
    expect(computeProfilFabricRepetDE('2859')).toBe(''); // Aire
    expect(computeProfilFabricRepetDE('2820')).toBe(''); // négoce
    expect(computeProfilFabricRepetDE('')).toBe('');
  });
});

describe('computeGroupeAutorisationDE', () => {
  it('Aire (2859) → NEGO, sinon PFIN', () => {
    expect(computeGroupeAutorisationDE('2859')).toBe('NEGO');
    expect(computeGroupeAutorisationDE('2847')).toBe('PFIN');
    expect(computeGroupeAutorisationDE('2886')).toBe('PFIN');
    expect(computeGroupeAutorisationDE('')).toBe('PFIN');
  });
});

describe('computeGroupeFraisGenerauxDE', () => {
  it('Aire (2859) → NEGO, sinon FG', () => {
    expect(computeGroupeFraisGenerauxDE('2859')).toBe('NEGO');
    expect(computeGroupeFraisGenerauxDE('2847')).toBe('FG');
    expect(computeGroupeFraisGenerauxDE('2866')).toBe('FG');
    expect(computeGroupeFraisGenerauxDE('')).toBe('FG');
  });
});

describe('familleGroupeArticle', () => {
  it('extrait la famille PF-xx du code complet', () => {
    expect(familleGroupeArticle('PF-AS-MBSA- PFinis Agen Surgel')).toBe('PF-AS');
    expect(familleGroupeArticle('PF-AF-...')).toBe('PF-AF');
    expect(familleGroupeArticle('PF-B')).toBe('PF-B');
    expect(familleGroupeArticle('PF-F')).toBe('PF-F');
    expect(familleGroupeArticle('PF-E - Négoce')).toBe('PF-E');
    expect(familleGroupeArticle('pf-h')).toBe('PF-H');
  });
  it('vide si valeur non PF ou absente', () => {
    expect(familleGroupeArticle('AY - MB INTERMARCHE')).toBe('');
    expect(familleGroupeArticle('')).toBe('');
    expect(familleGroupeArticle(null)).toBe('');
  });
});

describe('hierarchiePrefix', () => {
  it('extrait le préfixe à 2 chiffres', () => {
    expect(hierarchiePrefix('22\tDE\tDE')).toBe('22');
    expect(hierarchiePrefix('27 DE DE')).toBe('27');
    expect(hierarchiePrefix('21')).toBe('21');
    expect(hierarchiePrefix('')).toBe('');
  });
});

describe('centresProfitAutorises', () => {
  it('valeur unique selon F + J', () => {
    expect(centresProfitAutorises('PF-E', '22')).toEqual(['22HA']);
    expect(centresProfitAutorises('PF-E', '27')).toEqual(['27HA']);
    expect(centresProfitAutorises('PF-H', '21')).toEqual(['21PF']);
    expect(centresProfitAutorises('PF-H', '27')).toEqual(['27TDL']);
    expect(centresProfitAutorises('PF-B', '22')).toEqual(['22PF']);
  });
  it('plusieurs choix pour Agen (PF-AF/PF-AS + J27) et PF-F', () => {
    expect(centresProfitAutorises('PF-AF', '27')).toEqual(['27CA', '27PL', '27PS']);
    expect(centresProfitAutorises('PF-AS', '27')).toEqual(['27CA', '27PL', '27PS']);
    expect(centresProfitAutorises('PF-F', '22')).toEqual(['22PF', '22HA']);
  });
  it('aucune contrainte si combinaison inconnue', () => {
    expect(centresProfitAutorises('PF-B', '27')).toEqual([]);
    expect(centresProfitAutorises('', '22')).toEqual([]);
  });
});

describe('classesValoAutorisees', () => {
  it('applique les règles F + J', () => {
    expect(classesValoAutorisees('PF-E', '22')).toEqual(['2030']);
    expect(classesValoAutorisees('PF-E', '27')).toEqual(['2038']);
    expect(classesValoAutorisees('PF-H', '21')).toEqual(['2038']);
    expect(classesValoAutorisees('PF-H', '27')).toEqual(['2038']);
    expect(classesValoAutorisees('PF-B', '22')).toEqual(['7012']);
    expect(classesValoAutorisees('PF-AF', '27')).toEqual(['7012']);
    expect(classesValoAutorisees('PF-AS', '27')).toEqual(['7012']);
  });
  it('aucune contrainte pour PF-F ou inconnu', () => {
    expect(classesValoAutorisees('PF-F', '22')).toEqual([]);
    expect(classesValoAutorisees('', '22')).toEqual([]);
  });
});
