import { describe, it, expect } from 'vitest';
import { codeFromLookupValue } from './sapLists';

describe('codeFromLookupValue', () => {
  const rows = [
    { id: 'g1', value: '2886', designation: 'Bonloc' },
    { id: 'g2', value: '7012', designation: 'Prod' },
  ];
  it('retrouve le code depuis le GUID', () => {
    expect(codeFromLookupValue('divisions', 'g1', rows)).toBe('2886');
    expect(codeFromLookupValue('divisions', 'g2', rows)).toBe('7012');
  });
  it('vide si GUID absent / vide', () => {
    expect(codeFromLookupValue('divisions', 'gX', rows)).toBe('');
    expect(codeFromLookupValue('divisions', '', rows)).toBe('');
    expect(codeFromLookupValue('divisions', 'g1', [])).toBe('');
  });
});
