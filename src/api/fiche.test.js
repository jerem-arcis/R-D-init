import { describe, it, expect } from 'vitest';
import { toFicheShape, buildFichePayload, toFicheListShape } from './fiche';

const FMT = '@OData.Community.Display.V1.FormattedValue';

describe('toFicheShape', () => {
  it('mappe les champs scalaires + lookups (libellé formaté) + visas + statut SAP', () => {
    const projet = {
      cr04e_projetid: 'g1',
      cr04e_codechapeau: '742001',
      cr04e_nomduproduitdesignation: 'Tarte citron',
      cr04e_codeprojet: 'PJ5976',
      cr04e_dureedevie: '12',
      cr04e_typedusine: 'Z008 - Bonloc',
      cr04e_datedelademande: '2026-07-02T00:00:00Z',
      cr04e_visacommerce: true,
      cr04e_visaindustriel: false,
      cr04e_statut_en_cours: 'fl_sap_cree',
      [`_cr04e_centredeprofit_value${FMT}`]: '12043',
      [`_cr04e_hierarchieproduitfamille_value${FMT}`]: '22 DE Pât',
    };
    const f = toFicheShape(projet);
    expect(f.id).toBe('g1');
    expect(f.code_article).toBe('742001');
    expect(f.code_chapeau).toBe('742001');
    expect(f.libelle_article).toBe('Tarte citron');
    expect(f.code_etude_rd).toBe('PJ5976');
    expect(f.duree_vie).toBe('12');
    expect(f.type_usine).toBe('Z008 - Bonloc');
    expect(f.date_demande).toBe('2026-07-02'); // tronqué à la date
    expect(f.visa_commerce).toBe(true);
    expect(f.visa_industriel).toBe(false);
    expect(f.centre_profit).toBe('12043');
    expect(f.hierarchie_produit).toBe('22 DE Pât');
    expect(f.statut_sap).toBe('Création SAP effectuée');
  });

  it('renvoie null pour un projet absent', () => {
    expect(toFicheShape(null)).toBeNull();
  });
});

describe('buildFichePayload', () => {
  const sapOptions = {
    centres_profit: [{ id: 'cep1', value: '12043' }],
    familles_produit: [],
  };

  it('ne mappe que les champs présents et résout le lookup centre profit par code', () => {
    const p = buildFichePayload({ libelle_long_40: 'Libellé', centre_profit: '12043' }, { sapOptions });
    expect(p.cr04e_libellelong40caracteres).toBe('Libellé');
    expect(p['cr04e_Centredeprofit@odata.bind']).toBe('/cr04e_centredeprofitcepcts(cep1)');
    expect(p.cr04e_codechapeau).toBeUndefined();
  });

  it('omet le lookup hiérarchie quand le référentiel est vide (best-effort)', () => {
    const p = buildFichePayload({ hierarchie_produit: '22 DE Pât' }, { sapOptions });
    expect(p['cr04e_Hierarchieproduitfamille@odata.bind']).toBeUndefined();
  });

  it('mappe le visa booléen (y compris false) et le statut SAP', () => {
    expect(buildFichePayload({ visa_commerce: true }).cr04e_visacommerce).toBe(true);
    expect(buildFichePayload({ visa_commerce: false }).cr04e_visacommerce).toBe(false);
    expect(buildFichePayload({ statut_sap: 'Création SAP effectuée' }).cr04e_statut_en_cours).toBe('fl_sap_cree');
  });
});

describe('toFicheListShape', () => {
  it('projette une ligne liste FL avec usine/type/visas', () => {
    const item = toFicheListShape({
      cr04e_projetid: 'g1',
      cr04e_codechapeau: '742001',
      cr04e_nomduproduitdesignation: 'Tarte',
      cr04e_divisionusinename: 'Bonloc',
      cr04e_typedelademande: 'Création',
      cr04e_visacommerce: true,
      cr04e_visaindustriel: true,
      cr04e_visasupplychain: false,
      cr04e_statut_en_cours: 'dl_validee',
      createdon: '2026-08-01',
    });
    expect(item).toMatchObject({
      id: 'g1',
      code_article: '742001',
      libelle_article: 'Tarte',
      usine: 'Bonloc',
      type_demande: 'Création',
      visas_valides: 2,
    });
  });
});
