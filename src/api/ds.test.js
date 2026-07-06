import { describe, it, expect } from 'vitest';
import { buildDsPayload, DS_STATUTS } from './ds';

const sapOptions = {
  divisions: [{ id: 'dBon', value: '2886' }, { id: 'dAire', value: '2859' }],
  classes_valorisation: [{ id: 'c7012', value: '7012' }, { id: 'c2038', value: '2038' }],
  familles_produit: [{ id: 'h22', value: '22 DE DE DE' }],
  centres_profit: [{ id: 'cp22', value: '22PF' }],
};

const base = {
  autre_demandeur: 'Jean',
  autre_date: '2026-07-02',
  autre_service: 'Marketing',
  autre_type_demande: '1',
  autre_description: 'Besoin X',
  autre_code_origine: '12345678',
  autre_usine_origine: 'Aire',
  autre_designation: 'Tarte test',
  autre_usine_fab: 'Bonloc',
  autre_activite: 'PATISSERIES',
  autre_poids_net_uv: '0.25',
  autre_type_marque: 'Marque Nationale GMS',
  code_chapeau: '741603',
};

describe('DS_STATUTS', () => {
  it('liste les 3 statuts DS', () => {
    expect(DS_STATUTS).toEqual(['ds_brouillon', 'ds_attente_cc', 'ds_validee']);
  });
});

describe('buildDsPayload', () => {
  it('mappe les champs + calculs + nouvelles colonnes', () => {
    const p = buildDsPayload(base, { sapOptions, statut: 'ds_attente_cc' });
    expect(p.cr04e_demandeur).toBe('Jean');
    expect(p.cr04e_datedelademande).toBe('2026-07-02');
    expect(p.cr04e_typedelademande).toBe('1');
    expect(p.cr04e_nomduproduitdesignation).toBe('Tarte test');
    expect(p.cr04e_poidsnet).toBe(0.25);
    expect(p.cr04e_codeprojet).toBe('12345678'); // code article origine
    expect(p.cr04e_codechapeau).toBe('741603');
    expect(p.cr04e_statut_en_cours).toBe('ds_attente_cc');
    // calculs
    expect(p.cr04e_secteurdactivite).toBe('12'); // GMS
    expect(p.cr04e_codedivisionorigine).toBe('2859'); // Aire origine
    expect(p.cr04e_service).toBe('Marketing');
    expect(p.cr04e_descriptiondubesoin).toBe('Besoin X');
    expect(p.cr04e_activite_ds).toBe('PATISSERIES');
    // lookups résolus
    expect(p['cr04e_DivisionUsine@odata.bind']).toBe('/cr04e_divisionusines(dBon)'); // fab Bonloc
    expect(p['cr04e_Classedevalorisation@odata.bind']).toBe('/cr04e_classedevalorisations(c7012)');
    expect(p['cr04e_Hierarchieproduitfamille@odata.bind']).toBe('/cr04e_hierarchieproduitfamilles(h22)');
    expect(p['cr04e_Centredeprofit@odata.bind']).toBe('/cr04e_centredeprofitcepcts(cp22)'); // Bonloc → 22PF
  });

  it('omet les lookups non résolus et les champs vides', () => {
    const p = buildDsPayload({ autre_designation: 'X' }, { sapOptions, statut: 'ds_brouillon' });
    expect(p['cr04e_DivisionUsine@odata.bind']).toBeUndefined();
    expect(p.cr04e_demandeur).toBeUndefined();
    expect(p.cr04e_statut_en_cours).toBe('ds_brouillon');
  });

  it('un override manuel (_ds_*_ovr) gagne sur la valeur calculée', () => {
    // Phase de dev : champ auto-calculé débloqué puis saisi à la main.
    const p = buildDsPayload(
      { ...base, _ds_secteur_ovr: '99', _ds_classe_valo_ovr: '2038' },
      { sapOptions, statut: 'ds_attente_cc' },
    );
    expect(p.cr04e_secteurdactivite).toBe('99'); // override, pas le '12' calculé
    expect(p['cr04e_Classedevalorisation@odata.bind']).toBe('/cr04e_classedevalorisations(c2038)'); // 2038 forcé
  });
});
