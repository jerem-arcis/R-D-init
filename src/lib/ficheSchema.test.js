import { describe, it, expect } from 'vitest';
import {
  getMissingVisaFields,
  EMBALLAGE_BLOCK_FIELDS,
  hierarchieActivite,
  isHierarchiePlaceholder,
  GROUPES_ARTICLE,
  GROUPES_RISTOURNE,
  GROUPES_STATISTIQUE,
  GROUPES_IMPUTATION,
  codeSecteur,
  optionsSecteur,
} from './ficheSchema';

// Champs visibles (non retirés, hors blocs emballage) par section, tous remplis.
const filledFiche = {
  // SC
  groupe_article: 'BA',
  groupe_ristourne: 'R1',
  groupe_imputation: 'I1',
  groupe_statistique_article: 'S1',
  // IND (hors blocs emballage)
  libelle_etiquette_colis: 'x',
  masque_etiquette_colis: 'x',
  designation_client_colis: 'x',
  eclatement_groupe_marchandise: 'x',
  type_usine: 'x',
  type_palette: 'x',
  duree_vie: '12',
  temps_reception_usine: '2',
  format_date_etiquette_colis: 'x',
  format_dluo_etiquette_colis: 'x',
  type_magasin: 'x',
  ancien_numero_article: 'x',
  // COM
  design_normalisee: 'x',
  libelle_long_40: 'x',
  libelle_caisse: 'x',
  libelle_par_pays: [{ pays: 'FR', libelle: 'x' }],
  hierarchie_produit: 'x',
  origine_fabrication: '2886',
  canaux_distribution: ['01'],
  secteur_activite: 'x',
  marque: 'x',
  nomenclature_douaniere: 'x',
  sites_stockage: ['2820'],
};

describe('getMissingVisaFields', () => {
  it('fiche complète -> aucun champ manquant, quelle que soit la section', () => {
    expect(getMissingVisaFields(filledFiche, 'sc')).toEqual([]);
    expect(getMissingVisaFields(filledFiche, 'ind')).toEqual([]);
    expect(getMissingVisaFields(filledFiche, 'com')).toEqual([]);
  });

  it('SC : liste les champs Supply Chain vides', () => {
    const names = getMissingVisaFields({}, 'sc').map((m) => m.name);
    expect(names).toEqual(
      expect.arrayContaining(['groupe_article', 'groupe_ristourne', 'groupe_imputation', 'groupe_statistique_article']),
    );
    // Un champ d'une autre section ne remonte pas côté SC.
    expect(names).not.toContain('marque');
  });

  it('IND : le tableau Emballages (5 blocs) est exempté même vide', () => {
    const fiche = { ...filledFiche };
    EMBALLAGE_BLOCK_FIELDS.forEach((k) => { fiche[k] = undefined; });
    expect(getMissingVisaFields(fiche, 'ind')).toEqual([]);
  });

  it('IND : un champ industriel hors emballage reste requis', () => {
    const fiche = { ...filledFiche, type_usine: '' };
    const names = getMissingVisaFields(fiche, 'ind').map((m) => m.name);
    expect(names).toEqual(['type_usine']);
  });

  it('COM : un multi-select vide (tableau) compte comme manquant', () => {
    const vide = getMissingVisaFields({ ...filledFiche, canaux_distribution: [] }, 'com').map((m) => m.name);
    expect(vide).toContain('canaux_distribution');
    const rempli = getMissingVisaFields({ ...filledFiche, canaux_distribution: ['01'] }, 'com').map((m) => m.name);
    expect(rempli).not.toContain('canaux_distribution');
  });

  it('chaque champ manquant porte un libellé lisible', () => {
    const m = getMissingVisaFields({}, 'com').find((f) => f.name === 'canaux_distribution');
    expect(m.label).toBe('Canaux de distribution');
  });

  it('fiche ou section absente -> []', () => {
    expect(getMissingVisaFields(null, 'sc')).toEqual([]);
    expect(getMissingVisaFields({}, null)).toEqual([]);
  });

  it('COM : hiérarchie encore au gabarit « XX DE DE » compte comme manquant', () => {
    for (const h of ['27 DE DE DE', '22\tDE\tDE', '21 DE']) {
      const m = getMissingVisaFields({ ...filledFiche, hierarchie_produit: h }, 'com')
        .find((f) => f.name === 'hierarchie_produit');
      expect(m, `placeholder ${JSON.stringify(h)}`).toBeTruthy();
      expect(m.label).toMatch(/à préciser/);
    }
    // Une vraie famille (segments ≠ DE) ne bloque pas.
    const ok = getMissingVisaFields({ ...filledFiche, hierarchie_produit: '27 D4 10 DM' }, 'com')
      .map((f) => f.name);
    expect(ok).not.toContain('hierarchie_produit');
  });
});

describe('listes OC2 (groupements ADV) alimentées depuis ListesSAP', () => {
  it('tailles attendues (ListesSAP + option « 1 » en tête : article 73, ristourne 70)', () => {
    expect(GROUPES_STATISTIQUE).toHaveLength(35);
    expect(GROUPES_ARTICLE).toHaveLength(73);
    expect(GROUPES_RISTOURNE).toHaveLength(70);
    expect(GROUPES_IMPUTATION).toHaveLength(2);
  });

  it('article/ristourne : value = code sur 2 car. (stocké/envoyé), label = libellé complet (affiché)', () => {
    // Toutes les entrées sont des objets { value, label } et le code fait 2 caractères.
    expect(GROUPES_ARTICLE.every((o) => typeof o === 'object' && o.value.length === 2)).toBe(true);
    expect(GROUPES_RISTOURNE.every((o) => typeof o === 'object' && o.value.length === 2)).toBe(true);
    expect(GROUPES_ARTICLE[0]).toEqual({ value: '01', label: '01', keywords: '01' });
    expect(GROUPES_RISTOURNE[0]).toEqual({ value: '01', label: '01', keywords: '01' });
    expect(GROUPES_ARTICLE).toContainEqual({ value: 'AY', label: 'AY-MB INTERMARCHE', keywords: 'AY-MB INTERMARCHE' });
    expect(GROUPES_RISTOURNE).toContainEqual({ value: 'AY', label: 'AY-MB INTERMARCHE', keywords: 'AY-MB INTERMARCHE' });
  });

  it('statistique : value = code seul (envoyé), label = libellé Excel (affiché)', () => {
    expect(GROUPES_STATISTIQUE[0]).toEqual({ value: '1', label: '1-Groupe article 1' });
    // Les codes sont bien 1..9 puis A..Z (aucun libellé complet côté value).
    expect(GROUPES_STATISTIQUE.map((o) => o.value)).toContain('Z');
    expect(GROUPES_STATISTIQUE.every((o) => o.value.length === 1)).toBe(true);
  });
});

describe('hierarchieActivite', () => {
  it('renvoie les 2 chiffres de tête', () => {
    expect(hierarchieActivite('27 DE DE DE')).toBe('27');
    expect(hierarchieActivite('21\tDE\tDE')).toBe('21');
    expect(hierarchieActivite('22 D4 10 DM')).toBe('22');
  });
  it('vide / sans code -> chaîne vide', () => {
    expect(hierarchieActivite('')).toBe('');
    expect(hierarchieActivite(null)).toBe('');
    expect(hierarchieActivite('DE DE')).toBe('');
  });
});

describe('isHierarchiePlaceholder', () => {
  it('vrai pour un gabarit « XX DE DE » (tabulations, \\t littéraux ou espaces)', () => {
    expect(isHierarchiePlaceholder('27 DE DE DE')).toBe(true);
    expect(isHierarchiePlaceholder('22\tDE\tDE')).toBe(true);
    expect(isHierarchiePlaceholder('21\\tDE\\tDE')).toBe(true);
    expect(isHierarchiePlaceholder('27 de')).toBe(true); // insensible à la casse
  });
  it('faux pour une vraie famille ou une valeur vide/partielle', () => {
    expect(isHierarchiePlaceholder('27 D4 10 DM')).toBe(false);
    expect(isHierarchiePlaceholder('27')).toBe(false); // activité seule
    expect(isHierarchiePlaceholder('')).toBe(false);
    expect(isHierarchiePlaceholder(null)).toBe(false);
  });
});

describe('secteur d’activité (code DE/DS <-> choix de la liste Admin)', () => {
  it('codeSecteur : code de tête, sinon valeur inchangée', () => {
    expect(codeSecteur('15 - Marques Distrib.')).toBe('15');
    expect(codeSecteur('10 · Marque Nationale GMS')).toBe('10');
    expect(codeSecteur('15')).toBe('15');
    expect(codeSecteur('Boncolac')).toBe('Boncolac');
    expect(codeSecteur(null)).toBe('');
  });

  it('optionsSecteur : le code « 15 » en base présélectionne « 15 - Marques Distrib. », sans doublon', () => {
    const rows = [
      { value: '10 - Marque Nationale GMS', designation: '' },
      { value: '15 - Marques Distrib.', designation: '' },
    ];
    const opts = optionsSecteur(rows, '15');
    expect(opts).toEqual([
      { value: '10', label: '10 - Marque Nationale GMS', keywords: '10 - Marque Nationale GMS' },
      { value: '15', label: '15 - Marques Distrib.', keywords: '15 - Marques Distrib.' },
    ]);
  });

  it('optionsSecteur : code + désignation séparés, et valeur inconnue conservée', () => {
    const opts = optionsSecteur([{ value: '12', designation: 'GDM' }], '99');
    expect(opts.map((o) => [o.value, o.label])).toEqual([['12', '12 - GDM'], ['99', '99']]);
  });
});
