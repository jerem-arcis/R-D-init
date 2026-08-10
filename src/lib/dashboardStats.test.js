import { describe, it, expect } from 'vitest';
import {
  filterProjets, computeKpis, byStatut, byMonth, byOrg, byUsine, listStatuts,
} from './dashboardStats';

const P = [
  { id: 1, type_de: 'de', organisation: '1000', organisation_label: 'France GMS', statut: 'dl_validee', usine_validee: 'Bonloc', created_date: '2026-01-10' },
  { id: 2, type_de: 'de', organisation: '1000', organisation_label: 'France GMS', statut: 'de_attente_cc', usine_validee: 'Agen', created_date: '2026-01-20' },
  { id: 3, type_de: 'ds', organisation: '2000', organisation_label: 'Export', statut: 'ds_validee', usine_validee: 'Bonloc', created_date: '2026-02-05' },
  { id: 4, type_de: 'de', organisation: '3000', organisation_label: 'RHF', statut: 'dl_refusee', usine_validee: 'Aire', created_date: '2026-02-15' },
  { id: 5, type_de: 'ds', organisation: '1000', organisation_label: 'France GMS', statut: 'ds_attente_cc', usine_validee: 'Produit négoce', created_date: '2026-03-01' },
];

describe('filterProjets', () => {
  it('sans critère, renvoie tout', () => {
    expect(filterProjets(P)).toHaveLength(5);
  });
  it('filtre par organisation (multi)', () => {
    expect(filterProjets(P, { orgs: ['1000'] }).map((p) => p.id)).toEqual([1, 2, 5]);
    expect(filterProjets(P, { orgs: ['2000', '3000'] }).map((p) => p.id)).toEqual([3, 4]);
  });
  it('filtre par type et par usine', () => {
    expect(filterProjets(P, { type: 'ds' }).map((p) => p.id)).toEqual([3, 5]);
    expect(filterProjets(P, { usine: 'Bonloc' }).map((p) => p.id)).toEqual([1, 3]);
  });
  it('filtre par plage de dates', () => {
    expect(filterProjets(P, { dateFrom: '2026-02-01', dateTo: '2026-02-28' }).map((p) => p.id)).toEqual([3, 4]);
  });
  it('filtre par statut (groupe de libellé) : couvre DE + DS', () => {
    // id2 = de_attente_cc, id5 = ds_attente_cc → même libellé.
    const r = filterProjets(P, { statut: 'En attente de code chapeau' });
    expect(r.map((p) => p.id).sort()).toEqual([2, 5]);
  });
});

describe('computeKpis', () => {
  it('compte en cours / validées / refusées / attente CC + taux', () => {
    const k = computeKpis(P);
    expect(k.total).toBe(5);
    expect(k.enCours).toBe(2); // de_attente_cc + ds_attente_cc
    expect(k.validees).toBe(2); // dl_validee + ds_validee
    expect(k.refusees).toBe(1);
    expect(k.attenteCC).toBe(2);
    expect(k.tauxValidation).toBe(67); // 2 / (2+1)
  });
});

describe('byStatut', () => {
  it('regroupe par libellé et ordonne par order', () => {
    const r = byStatut(P);
    const attente = r.find((s) => s.label === 'En attente de code chapeau');
    expect(attente.value).toBe(2); // de_attente_cc + ds_attente_cc fusionnés
    const orders = r.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe('byMonth', () => {
  it('série mensuelle triée avec détail DE/DS', () => {
    const r = byMonth(P);
    expect(r.map((m) => m.ym)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(r[0]).toMatchObject({ de: 2, ds: 0, total: 2, label: 'janv.' });
    expect(r[1]).toMatchObject({ de: 1, ds: 1, total: 2, label: 'févr.' });
  });
});

describe('byOrg', () => {
  it('répartit par organisation commerciale', () => {
    const r = byOrg(P);
    expect(r).toEqual([
      { code: '1000', label: 'France GMS', value: 3 },
      { code: '2000', label: 'Export', value: 1 },
      { code: '3000', label: 'RHF', value: 1 },
    ]);
  });
  it('données sans org → « Non renseignée »', () => {
    const r = byOrg([{ statut: 'de_brouillon' }]);
    expect(r[0]).toMatchObject({ label: 'Non renseignée', value: 1 });
  });
});

describe('byUsine', () => {
  it('répartit par usine, décroissant', () => {
    const r = byUsine(P);
    expect(r[0]).toEqual({ usine: 'Bonloc', value: 2 });
  });
});

describe('listStatuts', () => {
  it('déduplique par libellé (pas de double « Brouillon » / « Attente »)', () => {
    // Deux statuts de même libellé ne doivent produire qu'une seule entrée.
    const data = [
      { statut: 'de_brouillon' }, { statut: 'ds_brouillon' },
      { statut: 'de_attente_cc' }, { statut: 'ds_attente_cc' },
      { statut: 'dl_validee' },
    ];
    const labels = listStatuts(data).map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length); // aucun doublon
    expect(labels.filter((l) => l === 'Brouillon')).toHaveLength(1);
    expect(labels).toContain('Validée');
  });
});
