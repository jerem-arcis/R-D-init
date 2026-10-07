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

  it('dérive usine_validee de la division (valeur formatée du lookup), pas du champ …name', () => {
    const FMT = '@OData.Community.Display.V1.FormattedValue';
    // Le champ `...name` du lookup revient null en prod : on ne doit PAS s'en servir.
    const bonloc = listShapeForTest({
      cr04e_projetid: '1',
      [`_cr04e_divisionusine_value${FMT}`]: '2886',
      cr04e_divisionusinename: null,
    });
    expect(bonloc.usine_validee).toBe('Bonloc');

    // Négoce (DS) : division 2820 -> « Produit négoce » (option du filtre usine).
    const negoce = listShapeForTest({
      cr04e_projetid: '2',
      [`_cr04e_divisionusine_value${FMT}`]: '2820',
    });
    expect(negoce.usine_validee).toBe('Produit négoce');

    // Repli sur la colonne d'import beCPG (nom de site) si le lookup est absent.
    const importe = listShapeForTest({ cr04e_projetid: '3', cr04e_divisionimport: 'RIVESALTES' });
    expect(importe.usine_validee).toBe('Rivesaltes');

    // Rien d'exploitable -> chaîne vide (pas de crash).
    expect(listShapeForTest({ cr04e_projetid: '4' }).usine_validee).toBe('');
  });

  it('remonte les statuts de flux SAP (texte) en passe-plat', () => {
    const abs = listShapeForTest({ cr04e_projetid: '1' });
    expect(abs.flux_envoi_de).toBeUndefined();
    expect(abs.flux_envoi_fl).toBeUndefined();

    const set = listShapeForTest({ cr04e_projetid: '2', cr04e_fluxenvoiede: 'reussi', cr04e_fluxenvoiefl: 'erreur' });
    expect(set.flux_envoi_de).toBe('reussi');
    expect(set.flux_envoi_fl).toBe('erreur');
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
  it('une DE = NEGO si division Aire (2859), sinon PFIN ; une DS = NEGO si type 4/5 ou usine d’origine contient Aire', () => {
    expect(buildProjetPayload({}).cr04e_typedeproduit).toBe('PFIN');
    // DE division Aire → NEGO (type article) ; autre division → PFIN.
    expect(buildProjetPayload({ division: '2859' }).cr04e_typedeproduit).toBe('NEGO');
    expect(buildProjetPayload({ division: '2886' }).cr04e_typedeproduit).toBe('PFIN');
    // Types 4/5 (négoce) → NEGO, quelle que soit l'usine.
    expect(buildDsPayload({ autre_type_demande: '4' }).cr04e_typedeproduit).toBe('NEGO');
    // Usine de fabrication d'origine contenant « Aire » → NEGO.
    expect(buildDsPayload({ autre_usine_origine: 'Aire' }).cr04e_typedeproduit).toBe('NEGO');
    // Autre type + origine hors Aire (ou rien) → produit fini.
    expect(buildDsPayload({ autre_type_demande: '1', autre_usine_origine: 'Agen' }).cr04e_typedeproduit).toBe('PFIN');
    expect(buildDsPayload({}).cr04e_typedeproduit).toBe('PFIN');
  });

  it('la valeur est posée quel que soit le statut (dont validation)', () => {
    expect(buildProjetPayload({}, { statut: 'dl_attente_validation_cdg' }).cr04e_typedeproduit).toBe('PFIN');
    expect(buildDsPayload({ autre_type_demande: '5' }, { statut: 'ds_validee' }).cr04e_typedeproduit).toBe('NEGO');
  });
});

describe('secteur d’activité (cr04e_secteurdactivite)', () => {
  it('persiste le secteur SAISI (marque) tel quel', () => {
    expect(buildProjetPayload({ marque: '10' }).cr04e_secteurdactivite).toBe('10');
  });

  it('à défaut de saisie, retombe sur le calcul réseau -> secteur (comme l’écran et la validation)', () => {
    // marque vide + réseau HSFC : le champ affiche « 15 » et la validation passe ;
    // la base doit recevoir « 15 », pas du vide.
    const p = buildProjetPayload({ marque: '', reseau: 'HSFC' });
    expect(p.cr04e_secteurdactivite).toBe('15');
  });

  it('la saisie prime sur le repli réseau', () => {
    const p = buildProjetPayload({ marque: '12', reseau: 'HSFC' });
    expect(p.cr04e_secteurdactivite).toBe('12');
  });

  it('ni saisie ni réseau exploitable : colonne omise', () => {
    expect('cr04e_secteurdactivite' in buildProjetPayload({})).toBe(false);
    expect('cr04e_secteurdactivite' in buildProjetPayload({ reseau: 'INCONNU' })).toBe(false);
  });
});

describe('groupe article (division) — lookup cr04e_Groupearticledivision', () => {
  const sapOptions = { groupes_article: [{ id: 'gpfb', value: 'PF-B' }, { id: 'gba', value: 'BA' }] };
  const BIND = 'cr04e_Groupearticledivision@odata.bind';

  it('lie le groupe article SAISI', () => {
    const p = buildProjetPayload({ groupe_article: 'BA' }, { sapOptions });
    expect(p[BIND]).toBe('/cr04e_groupearticledivisions(gba)');
  });

  it('à défaut, retombe sur le verrou division (Bonloc 2886 -> PF-B), comme la validation', () => {
    // groupe_article vide + division Bonloc : l'écran/validation utilisent PF-B ;
    // la base doit lier PF-B, pas omettre le lookup.
    const p = buildProjetPayload({ groupe_article: '', division: '2886' }, { sapOptions });
    expect(p[BIND]).toBe('/cr04e_groupearticledivisions(gpfb)');
  });

  it('division NON verrouillée (Agen/Aire) sans saisie : lookup omis (pas de repli)', () => {
    // Aire (2859) : groupe article libre, aucun verrou -> on n'invente pas de valeur.
    const p = buildProjetPayload({ groupe_article: '', division: '2859' }, { sapOptions });
    expect(BIND in p).toBe(false);
  });
});

describe('codes EAN écrits dans les colonnes projet (cr04e_eancar/eanzco/eanpal)', () => {
  it('DE : EAN calculés depuis le code chapeau (ctx.codeChapeau)', () => {
    const p = buildProjetPayload({}, { codeChapeau: '1124' });
    expect(p.cr04e_eancar).toBe('03251511124014'); // carton
    expect(p.cr04e_eanzco).toBe('03251511124021'); // couche
    expect(p.cr04e_eanpal).toBe('03251511124038'); // palette
  });
  it('DS : EAN calculés depuis le code chapeau (formData.code_chapeau)', () => {
    const p = buildDsPayload({ code_chapeau: '1124', autre_designation: 'X' });
    expect(p.cr04e_eancar).toBe('03251511124014');
    expect(p.cr04e_eanzco).toBe('03251511124021');
    expect(p.cr04e_eanpal).toBe('03251511124038');
  });
  it('sans code chapeau exploitable : colonnes EAN omises', () => {
    const p = buildProjetPayload({});
    expect('cr04e_eancar' in p).toBe(false);
    expect('cr04e_eanzco' in p).toBe(false);
    expect('cr04e_eanpal' in p).toBe(false);
  });
});
