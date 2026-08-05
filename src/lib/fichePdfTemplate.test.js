import { describe, it, expect } from 'vitest';
import { buildFichePdfHtml } from './fichePdfTemplate';

const DASH = '—';

describe('buildFichePdfHtml', () => {
  it('remplit les champs présents (fiche complète)', () => {
    const fiche = {
      code_article: '648900005',
      libelle_long_40: 'Tarte Citron Meringuée 6 parts 480g',
      marque: 'Boncolac',
      origine_fabrication: '3A - Produit Fini DFINI',
      ean_carton: ['03251511124014'],
      sites_stockage: ['2866 - Rivesaltes', '2886 - Bonloc'],
      duree_vie: 21,
      unite_duree_vie: 'J - Jours',
      secteur_activite: '10 - Marque Nationale GMS',
      centre_profit: '27TDL',
      uvc_block: { volume: 0.002, poids_net: 480, poids_brut: 0.51, long: 220, larg: 220, haut: 45 },
      colis_block: { long: 400, larg: 300, haut: 100 },
      visa_supply_chain: true,
      visa_supply_chain_date: '2026-06-20',
    };
    const de = { qte_previsionnelle_annuelle: 170000 };
    const html = buildFichePdfHtml(fiche, de);

    expect(html).toContain('Tarte Citron Meringuée 6 parts 480g');
    expect(html).toContain('Boncolac');
    expect(html).toContain('648900005'); // code racine (= code_article)
    expect(html).toContain('2866 - Rivesaltes');
    expect(html).toContain('21 J'); // durée de vie + 1er token unité
    expect(html).toContain('170000'); // Qté/an depuis la DE
    expect(html).toContain('220 × 220 × 45'); // dimensions UVC
    expect(html).toContain('Signé'); // visa Supply Chain posé
    // EAN → boîtes de chiffres (13 <span>)
    expect((html.match(/<span>\d<\/span>/g) || []).length).toBeGreaterThanOrEqual(13);
  });

  it('affiche « — » partout où la donnée est absente (fiche vide)', () => {
    const html = buildFichePdfHtml({}, null);
    expect(html).toContain(DASH);
    expect(html).toContain('non renseigné'); // EAN vide
    expect(html).toContain('En attente'); // visas non posés
    expect(html).toContain('Fiche de lancement'); // titre de repli
  });

  it('échappe le HTML des valeurs (anti-injection)', () => {
    const html = buildFichePdfHtml({ libelle_long_40: '<script>alert(1)</script>' }, null);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('affiche « 0 » et non « — » pour une valeur nulle numérique', () => {
    const html = buildFichePdfHtml({ uvc_block: { volume: 0 } }, null);
    expect(html).toContain('>0<');
  });
});
