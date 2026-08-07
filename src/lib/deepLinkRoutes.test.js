import { describe, it, expect } from 'vitest';
import { matchDeepLink, FL_SECTIONS } from './deepLinkRoutes';

// Fabrique un lecteur de params depuis un objet plat.
const reader = (obj) => (p) => obj[p];

describe('FL_SECTIONS', () => {
  it('expose les 4 sections FL', () => {
    expect(FL_SECTIONS).toEqual(['supply_chain', 'industriel', 'commerce', 'synthese']);
  });
});

describe('matchDeepLink — code PJ', () => {
  it('vue=de → CreerDE avec projet_id résolu', () => {
    const r = matchDeepLink(reader({ code_pj: 'PJ4987', vue: 'de' }));
    expect(r.resolveNeeded).toBe(true);
    expect(r.value).toBe('PJ4987');
    expect(r.buildUrl('GUID-1')).toBe('/CreerDE?projet_id=GUID-1');
  });

  it('vue=fl + section valide → FicheDetail avec section', () => {
    const r = matchDeepLink(reader({ code_pj: 'PJ4987', vue: 'fl', section: 'industriel' }));
    expect(r.resolveNeeded).toBe(true);
    expect(r.buildUrl('GUID-1')).toBe('/FicheDetail?id=GUID-1&section=industriel');
  });

  it('vue absent → défaut fl (sans section)', () => {
    const r = matchDeepLink(reader({ code_pj: 'PJ4987' }));
    expect(r.buildUrl('GUID-1')).toBe('/FicheDetail?id=GUID-1');
  });

  it('section inconnue → ignorée', () => {
    const r = matchDeepLink(reader({ code_pj: 'PJ4987', vue: 'fl', section: 'zzz' }));
    expect(r.buildUrl('GUID-1')).toBe('/FicheDetail?id=GUID-1');
  });

  it('ssKey dépend du code et de la vue/section (nouvelle valeur = nouvelle redirection)', () => {
    const a = matchDeepLink(reader({ code_pj: 'PJ1', vue: 'fl', section: 'industriel' }));
    const b = matchDeepLink(reader({ code_pj: 'PJ1', vue: 'fl', section: 'commerce' }));
    expect(a.ssKey).not.toBe(b.ssKey);
  });
});

describe('matchDeepLink — repli legacy', () => {
  it('projet_id → CreerDE direct (pas de résolution)', () => {
    const r = matchDeepLink(reader({ projet_id: 'GUID-9' }));
    expect(r.resolveNeeded).toBe(false);
    expect(r.buildUrl('GUID-9')).toBe('/CreerDE?projet_id=GUID-9');
  });

  it('code_chapeau → DemandesEtude direct', () => {
    const r = matchDeepLink(reader({ code_chapeau: 'CH-42' }));
    expect(r.resolveNeeded).toBe(false);
    expect(r.buildUrl('CH-42')).toBe('/DemandesEtude?code_chapeau=CH-42');
  });

  it('code_pj prioritaire sur projet_id', () => {
    const r = matchDeepLink(reader({ code_pj: 'PJ4987', projet_id: 'GUID-9' }));
    expect(r.resolveNeeded).toBe(true);
    expect(r.value).toBe('PJ4987');
  });

  it('aucun param reconnu → null', () => {
    expect(matchDeepLink(reader({ foo: 'bar' }))).toBeNull();
  });
});
