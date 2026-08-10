import { describe, it, expect } from 'vitest';
import { toDraft, hasChanged } from './bufferedValue';

describe('toDraft', () => {
  it('normalise null / undefined / nombre en chaîne', () => {
    expect(toDraft(null)).toBe('');
    expect(toDraft(undefined)).toBe('');
    expect(toDraft(12)).toBe('12');
    expect(toDraft('abc')).toBe('abc');
  });
});

describe('hasChanged', () => {
  it('faux si la valeur est identique (types différents tolérés)', () => {
    expect(hasChanged('12', 12)).toBe(false); // saisie numérique inchangée
    expect(hasChanged('', null)).toBe(false); // champ vidé resté vide
    expect(hasChanged('Bonjour', 'Bonjour')).toBe(false);
  });
  it('vrai dès qu\'une modification réelle a eu lieu', () => {
    expect(hasChanged('13', 12)).toBe(true);
    expect(hasChanged('Bonjour', 'Bonsoir')).toBe(true);
    expect(hasChanged('x', null)).toBe(true);
  });
});
