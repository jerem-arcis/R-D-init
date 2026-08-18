import { describe, it, expect } from 'vitest';
import { listShapeForTest, formDataForTest, buildProjetPayload } from './projet';
import { buildDsPayload } from './ds';

describe('toListShape — type DS', () => {
  it('marque type_de=ds pour un statut DS', () => {
    const row = listShapeForTest({ cr04e_projetid: '1', cr04e_statut_en_cours: 'ds_attente_cc' });
    expect(row.type_de).toBe('ds');
  });
  it('reste de pour un statut DE', () => {
    const row = listShapeForTest({ cr04e_projetid: '2', cr04e_statut_en_cours: 'dl_attente_validation_cdg' });
    expect(row.type_de).toBe('de');
  });

  it('remonte les statuts de flux SAP en tri-état (undefined/false/true)', () => {
    const abs = listShapeForTest({ cr04e_projetid: '1' });
    expect(abs.flux_envoi_de).toBeUndefined();
    expect(abs.flux_envoi_fl).toBeUndefined();

    const set = listShapeForTest({ cr04e_projetid: '2', cr04e_fluxenvoiede: false, cr04e_fluxenvoiefl: true });
    expect(set.flux_envoi_de).toBe(false);
    expect(set.flux_envoi_fl).toBe(true);
  });
});

describe('toFormData — résolution des lookups à la réouverture', () => {
  const sapOptions = {
    divisions: [{ id: 'gdiv', value: '2886' }],
    classes_valorisation: [{ id: 'gclz', value: '7012' }],
    groupes_article: [{ id: 'gga', value: 'BA' }],
    familles_produit: [],
    centres_profit: [{ id: 'gcep', value: '22PF' }],
  };

  it('reconstitue division + champs pilotés depuis les GUID de lookup', () => {
    const f = formDataForTest(
      {
        cr04e_projetid: '9',
        _cr04e_divisionusine_value: 'gdiv',
        _cr04e_classedevalorisation_value: 'gclz',
        _cr04e_groupearticledivision_value: 'gga',
        _cr04e_centredeprofit_value: 'gcep',
      },
      sapOptions,
    );
    expect(f.division).toBe('2886');
    expect(f.classe_valorisation).toBe('7012');
    expect(f.groupe_article).toBe('BA');
    expect(f.centre_profit).toBe('22PF');
  });

  it('repli division sur cr04e_divisionimport si le lookup est absent', () => {
    const f = formDataForTest({ cr04e_projetid: '9', cr04e_divisionimport: 'RIVESALTES' }, sapOptions);
    expect(f.division).toBe('2866'); // divisionCodeFromPlant('RIVESALTES')
  });
});

describe('type de produit SAP (cr04e_typedeproduit)', () => {
  it('une DE est toujours PFIN, une DS toujours NEGO', () => {
    expect(buildProjetPayload({}).cr04e_typedeproduit).toBe('PFIN');
    expect(buildDsPayload({}).cr04e_typedeproduit).toBe('NEGO');
  });

  it('la valeur est posée quel que soit le statut (dont validation)', () => {
    expect(buildProjetPayload({}, { statut: 'dl_attente_validation_cdg' }).cr04e_typedeproduit).toBe('PFIN');
    expect(buildDsPayload({}, { statut: 'ds_validee' }).cr04e_typedeproduit).toBe('NEGO');
  });
});
