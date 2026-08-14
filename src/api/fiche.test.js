import { describe, it, expect } from 'vitest';
import { toFicheShape, buildFichePayload, toFicheListShape, isPhaseFL } from './fiche';

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

  it('extrait le code de tête d’une valeur « CODE — LABEL » pour résoudre le lookup', () => {
    const opts = { centres_profit: [{ id: 'cep22', value: '22PF' }] };
    const p = buildFichePayload({ centre_profit: '22PF — PAT : Produits finis' }, { sapOptions: opts });
    expect(p['cr04e_Centredeprofit@odata.bind']).toBe('/cr04e_centredeprofitcepcts(cep22)');
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

  it('persiste l’ancien n° article (MARA-BISMT / ProductOldID)', () => {
    expect(buildFichePayload({ ancien_numero_article: '8779' }).cr04e_anciennarticle).toBe('8779');
    expect(toFicheShape({ cr04e_anciennarticle: '8779' }).ancien_numero_article).toBe('8779');
  });

  it('persiste la désignation normalisée', () => {
    expect(buildFichePayload({ design_normalisee: 'TARTE POMME 400G' }).cr04e_designnormalisee)
      .toBe('TARTE POMME 400G');
    expect(toFicheShape({ cr04e_designnormalisee: 'TARTE POMME 400G' }).design_normalisee)
      .toBe('TARTE POMME 400G');
  });

  it('écrit la nomenclature douanière dans la nouvelle colonne (et l’ancienne)', () => {
    const p = buildFichePayload({ nomenclature_douaniere: '19059030' });
    expect(p.cr04e_nomenclature_douaniere).toBe('19059030');
    expect(p.cr04e_nomenclaturedouaniere).toBe('19059030');
  });

  it('ne pousse que le code pour nomenclature / type d’usine / éclatement', () => {
    // Valeurs historiques enregistrées en toutes lettres : nettoyées à l’écriture.
    expect(buildFichePayload({ nomenclature_douaniere: '19059030 = Plaques de pain : sucre <5%' })
      .cr04e_nomenclature_douaniere).toBe('19059030');
    expect(buildFichePayload({ type_usine: 'Z004 - Carcassonne' }).cr04e_typedusine).toBe('Z004');
    expect(buildFichePayload({ eclatement_groupe_marchandise: '00100 - Pâtisseries' })
      .cr04e_eclatementgroupedemarchandise).toBe('00100');
    // Une valeur déjà réduite au code passe inchangée.
    expect(buildFichePayload({ type_usine: 'Z008' }).cr04e_typedusine).toBe('Z008');
  });

  it('ne pousse que le code pour le groupe d’imputation (séparateur sans espaces)', () => {
    expect(buildFichePayload({ groupe_imputation: '01-produits finis' })
      .cr04e_oc2groupeimputationarticle).toBe('01');
    expect(buildFichePayload({ groupe_imputation: '05' })
      .cr04e_oc2groupeimputationarticle).toBe('05');
  });

  it('lit la nomenclature : nouvelle colonne d’abord, repli sur l’ancienne', () => {
    expect(toFicheShape({ cr04e_nomenclature_douaniere: 'NEW', cr04e_nomenclaturedouaniere: 'OLD' })
      .nomenclature_douaniere).toBe('NEW');
    expect(toFicheShape({ cr04e_nomenclature_douaniere: '', cr04e_nomenclaturedouaniere: 'OLD' })
      .nomenclature_douaniere).toBe('OLD');
  });

  it("pousse le nombre d'UC / palette depuis le bloc palette (ligne Palette, colonne Unité)", () => {
    expect(buildFichePayload({ palette_block: { unite: 48 } }).cr04e_nombreducpalette).toBe('48');
    // Palette vidée -> colonne effacée
    expect(buildFichePayload({ palette_block: { unite: null } }).cr04e_nombreducpalette).toBe('');
    // Palette absente du patch -> colonne non touchée
    expect('cr04e_nombreducpalette' in buildFichePayload({ libelle_long_40: 'X' })).toBe(false);
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

describe('isPhaseFL', () => {
  it('ouvre la FL pour une DE validée, une DS validée et un article déjà créé', () => {
    expect(isPhaseFL('dl_validee')).toBe(true);
    expect(isPhaseFL('ds_validee')).toBe(true);
    expect(isPhaseFL('fl_sap_cree')).toBe(true);
  });

  it('exclut les phases amont et les demandes refusées', () => {
    for (const s of ['de_brouillon', 'de_attente_cc', 'dl_attente_validation_cdg',
                     'dl_refusee', 'ds_brouillon', 'ds_attente_cc', '', undefined]) {
      expect(isPhaseFL(s)).toBe(false);
    }
  });
});
