import {expect, test} from 'bun:test';
import {AU_KM, BODIES, MU_SUN_KM3_S2, positionAu} from './ephemeris';
import {lambert, specificEnergy} from './lambert';
import {transfer} from './transfer';
import {scale} from './vec';

const DAY_MS = 86_400_000;

// Published: Mars 2020 launched 2020-07-30 11:50 UTC with C3 14.49 km^2/s^2 (ULA mission booklet) and
// entered the Mars atmosphere 2021-02-18 20:36:50 UTC (NASA/JPL). See docs/research/validation.md.
test('Perseverance: departure C3 within ten percent of the published value', () => {
  const t = transfer('earthMoonBarycenter', 'mars', new Date('2020-07-30T11:50:00Z'), new Date('2021-02-18T20:36:50Z'));
  if (!t.ok) throw new Error(t.reason);
  expect(Math.abs(t.c3Km2S2 - 14.49) / 14.49).toBeLessThan(0.1);
  expect(t.arrivalVInfKmS).toBeGreaterThan(2);
  expect(t.arrivalVInfKmS).toBeLessThan(3.5);
});

test('arrival not after departure is reported, not thrown', () => {
  const d = new Date('2020-07-30T00:00:00Z');
  expect(transfer('earthMoonBarycenter', 'mars', d, d)).toEqual({ok: false, reason: 'arrival-not-after-departure'});
  expect(transfer('earthMoonBarycenter', 'mars', d, new Date(d.getTime() - DAY_MS)).ok).toBe(false);
});

test('the arc has equal energy at both ends for a real Earth to Mars transfer', () => {
  const depart = new Date('2020-07-30T11:50:00Z');
  const arrive = new Date('2021-02-18T20:36:50Z');
  const r1 = scale(positionAu('earthMoonBarycenter', depart), AU_KM);
  const r2 = scale(positionAu('mars', arrive), AU_KM);
  const arc = lambert(MU_SUN_KM3_S2, r1, r2, (arrive.getTime() - depart.getTime()) / 1000);
  if (!arc.ok) throw new Error(arc.reason);
  expect(Math.abs(specificEnergy(MU_SUN_KM3_S2, r1, arc.v1) - specificEnergy(MU_SUN_KM3_S2, r2, arc.v2))).toBeLessThan(1e-6);
});

test('no pair of dates in a sweep throws; every cell is a transfer or a no-solution result', () => {
  const start = Date.UTC(2020, 0, 1);
  let solvedCount = 0;
  for (let i = 0; i < 40; i++) {
    for (let j = -5; j < 40; j++) {
      const depart = new Date(start + i * 20 * DAY_MS);
      const arrive = new Date(start + (i * 20 + j * 12) * DAY_MS);
      for (const to of ['mars', 'venus', 'jupiter'] as const) {
        const t = transfer('earthMoonBarycenter', to, depart, arrive);
        if (t.ok) {
          solvedCount++;
          expect(Number.isFinite(t.c3Km2S2)).toBe(true);
          expect(Number.isFinite(t.arrivalVInfKmS)).toBe(true);
        } else {
          expect(['arrival-not-after-departure', 'no-solution']).toContain(t.reason);
        }
      }
    }
  }
  expect(solvedCount).toBeGreaterThan(1000);
});

test('every body pair accepts the same dates without throwing', () => {
  const depart = new Date('2024-01-01T00:00:00Z');
  const arrive = new Date('2025-06-01T00:00:00Z');
  for (const a of BODIES) for (const b of BODIES) if (a !== b) expect(() => transfer(a, b, depart, arrive)).not.toThrow();
});
