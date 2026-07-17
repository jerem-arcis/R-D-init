import { describe, it, expect } from 'vitest';
import { ficheFromProjet } from './flFromProjet';
import { buildEANSet } from './ean';

describe('ficheFromProjet', () => {
  it('hérite identité + code projet du projet Dataverse', () => {
    const f = ficheFromProjet({
      code_chapeau: '748301',
      code_projet: 'PJ5001',
      designation_article: 'Cookie Ube',
    });
    expect(f.code_article).toBe('748301');
    expect(f.code_chapeau).toBe('748301');
    expect(f.libelle_article).toBe('Cookie Ube');
    expect(f.code_etude_rd).toBe('PJ5001');
    expect(f.demande_etude_id).toBeNull();
  });

  it('génère les EAN via la règle GS1 (format tableau)', () => {
    const f = ficheFromProjet({ code_chapeau: '748301' });
    const eans = buildEANSet('748301');
    expect(f.ean_couche).toEqual([eans.ean_couche]);
    expect(f.ean_carton).toEqual([eans.ean_carton]);
    expect(f.ean_palette).toEqual([eans.ean_palette]);
  });

  it('n’ajoute pas d’EAN si le code chapeau a moins de 4 chiffres', () => {
    const f = ficheFromProjet({ code_chapeau: '74' });
    expect(f.ean_couche).toBeUndefined();
    expect(f.ean_carton).toBeUndefined();
    expect(f.ean_palette).toBeUndefined();
  });

  it('reprend la désignation et l’id de la DE locale en repli', () => {
    const f = ficheFromProjet(
      { code_chapeau: '748301', code_projet: '' },
      { id: 'de-local-1', autre_designation: 'Désignation DS' },
    );
    expect(f.libelle_article).toBe('Désignation DS');
    expect(f.demande_etude_id).toBe('de-local-1');
  });
});
