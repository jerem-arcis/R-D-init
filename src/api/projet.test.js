import { describe, it, expect } from 'vitest';
import { listShapeForTest } from './projet';

describe('toListShape — type DS', () => {
  it('marque type_de=ds pour un statut DS', () => {
    const row = listShapeForTest({ cr04e_projetid: '1', cr04e_statut_en_cours: 'ds_attente_cc' });
    expect(row.type_de).toBe('ds');
  });
  it('reste de pour un statut DE', () => {
    const row = listShapeForTest({ cr04e_projetid: '2', cr04e_statut_en_cours: 'dl_attente_validation_cdg' });
    expect(row.type_de).toBe('de');
  });
});
