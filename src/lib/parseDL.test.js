import { describe, it, expect } from 'vitest';
import {
  parseSharedStrings,
  parseSheetCells,
  resolveSheetTarget,
} from './xlsxLite';
import { extractDLChamps, parseDLFromEntries } from './parseDL';

describe('parseSharedStrings', () => {
  it('lit les chaînes partagées et décode les entités', () => {
    const xml =
      '<sst><si><t>Quantités</t></si><si><t>Coûts R&amp;D</t></si><si><t xml:space="preserve"> Mise à dispo </t></si></sst>';
    expect(parseSharedStrings(xml)).toEqual(['Quantités', 'Coûts R&D', ' Mise à dispo ']);
  });
  it('renvoie un tableau vide sans XML', () => {
    expect(parseSharedStrings('')).toEqual([]);
  });
});

describe('parseSheetCells', () => {
  const shared = ['Quantités prévisionnelles', 'Prix 3Net'];
  it('résout chaînes partagées, inline et nombres', () => {
    const xml = `<sheetData>
      <row r="7"><c r="G7" t="s"><v>0</v></c><c r="H7"><v>40000</v></c><c r="I7"><v>0</v></c></row>
      <row r="9"><c r="G9" t="inlineStr"><is><t>Prix /kg</t></is></c><c r="H9"><v>75.33</v></c></row>
    </sheetData>`;
    const cells = parseSheetCells(xml, shared);
    expect(cells.G7).toBe('Quantités prévisionnelles');
    expect(cells.H7).toBe('40000');
    expect(cells.I7).toBe('0');
    expect(cells.G9).toBe('Prix /kg');
    expect(cells.H9).toBe('75.33');
  });
});

describe('resolveSheetTarget', () => {
  it('relie le nom de feuille à son fichier via les rels', () => {
    const wb = '<workbook><sheets><sheet name="Fiche Demande" sheetId="1" r:id="rId1"/><sheet name="Autre" sheetId="2" r:id="rId2"/></sheets></workbook>';
    const rels = '<Relationships><Relationship Id="rId2" Target="worksheets/sheet2.xml"/><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>';
    expect(resolveSheetTarget(wb, rels, 'Fiche Demande')).toBe('worksheets/sheet1.xml');
    expect(resolveSheetTarget(wb, rels, 'Inexistante')).toBeNull();
  });
});

describe('extractDLChamps', () => {
  it('extrait (libellé G, valeur DE H, valeur DL I) pour les lignes renseignées', () => {
    const cells = {
      G7: 'Quantités prévisionnelles (UV)', H7: '40000', I7: '0',
      G9: 'Prix 3Net /uv', H9: '4.5199999999999996', I9: '0',
      G10: 'Prix 3Net /kg', H10: '75.333333333333329', // pas de I -> dl vide
      H11: '999', // pas de G -> ignoré
    };
    const champs = extractDLChamps(cells, 12);
    expect(champs).toEqual([
      { ligne: 'Quantités prévisionnelles (UV)', de: '40000', dl: '0' },
      { ligne: 'Prix 3Net /uv', de: '4,52', dl: '0' },
      { ligne: 'Prix 3Net /kg', de: '75,33', dl: '' },
    ]);
  });

  it("s'arrête à « Mise à dispo Client », exclut l'en-tête et ajoute les lignes DL de la colonne H", () => {
    const cells = {
      G7: 'Quantités prévisionnelles (UV)', H7: '40000', I7: '0',
      G29: 'Dates Rétro-Planning du lancement ', I29: 'Avis R&D', // en-tête -> exclu
      G30: ' Echantillon/Prix/FSP',
      G31: ' Mise à dispo Client',
      H32: 'pour DL seulement : Date 1ère Fabrication',
      H33: 'pour DL seulement : Date 1ère livraison',
      G35: 'Commentaires s/Faisabilité & Respect des délais', // après la fin -> ignoré
      G60: 'Notation du projet - Méthode 2017', // après la fin -> ignoré
    };
    expect(extractDLChamps(cells, 70)).toEqual([
      { ligne: 'Quantités prévisionnelles (UV)', de: '40000', dl: '0' },
      { ligne: 'Echantillon/Prix/FSP', de: '', dl: '' },
      { ligne: 'Mise à dispo Client', de: '', dl: '' },
      { ligne: 'pour DL seulement : Date 1ère Fabrication', de: '', dl: '' },
      { ligne: 'pour DL seulement : Date 1ère livraison', de: '', dl: '' },
    ]);
  });
});

describe('parseDLFromEntries', () => {
  it('assemble le pipeline complet depuis des entrées XML décompressées', () => {
    const champs = parseDLFromEntries({
      workbookXml: '<workbook><sheets><sheet name="Fiche Demande" sheetId="1" r:id="rId1"/></sheets></workbook>',
      relsXml: '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
      sharedStringsXml: '<sst><si><t>Total Mcv Demande</t></si></sst>',
      sheets: {
        'xl/worksheets/sheet1.xml': '<sheetData><row r="14"><c r="G14" t="s"><v>0</v></c><c r="H14"><v>50800</v></c><c r="I14"><v>0</v></c></row></sheetData>',
      },
    });
    expect(champs.feuille).toBe('Fiche Demande');
    expect(champs.champs).toEqual([{ ligne: 'Total Mcv Demande', de: '50800', dl: '0' }]);
  });
});
