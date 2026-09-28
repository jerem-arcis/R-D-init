import { describe, it, expect } from 'vitest';
import {
  filterDemandes,
  sortDemandes,
  listDemandeurs,
  getDemandeur,
  getUsine,
  localIdFor,
} from './demandesFilter';

// Jeu de données minimal couvrant DE, DS et « autre ».
const DEMANDES = [
  {
    id: 'a', type_de: 'de', statut: 'dl_validee', demandeur: 'Marie Lefèvre',
    designation_article: 'Éclair chocolat', code_projet: 'PJ5012',
    usine_validee: 'Bonloc', type_demande_de: 'CA Additionnel', created_date: '2026-06-04',
  },
  {
    id: 'b', type_de: 'de', statut: 'de_attente_cc', demandeur: 'Thomas Bernard',
    designation_article: 'Pain au chocolat', code_projet: 'PJ5044',
    usine_validee: 'Agen', created_date: '2026-07-04',
  },
  {
    id: 'c', type_de: 'ds', statut: 'ds_validee', demandeur: 'Sophie Martin',
    designation_article: 'Macaron pistache', code_projet: 'PJ5024',
    usine_validee: 'Rivesaltes', type_demande_de: '3', created_date: '2026-06-12',
  },
  {
    id: 'd', type_de: 'autre', statut: 'de_brouillon', autre_demandeur: 'Marie Lefèvre',
    autre_designation: 'Tartelette fraise', autre_code_origine: 'PJ5052',
    autre_usine_fab: 'Bonloc', autre_type_demande: '2', created_date: '2026-07-09',
  },
  {
    // en alerte : attente CC + date ancienne
    id: 'e', type_de: 'de', statut: 'de_attente_cc', demandeur: 'Julien Dubois',
    designation_article: 'Quiche 3 fromages', code_projet: 'PJ5058',
    usine_validee: 'Agen', created_date: '2020-01-01',
  },
];

describe('listDemandeurs', () => {
  it('renvoie les demandeurs uniques triés (DE + Autre)', () => {
    expect(listDemandeurs(DEMANDES)).toEqual([
      'Julien Dubois', 'Marie Lefèvre', 'Sophie Martin', 'Thomas Bernard',
    ]);
  });
});

describe('localIdFor', () => {
  it('joint le brouillon local par projet_id (GUID unique)', () => {
    const locaux = [{ id: 'loc-1', projet_id: 'guid-A' }];
    expect(localIdFor(locaux, { id: 'guid-A' })).toBe('loc-1');
  });

  it('ignore code_chapeau : deux essais en erreur partagent le même code sans se confondre', () => {
    // Deux DE distinctes réutilisent le MÊME code chapeau de test (749301). Sans
    // repli sur code_chapeau, une ligne sans miroir local ne doit PAS emprunter
    // l'id local de l'autre.
    const locaux = [
      { id: 'loc-sap', projet_id: 'guid-SAP', code_chapeau: '749301' }, // fiche déjà créée dans SAP
    ];
    const brouillonEnErreur = { id: 'guid-BROUILLON', code_chapeau: '749301' };
    expect(localIdFor(locaux, brouillonEnErreur)).toBeNull();
  });

  it('ignore code_projet réutilisé (même PJ sur deux lignes)', () => {
    const locaux = [{ id: 'loc-x', projet_id: 'guid-X', code_projet: 'PJ6025' }];
    expect(localIdFor(locaux, { id: 'guid-Y', code_projet: 'PJ6025' })).toBeNull();
  });

  it('renvoie null sans miroir local (rechargement Dataverse par projet_id)', () => {
    expect(localIdFor([], { id: 'guid-A' })).toBeNull();
    expect(localIdFor([{ id: 'l', projet_id: 'other' }], { id: 'guid-A' })).toBeNull();
  });
});

describe('accès type-aware', () => {
  it('lit le demandeur d\'une demande « autre »', () => {
    expect(getDemandeur(DEMANDES[3])).toBe('Marie Lefèvre');
  });
  it('lit l\'usine de fabrication d\'une demande « autre »', () => {
    expect(getUsine(DEMANDES[3])).toBe('Bonloc');
  });
});

describe('filterDemandes — statut', () => {
  it('sans critère, renvoie tout', () => {
    expect(filterDemandes(DEMANDES)).toHaveLength(5);
  });
  it('onglet « Brouillon » regroupe de_brouillon + ds_brouillon', () => {
    const r = filterDemandes(DEMANDES, { filter: 'de_brouillon' });
    expect(r.map((d) => d.id)).toEqual(['d']);
  });
  it('onglet « Attente code chapeau » couvre DE et DS', () => {
    const r = filterDemandes(DEMANDES, { filter: 'de_attente_cc' });
    expect(r.map((d) => d.id).sort()).toEqual(['b', 'e']);
  });
  it('onglet « Validée » compte DE validée + DS validée', () => {
    const r = filterDemandes(DEMANDES, { filter: 'dl_validee' });
    expect(r.map((d) => d.id).sort()).toEqual(['a', 'c']);
  });
});

describe('filterDemandes — type & demandeur', () => {
  it('filtre par type DS', () => {
    expect(filterDemandes(DEMANDES, { typeFilter: 'ds' }).map((d) => d.id)).toEqual(['c']);
  });
  it('filtre par demandeur', () => {
    const r = filterDemandes(DEMANDES, { demandeurFilter: 'Marie Lefèvre' });
    expect(r.map((d) => d.id).sort()).toEqual(['a', 'd']);
  });
});

describe('filterDemandes — plage de dates', () => {
  it('borne basse incluse', () => {
    const r = filterDemandes(DEMANDES, { dateFrom: '2026-07-01' });
    expect(r.map((d) => d.id).sort()).toEqual(['b', 'd']);
  });
  it('plage fermée', () => {
    const r = filterDemandes(DEMANDES, { dateFrom: '2026-06-01', dateTo: '2026-06-30' });
    expect(r.map((d) => d.id).sort()).toEqual(['a', 'c']);
  });
});

describe('filterDemandes — recherche & alerte', () => {
  it('recherche insensible à la casse/accents sur la désignation', () => {
    expect(filterDemandes(DEMANDES, { search: 'eclair' }).map((d) => d.id)).toEqual(['a']);
  });
  it('alertOnly ne garde que les demandes en retard de code chapeau', () => {
    // `today` fixé pour un test déterministe : au 05/07/2026, la DE « b » (04/07)
    // n'est pas encore en retard, seule « e » (2020) l'est.
    const r = filterDemandes(DEMANDES, { alertOnly: true, today: new Date('2026-07-05') });
    expect(r.map((d) => d.id)).toEqual(['e']);
  });
});

describe('sortDemandes', () => {
  it('trie par code projet en ordre "numérique" croissant', () => {
    const r = sortDemandes(DEMANDES, 'code_projet', 'asc');
    expect(r.map((d) => d.code_projet || d.autre_code_origine)).toEqual([
      'PJ5012', 'PJ5024', 'PJ5044', 'PJ5052', 'PJ5058',
    ]);
  });
  it('trie par date décroissante (plus récent d\'abord)', () => {
    const r = sortDemandes(DEMANDES, 'created_date', 'desc');
    expect(r.map((d) => d.id)).toEqual(['d', 'b', 'c', 'a', 'e']);
  });
  it('clé inconnue = liste inchangée', () => {
    expect(sortDemandes(DEMANDES, 'nope', 'asc')).toBe(DEMANDES);
  });
});
