import { describe, it, expect } from 'vitest';
import {
  origine4, typeChars17a20, isSFIN, isNegoce, codeTypeUsine,
  computeOrgCommerciale, computeNumeroMagasin, computeDocument,
  computeGroupeAutorisation, computeControleDisponibilite, computeGroupeAcheteur,
  computeGroupePlanif, computeTypePlanification, computeHorizonPlanifFixe,
  computeGestionnaire, computeCleCalcTailleLot, computeTypeApprovisionnement,
  computeMagasinProduction, computeClasseValorisation, computeGroupeFraisGeneraux,
  computeTUS, mrp4Neutralise, computeFabRepetitive, computeProfilFabricRepet,
  computeUniteSortie, computeTypeMagasinEM, computeFicheSap, SAP_CONSTANTS,
} from './ficheSap';

// Types article réalistes : SFIN/PFINI/NEGOCE positionnés en caractères 17-20 / suffixe.
const PFINI = '3A-Produit Fini:PFINI';
const SFIN = '3A-Produit Fini:SFIN';
const NEGOCE = '3A-Produit Fini:NEGOCE';

describe('helpers d\'extraction', () => {
  it('origine4 / type article', () => {
    expect(origine4('2886-Bonloc')).toBe('2886');
    expect(typeChars17a20(PFINI)).toBe('PFIN');
    expect(isSFIN(SFIN)).toBe(true);
    expect(isSFIN(PFINI)).toBe(false);
    expect(isNegoce(NEGOCE)).toBe(true);
    expect(isNegoce(PFINI)).toBe(false);
    expect(codeTypeUsine('Z008 - Bonloc')).toBe('Z008');
  });
});

describe('règles origine', () => {
  it('org commerciale', () => {
    expect(computeOrgCommerciale('2866-Rivesaltes')).toBe('OC37');
    expect(computeOrgCommerciale('2886-Bonloc')).toBe('OC28');
  });
  it('numéro magasin', () => {
    expect(computeNumeroMagasin('2847-Agen2')).toBe('847');
    expect(computeNumeroMagasin('2886-Bonloc')).toBe('886');
    expect(computeNumeroMagasin('2820-Négoce')).toBe('');
  });
  it('document', () => {
    expect(computeDocument('2886-Bonloc')).toBe('64134100');
    expect(computeDocument('2847-Agen2')).toBe('4709104');
    expect(computeDocument('2820-Négoce')).toBe('');
  });
  it('gestionnaire (origine puis SFIN puis défaut)', () => {
    expect(computeGestionnaire('2847-Agen2', PFINI)).toBe('147');
    expect(computeGestionnaire('2820-Négoce', SFIN)).toBe('011');
    expect(computeGestionnaire('2820-Négoce', PFINI)).toBe('120');
  });
});

describe('règles type article', () => {
  it('groupe autorisation', () => {
    expect(computeGroupeAutorisation(PFINI)).toBe('PFIN');
    expect(computeGroupeAutorisation(SFIN)).toBe('');
  });
  it('contrôle dispo / type planif / magasin prod', () => {
    expect(computeControleDisponibilite(SFIN)).toBe('Z2');
    expect(computeControleDisponibilite(PFINI)).toBe('Z3');
    expect(computeTypePlanification(SFIN)).toBe('PD');
    expect(computeTypePlanification(PFINI)).toBe('Z5');
    expect(computeMagasinProduction(SFIN)).toBe('Mag.usine');
    expect(computeMagasinProduction(PFINI)).toBe('95');
  });
  it('négoce : acheteur / horizon / appro / frais généraux', () => {
    expect(computeGroupeAcheteur(NEGOCE)).toBe('NEG-Groupe acheteurs Négoce');
    expect(computeGroupeAcheteur(PFINI)).toBe('INT-Groupe acheteurs Interne');
    expect(computeHorizonPlanifFixe(NEGOCE)).toBe('1');
    expect(computeHorizonPlanifFixe(PFINI)).toBe('5');
    expect(computeTypeApprovisionnement(NEGOCE)).toBe('F');
    expect(computeTypeApprovisionnement(PFINI)).toBe('E');
    expect(computeGroupeFraisGeneraux(NEGOCE)).toBe('NEGO');
    expect(computeGroupeFraisGeneraux(PFINI)).toBe('FG');
  });
  it('clé calc taille lot', () => {
    expect(computeCleCalcTailleLot(SFIN, 'ZN - Niveau')).toBe('EX');
    expect(computeCleCalcTailleLot(PFINI, 'EX - Lot exact')).toBe('EX');
    expect(computeCleCalcTailleLot(PFINI, 'ZN - Niveau')).toBe('ZN');
  });
});

describe('classe de valorisation', () => {
  it('négoce par hiérarchie, SFIN, défaut', () => {
    expect(computeClasseValorisation(NEGOCE, '27')).toBe('2038');
    expect(computeClasseValorisation(NEGOCE, '21')).toBe('2027');
    expect(computeClasseValorisation(NEGOCE, '22')).toBe('2030');
    expect(computeClasseValorisation(SFIN, '22')).toBe('4022');
    expect(computeClasseValorisation(PFINI, '27')).toBe('7012');
  });
});

describe('groupe de planif', () => {
  it('70 -> Z002, sinon Z001', () => {
    expect(computeGroupePlanif('70')).toBe('Z002');
    expect(computeGroupePlanif('40')).toBe('Z001');
  });
});

describe('TUS (type palette)', () => {
  it('4e caractère 8 -> 80x120, sinon 100x120', () => {
    expect(computeTUS('SME80 - Palette 80 x 120 Europe')).toBe('Z81 :palette 80x120');
    expect(computeTUS('SM100 - Palette 100 x 120')).toBe('Z82 :palette 100x120');
  });
});

describe('bloc MRP4 / WM neutralisé', () => {
  it('groupe marchandise vide -> neutralisé', () => {
    expect(mrp4Neutralise('', 'X')).toBe(true);
    expect(computeFabRepetitive('', 'X')).toBe('');
  });
  it('PF-H + TDL -> neutralisé', () => {
    expect(mrp4Neutralise('PF-H...', 'TDL')).toBe(true);
    expect(computeUniteSortie('PF-H...', 'TDL')).toBe(''); // neutralisé
    expect(computeUniteSortie('PF-AS', 'AUTRE')).toBe('CAR'); // cas normal
  });
  it('cas normal -> valeurs remplies', () => {
    expect(computeFabRepetitive('PF-AS', 'AUTRE')).toBe('true');
    expect(computeProfilFabricRepet('PF-AS', 'AUTRE', 'Z008 - Bonloc')).toBe('Z008');
  });
  it('type magasin EM : Agen2 selon hauteur palette', () => {
    expect(computeTypeMagasinEM('PF-AS', '', '2847-Agen2', 1200)).toBe('002');
    expect(computeTypeMagasinEM('PF-AS', '', '2847-Agen2', 1790)).toBe('003');
    expect(computeTypeMagasinEM('PF-AS', '', '2886-Bonloc', 1790)).toBe('001');
    expect(computeTypeMagasinEM('', '', '2847', 1200)).toBe(''); // neutralisé
  });
});

describe('computeFicheSap (agrégat)', () => {
  const fiche = {
    type_article: '3A-Produit Fini:PFINI',
    origine_fabrication: '2886-Bonloc',
    groupe_marchandises: 'PF-AS-MBSA- PFinis Agen Surgel',
    hierarchie_produit: '27\tM4\t40\tMH',
    type_palette: 'SME80 - Palette 80 x 120 Europe',
    type_usine: 'Z008 - Bonloc',
    cle_calcul_lot_usine: 'ZN - Niveau',
    uvc_block: { poids_net: 5, gtin: '3270160893614' },
    // Groupements ADV : tous stockés en code (article/ristourne sur 2 car.).
    groupe_statistique_article: '1',
    groupe_article: 'AY',
    groupe_ristourne: 'AY',
    groupe_imputation: '01',
  };
  const payload = computeFicheSap(fiche);

  it('inclut les constantes', () => {
    expect(payload['MARA-MEINS']).toBe('U');
    expect(payload['MARC-HERKL']).toBe('FR');
    expect(payload['MBEW-STPRS']).toBe('1');
  });
  it('applique les règles origine/type', () => {
    expect(payload['MVKE-VKORG']).toBe('OC28');
    expect(payload['ZEINR']).toBe('64134100');
    expect(payload['MARA-BEGRU']).toBe('PFIN');
    expect(payload['MBEW-BKLAS']).toBe('7012');
    expect(payload['MLGN-LETY1']).toBe('Z81 :palette 80x120');
    expect(payload['MARC-SFEPR']).toBe('Z008');
  });
  it('pousse les groupements ADV (OC2) en code', () => {
    expect(payload['MVKE-VERSG']).toBe('1');   // statistique : code
    expect(payload['MVKE-KONDM']).toBe('AY');  // article : code sur 2 car.
    expect(payload['MVKE-BONUS']).toBe('AY');  // ristourne : code sur 2 car.
    expect(payload['MVKE-KTGRM']).toBe('01');  // imputation : code
  });
  it('génère les unités de mesure', () => {
    const units = payload.unitsOfMeasure.map((r) => r.cr04e_alternativeunit);
    expect(units).toContain('U');
    expect(units).toContain('ZUG');
  });
});
