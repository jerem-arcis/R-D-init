import { describe, it, expect, beforeEach } from 'vitest';
import { withQueue, resetQueues } from './_serialize';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('withQueue', () => {
  beforeEach(resetQueues);

  it("n'exécute jamais deux tâches d'une même clé en parallèle", async () => {
    const trace = [];
    const tache = (nom, delai) => async () => {
      trace.push(`${nom}:start`);
      await tick(delai);
      trace.push(`${nom}:end`);
    };
    // La 1re est lente, la 2e rapide : sans file, B finirait avant la fin de A.
    const a = withQueue('fl-1', tache('A', 20));
    const b = withQueue('fl-1', tache('B', 0));
    await Promise.all([a, b]);

    expect(trace).toEqual(['A:start', 'A:end', 'B:start', 'B:end']);
  });

  it('sérialise le motif « lire -> écrire » (un décochage ne peut plus lire un état périmé)', async () => {
    let base = [];
    // sync = lire l'existant, puis écrire après un aller-retour réseau.
    const sync = (voulus) => async () => {
      const existants = [...base];
      await tick(10);
      base = [
        ...existants.filter((c) => voulus.includes(c)),
        ...voulus.filter((c) => !existants.includes(c)),
      ];
    };

    // Coche « GMS » puis décoche aussitôt.
    const p1 = withQueue('fl-1', sync(['GMS']));
    const p2 = withQueue('fl-1', sync([]));
    await Promise.all([p1, p2]);

    expect(base).toEqual([]);
  });

  it('les clés différentes ne se bloquent pas', async () => {
    const trace = [];
    const p1 = withQueue('fl-1', async () => {
      await tick(20);
      trace.push('lente');
    });
    const p2 = withQueue('fl-2', async () => {
      trace.push('rapide');
    });
    await Promise.all([p1, p2]);

    expect(trace).toEqual(['rapide', 'lente']);
  });

  it('un échec est propagé à l’appelant sans casser la file', async () => {
    const boom = withQueue('fl-1', async () => {
      throw new Error('échec');
    });
    await expect(boom).rejects.toThrow('échec');

    const suivante = withQueue('fl-1', async () => 'ok');
    await expect(suivante).resolves.toBe('ok');
  });
});
