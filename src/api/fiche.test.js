import { describe, it, expect } from 'vitest';
import {
  toFicheShape, buildFichePayload, toFicheListShape, isPhaseFL,
  demandeOrigine, valeursDemande, appliquerHeritage, patchHeritage,
} from './fiche';

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

  it('ne pousse que le motif de date pour les formats étiquette (retire le préfixe « N - »)', () => {
    expect(buildFichePayload({ format_date_etiquette_colis: '2 - JJ MM AA' })
      .cr04e_formatdateetiquettecolis).toBe('JJ MM AA');
    expect(buildFichePayload({ format_dluo_etiquette_colis: '1 - JJ MM AAAA' })
      .cr04e_formatdluoetiquettecolis).toBe('JJ MM AAAA');
    // Une valeur sans préfixe numérique passe inchangée.
    expect(buildFichePayload({ format_date_etiquette_colis: 'JJ MM AA' })
      .cr04e_formatdateetiquettecolis).toBe('JJ MM AA');
  });

  it('GTIN du tableau repoussés dans les colonnes EAN du projet (un GTIN peut changer)', () => {
    const p = buildFichePayload({ colis_block: { unite: 12, gtin: ' 03251511124991 ' } });
    expect(p.cr04e_eancar).toBe('03251511124991');
    // GTIN vidé -> colonne vidée ; bloc sans clé gtin -> colonne non touchée.
    expect(buildFichePayload({ couche_block: { gtin: null } }).cr04e_eanzco).toBe('');
    expect('cr04e_eanpal' in buildFichePayload({ palette_block: { unite: 48 } })).toBe(false);
    // L'UVC et l'unité d'élément n'ont pas de colonne EAN projet.
    const autres = buildFichePayload({ uvc_block: { gtin: '3251511124007' }, element_block: { unite: 4 } });
    expect(Object.keys(autres).some((k) => k.startsWith('cr04e_ean'))).toBe(false);
  });

  it('secteur d’activité : code seul en lecture et en écriture (comme la DE/DS)', () => {
    expect(toFicheShape({ cr04e_secteurdactivite: '15' }).secteur_activite).toBe('15');
    expect(toFicheShape({ cr04e_secteurdactivite: '15 - Marques Distrib.' }).secteur_activite).toBe('15');
    expect(buildFichePayload({ secteur_activite: '15 - Marques Distrib.' }).cr04e_secteurdactivite).toBe('15');
    expect(buildFichePayload({ secteur_activite: '12' }).cr04e_secteurdactivite).toBe('12');
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
      // Usine dérivée de la division (valeur formatée du lookup), pas du champ …name.
      [`_cr04e_divisionusine_value${FMT}`]: '2886',
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

  it('dérive l\'usine de la division : négoce (2820) et repli import beCPG', () => {
    expect(toFicheListShape({ [`_cr04e_divisionusine_value${FMT}`]: '2820' }).usine).toBe('Produit négoce');
    expect(toFicheListShape({ cr04e_divisionimport: 'RIVESALTES' }).usine).toBe('Rivesaltes');
    expect(toFicheListShape({}).usine).toBe('');
  });
});

describe('reprise DE/DS -> FL', () => {
  const projetDE = {
    cr04e_statut_en_cours: 'dl_validee',
    cr04e_typedeproduit: 'PFIN',
    cr04e_poidsnet: 0.45,
    [`_cr04e_divisionusine_value${FMT}`]: '2886',
  };

  it('demandeOrigine : DS si statut ds_* ou activité DS, sinon DE', () => {
    expect(demandeOrigine(projetDE)).toBe('DE');
    expect(demandeOrigine({ cr04e_statut_en_cours: 'ds_validee' })).toBe('DS');
    // Article créé : le statut ne dit plus rien, l'activité DS tranche.
    expect(demandeOrigine({ cr04e_statut_en_cours: 'fl_sap_cree', cr04e_activite_ds: 'TRAITEUR' })).toBe('DS');
    expect(toFicheShape(projetDE).demande).toBe('DE');
  });

  it('valeursDemande : origine, type d’usine, groupe imputation et poids net depuis la demande', () => {
    expect(valeursDemande(projetDE)).toEqual({
      origine_fabrication: '2886',
      type_usine: 'Z008', // règle division (Bonloc) faute de ligne divisionprojet
      groupe_imputation: '01',
      groupe_statistique_article: '1', // règle atelier : toujours 1
      poids_net_uvc: 0.45,
    });
  });

  it('valeursDemande : négoce -> pas d’origine (entrepôt), profil lu sur la division-projet, imputation 05', () => {
    const v = valeursDemande(
      { cr04e_typedeproduit: 'NEGO', [`_cr04e_divisionusine_value${FMT}`]: '2820' },
      { profilFabricRepet: 'Z010' },
    );
    expect(v.origine_fabrication).toBeUndefined();
    expect(v.type_usine).toBe('Z010');
    expect(v.groupe_imputation).toBe('05');
    expect(v.poids_net_uvc).toBeUndefined();
  });

  it('appliquerHeritage : complète les champs vides, jamais une saisie FL', () => {
    const fiche = { origine_fabrication: '', type_usine: 'Z004', uvc_block: { unite: 1 } };
    appliquerHeritage(fiche, valeursDemande(projetDE));
    expect(fiche.origine_fabrication).toBe('2886');
    expect(fiche.type_usine).toBe('Z004'); // saisie FL conservée
    expect(fiche.groupe_imputation).toBe('01');
    expect(fiche.groupe_statistique_article).toBe('1'); // règle atelier : toujours 1
    expect(fiche.uvc_block).toEqual({ unite: 1, poids_net: 0.45 });
    // Chaque champ repris porte la section qui l'écrira au visa.
    expect(fiche.herite).toEqual({
      origine_fabrication: 'com',
      groupe_imputation: 'sc',
      groupe_statistique_article: 'sc',
      uvc_block: 'ind',
    });
  });

  it('DS : le code division d’origine prime sur la division de fabrication', () => {
    const v = valeursDemande({ cr04e_codedivisionorigine: '2823', [`_cr04e_divisionusine_value${FMT}`]: '2847' });
    expect(v.origine_fabrication).toBe('2823');
  });

  it('EAN déjà en base -> GTIN colis/couche/palette présélectionnés, écrits au visa Commerce', () => {
    const projet = { ...projetDE, cr04e_eancar: '03251511124014', cr04e_eanzco: '03251511124021', cr04e_eanpal: '' };
    const fiche = appliquerHeritage({ colis_block: { unite: 12 } }, valeursDemande(projet));
    expect(fiche.colis_block).toEqual({ unite: 12, gtin: '03251511124014' });
    expect(fiche.couche_block).toEqual({ gtin: '03251511124021' });
    expect(fiche.palette_block).toBeUndefined(); // EAN vide en base
    expect(patchHeritage(fiche, 'com')).toMatchObject({
      colis_block: { unite: 12, gtin: '03251511124014' },
      couche_block: { gtin: '03251511124021' },
    });
    // GTIN déjà saisi ou visa Commerce posé : rien n'est repris.
    const saisi = appliquerHeritage({ colis_block: { gtin: '999' } }, valeursDemande(projet));
    expect(saisi.colis_block.gtin).toBe('999');
    const visee = appliquerHeritage({ visa_commerce: true }, valeursDemande(projet));
    expect(visee.couche_block).toBeUndefined();
  });

  it('formats date / DLUO stockés sans numéro -> option de la liste présélectionnée', () => {
    const f = toFicheShape({
      cr04e_formatdateetiquettecolis: 'JJ MM AA',
      cr04e_formatdluoetiquettecolis: '1 - JJ MM AAAA',
    });
    expect(f.format_date_etiquette_colis).toBe('2 - JJ MM AA');
    expect(f.format_dluo_etiquette_colis).toBe('1 - JJ MM AAAA');
    expect(toFicheShape({ cr04e_formatdateetiquettecolis: 'AUTRE' }).format_date_etiquette_colis).toBe('AUTRE');
  });

  it('appliquerHeritage : rien sur une section visée ni sur un article créé', () => {
    const visee = appliquerHeritage({ visa_commerce: true, visa_industriel: true }, valeursDemande(projetDE));
    expect(visee.origine_fabrication).toBeUndefined();
    expect(visee.uvc_block).toBeUndefined();
    expect(visee.groupe_imputation).toBe('01'); // ADV non visée
    const creee = appliquerHeritage({ statut_sap: 'Création SAP effectuée' }, valeursDemande(projetDE));
    expect(creee.herite).toEqual({});
  });

  it('patchHeritage : ne renvoie que les champs repris de la section visée', () => {
    const fiche = appliquerHeritage({}, valeursDemande(projetDE));
    expect(patchHeritage(fiche, 'com')).toEqual({ origine_fabrication: '2886' });
    expect(patchHeritage(fiche, 'sc')).toEqual({ groupe_imputation: '01', groupe_statistique_article: '1' });
    expect(patchHeritage(fiche, 'ind')).toEqual({ type_usine: 'Z008', uvc_block: { poids_net: 0.45 } });
    expect(patchHeritage({}, 'com')).toEqual({});
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
