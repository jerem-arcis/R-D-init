import { describe, it, expect } from 'vitest';
import {
  FL_FIELDS, NATURE_META, STATUS_META,
  groupBySection, counts, ruleCounts, saisieCounts,
} from './flMapping';

const CATS = ['SAISIE', 'CONSTANTE', 'REGLE', 'CALCUL', 'WORKFLOW'];

describe('FL_FIELDS', () => {
  it('contient les 151 champs du mapping', () => {
    expect(FL_FIELDS).toHaveLength(151);
  });

  it('chaque champ a une nature valide et un statut connu', () => {
    for (const f of FL_FIELDS) {
      expect(CATS).toContain(f.cat);
      expect(STATUS_META[f.status]).toBeDefined();
      expect(NATURE_META[f.cat]).toBeDefined();
    }
  });

  it('le statut est cohérent avec la nature', () => {
    for (const f of FL_FIELDS) {
      if (f.cat === 'SAISIE') expect(f.status).toBe('saisie');
      if (f.cat === 'CONSTANTE') expect(f.status).toBe('constante');
      if (f.cat === 'CALCUL') expect(f.status).toBe('calcul');
      if (f.cat === 'WORKFLOW') expect(f.status).toBe('workflow');
      if (f.cat === 'REGLE') expect(['regle_reusable', 'regle_todo']).toContain(f.status);
    }
  });
});

describe('counts', () => {
  it('la somme des natures égale le total', () => {
    const c = counts();
    const total = CATS.reduce((s, k) => s + c[k], 0);
    expect(total).toBe(FL_FIELDS.length);
  });
});

describe('ruleCounts', () => {
  it('réutilisables + à coder = total des règles', () => {
    const rc = ruleCounts();
    const nbRegles = FL_FIELDS.filter((f) => f.cat === 'REGLE').length;
    expect(rc.reusable + rc.todo).toBe(nbRegles);
    expect(rc.total).toBe(nbRegles);
  });
});

describe('saisieCounts', () => {
  it('brut = effectives + doublons, et = total des SAISIE', () => {
    const s = saisieCounts();
    const nbSaisie = FL_FIELDS.filter((f) => f.cat === 'SAISIE').length;
    expect(s.brut).toBe(nbSaisie);
    expect(s.effective + s.doublons).toBe(s.brut);
    expect(s.inPage + s.missing).toBe(s.effective);
  });

  it('les 2 champs ajoutés (VERSG, XCHPF) sont désormais en page', () => {
    const versg = FL_FIELDS.find((f) => f.cellule === 'D50');
    const xchpf = FL_FIELDS.find((f) => f.cellule === 'I55');
    for (const f of [versg, xchpf]) {
      expect(f.effective).toBe(true);
      expect(f.inPage).toBe(true);
      expect(f.justAdded).toBe(true);
    }
  });
});

describe('groupBySection', () => {
  it('couvre tous les champs sans perte', () => {
    const groups = groupBySection();
    const total = groups.reduce((s, g) => s + g.items.length, 0);
    expect(total).toBe(FL_FIELDS.length);
  });

  it('respecte un filtre passé en argument', () => {
    const only = FL_FIELDS.filter((f) => f.cat === 'REGLE');
    const groups = groupBySection(only);
    const total = groups.reduce((s, g) => s + g.items.length, 0);
    expect(total).toBe(only.length);
  });
});
