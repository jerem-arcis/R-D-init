import { describe, it, expect } from 'vitest';
import {
  parseGroupIds, allGroupIds, buildPerimetre, societeDeDivision, peutVoirDossier,
  divisionsPour, canauxPour, peutModifierBloc, societesAdministrables, lignesAdmin, estAdminDossier,
} from './perimetre';

const G = {
  adv28: 'aaaaaaaa-0000-0000-0000-000000000028',
  com28: 'bbbbbbbb-0000-0000-0000-000000000028',
  adm28: 'cccccccc-0000-0000-0000-000000000028',
  adv60: 'aaaaaaaa-0000-0000-0000-000000000060',
  adm60: 'cccccccc-0000-0000-0000-000000000060',
};

const soc = (code, nom, groupes = {}) => ({ id: `s${code}`, code, nom, groupes });
const div = (value, societe, type = '') => ({ id: `d${value}`, value, designation: `Div ${value}`, societe, type });
const oc = (value, societe) => ({ id: `o${value}`, value, designation: value, societe });
const canal = (value, orgCo, designation = `Canal ${value}`) => ({ id: `c${orgCo}${value}`, value, designation, orgCo });

const base = {
  societes: [
    soc('0028', 'Boncolac', { adv: G.adv28, commerce: G.com28, admin: G.adm28 }),
    soc('0060', 'Autre', { adv: G.adv60, admin: G.adm60 }),
  ],
  divisions: [
    div('2886', '0028', 'PROD'), div('2866', '0028', 'PROD'), div('2820', '0028', 'STOCK'),
    div('2860', '0060', 'PROD'), div('2861', '0060', 'STOCK'),
    div('9999', '', ''),
  ],
  orgCos: [oc('OC28', '0028'), oc('OC37', 'Boncolac'), oc('OC60', '0060')],
  canaux: [canal('01', 'OC28'), canal('02', 'OC28'), canal('01', 'OC37'), canal('05', 'OC60')],
};
const P = (mesGroupes, data = base) => buildPerimetre({ ...data, mesGroupes });
const codes = (rows) => rows.map((r) => r.value);

describe('parseGroupIds', () => {
  it('tolère séparateurs, espaces, casse et doublons', () => {
    expect(parseGroupIds(` ${G.adv28.toUpperCase()} ; ${G.com28},${G.adv28};`)).toEqual([G.adv28, G.com28]);
    expect(parseGroupIds('')).toEqual([]);
    expect(parseGroupIds(null)).toEqual([]);
  });
  it('allGroupIds réunit tous les groupes de toutes les sociétés', () => {
    expect(allGroupIds(base.societes).sort()).toEqual(Object.values(G).sort());
  });
});

describe('visibilité des sociétés et des dossiers', () => {
  it('aucun groupe renseigné : tout est visible et modifiable', () => {
    const p = P([], { ...base, societes: [soc('0028', 'Boncolac'), soc('0060', 'Autre')] });
    expect(p.mesSocietes).toEqual(['0028', '0060']);
    expect(peutVoirDossier(p, '2860')).toBe(true);
    expect(peutModifierBloc(p, 'ind', '2886')).toBe(true);
    expect(p.isAdmin).toBe(true);
  });
  it('société cloisonnée : visible seulement par ses membres', () => {
    const p = P([G.adv28]);
    expect(p.mesSocietes).toEqual(['0028']);
    expect(peutVoirDossier(p, '2886')).toBe(true);
    expect(peutVoirDossier(p, '2860')).toBe(false);
  });
  it('dossier sans division ou division sans société : visible par tous', () => {
    const p = P([G.adv28]);
    expect(peutVoirDossier(p, '')).toBe(true);
    expect(peutVoirDossier(p, '9999')).toBe(true);
    expect(peutVoirDossier(p, 'inconnue')).toBe(true);
    expect(societeDeDivision(p, ' 2886 ')).toBe('0028');
    expect(societeDeDivision(p, '9999')).toBeNull();
  });
  it('utilisateur dans aucun groupe : rien de cloisonné visible, sans erreur', () => {
    const p = P([]);
    expect(p.mesSocietes).toEqual([]);
    expect(codes(divisionsPour(p, 'DE'))).toEqual([]);
    expect(codes(divisionsPour(p, 'DS'))).toEqual(['9999']);
    expect(peutModifierBloc(p, 'sc', '')).toBe(false);
  });
  it('société ouverte à côté d\'une cloisonnée : visible par tous', () => {
    const data = { ...base, societes: [soc('0028', 'Boncolac'), base.societes[1]] };
    const p = P([], data);
    expect(p.mesSocietes).toEqual(['0028']);
    expect(peutModifierBloc(p, 'com', '2886')).toBe(true);
    expect(p.isAdmin).toBe(false);
  });
});

describe('divisionsPour', () => {
  it('DE : PROD de mes sociétés', () => {
    expect(codes(divisionsPour(P([G.adv28]), 'DE'))).toEqual(['2866', '2886']);
    expect(codes(divisionsPour(P([G.adv28, G.adv60]), 'DE'))).toEqual(['2860', '2866', '2886']);
  });
  it('DE : repli sur les sites historiques tant qu\'aucune division n\'est typée PROD', () => {
    const data = { ...base, divisions: base.divisions.map((d) => ({ ...d, type: '' })) };
    expect(codes(divisionsPour(P([G.adv28], data), 'DE'))).toEqual(['2866', '2886']);
  });
  it('FL : STOCK de la société du dossier, toutes si aucune STOCK', () => {
    const p = P([G.adv28, G.adv60]);
    expect(codes(divisionsPour(p, 'FL', '2886'))).toEqual(['2820']);
    const sansStock = { ...base, divisions: base.divisions.filter((d) => d.value !== '2820') };
    expect(codes(divisionsPour(P([G.adv28], sansStock), 'FL', '2886'))).toEqual(['2866', '2886']);
  });
  it('FL sans société de dossier : même règle sur mes sociétés', () => {
    expect(codes(divisionsPour(P([G.adv28]), 'FL', ''))).toEqual(['2820']);
  });
  it('DS : toutes les divisions visibles', () => {
    expect(codes(divisionsPour(P([G.adv28]), 'DS'))).toEqual(['2820', '2866', '2886', '9999']);
  });
});

describe('canauxPour', () => {
  it('canaux de la société du dossier, dédoublonnés, orgCo rattachée par code ou par nom', () => {
    const p = P([G.adv28, G.adv60]);
    expect(codes(canauxPour(p, '2886'))).toEqual(['01', '02']);
    expect(codes(canauxPour(p, '2860'))).toEqual(['05']);
  });
  it('dossier sans société : canaux de mes sociétés', () => {
    expect(codes(canauxPour(P([G.adv28]), ''))).toEqual(['01', '02']);
    expect(codes(canauxPour(P([G.adv28, G.adv60]), ''))).toEqual(['01', '02', '05']);
  });
});

describe('peutModifierBloc', () => {
  it('chaque métier ne modifie que son bloc', () => {
    const adv = P([G.adv28]);
    expect(peutModifierBloc(adv, 'sc', '2886')).toBe(true);
    expect(peutModifierBloc(adv, 'com', '2886')).toBe(false);
    expect(peutModifierBloc(adv, 'ind', '2886')).toBe(false);
    expect(peutModifierBloc(P([G.com28]), 'com', '2886')).toBe(true);
  });
  it('colonne vide dans une société cloisonnée : personne n\'a le rôle', () => {
    expect(peutModifierBloc(P([G.adv28, G.com28]), 'ind', '2886')).toBe(false);
  });
  it('admin modifie tout sur sa société, rien sur une autre', () => {
    const p = P([G.adm28, G.adv60]);
    expect(peutModifierBloc(p, 'ind', '2886')).toBe(true);
    expect(peutModifierBloc(p, 'ind', '2860')).toBe(false);
    expect(peutModifierBloc(p, 'sc', '2860')).toBe(true);
  });
  it('dossier sans société : rôle détenu dans au moins une société', () => {
    expect(peutModifierBloc(P([G.adv60]), 'sc', '')).toBe(true);
    expect(peutModifierBloc(P([G.adv60]), 'com', '')).toBe(false);
  });
});

describe('admin', () => {
  it('ouvert à tous tant qu\'aucun groupe admin n\'existe', () => {
    const data = { ...base, societes: [soc('0028', 'Boncolac', { adv: G.adv28 })] };
    const p = P([], data);
    expect(p.adminOuvert).toBe(true);
    expect(p.isAdmin).toBe(true);
    expect(societesAdministrables(p)).toEqual(['0028']);
  });
  it('réservé aux membres d\'un groupe admin, limité à leurs sociétés', () => {
    expect(P([G.adv28]).isAdmin).toBe(false);
    expect(societesAdministrables(P([G.adv28]))).toEqual([]);
    const p = P([G.adm28]);
    expect(p.isAdmin).toBe(true);
    expect(societesAdministrables(p)).toEqual(['0028']);
    const l = lignesAdmin(p);
    expect(l.societes.map((s) => s.code)).toEqual(['0028']);
    expect(codes(l.divisions)).toEqual(['2820', '2866', '2886', '9999']);
    expect(codes(l.orgCos)).toEqual(['OC28', 'OC37']);
    expect(l.canaux).toHaveLength(3);
  });
  it('estAdminDossier : admin de la société du dossier uniquement', () => {
    expect(estAdminDossier(P([G.adm28]), '2886')).toBe(true);
    expect(estAdminDossier(P([G.adm28]), '2860')).toBe(false);
    expect(estAdminDossier(P([G.adv28]), '2886')).toBe(false);
    // Dossier sans société : n'importe quel admin.
    expect(estAdminDossier(P([G.adm60]), '')).toBe(true);
    expect(estAdminDossier(P([G.adv28]), '')).toBe(false);
    // Rien de configuré : comportement historique.
    expect(estAdminDossier(P([], { ...base, societes: [soc('0028', 'Boncolac')] }), '2886')).toBe(true);
  });
  it('société sans groupe admin : gérable par n\'importe quel admin', () => {
    const data = { ...base, societes: [base.societes[0], soc('0060', 'Autre', { adv: G.adv60 })] };
    expect(societesAdministrables(P([G.adm28], data))).toEqual(['0028', '0060']);
  });
});
