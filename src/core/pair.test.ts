import {describe, expect, test} from 'bun:test';
import {MS_PER_DAY} from './clock';
import {checkPair, hohmannDays, pairSpec, synodicPeriodDays} from './pair';
import {computeGrid, isValidSpec} from './porkchop';

const EARTH = 'earthMoonBarycenter';
const T0 = Date.UTC(2019, 0, 1);

describe('synodic period', () => {
  test('matches the published values for Earth with Venus and Mars', () => {
    expect(synodicPeriodDays(EARTH, 'venus')).toBeGreaterThan(580);
    expect(synodicPeriodDays(EARTH, 'venus')).toBeLessThan(588);
    expect(synodicPeriodDays(EARTH, 'mars')).toBeGreaterThan(775);
    expect(synodicPeriodDays(EARTH, 'mars')).toBeLessThan(785);
  });

  test('is symmetric', () => {
    expect(synodicPeriodDays('venus', EARTH)).toBe(synodicPeriodDays(EARTH, 'venus'));
  });
});

describe('same planet', () => {
  test('is refused with a message naming the planet', () => {
    const check = checkPair('jupiter', 'jupiter');
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.message).toContain('Jupiter');
  });

  test('two different planets pass', () => {
    expect(checkPair(EARTH, 'venus')).toEqual({ok: true});
  });
});

describe('pair grid specs', () => {
  test('every ordered pair of distinct planets is a valid spec', () => {
    const bodies = ['mercury', 'venus', EARTH, 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;
    for (const a of bodies) for (const b of bodies) {
      if (a === b) continue;
      const s = pairSpec(a, b, T0);
      expect(isValidSpec(s)).toBe(true);
      expect(s.departStepDays).toBeGreaterThan(0);
      expect(s.arriveStepDays).toBeGreaterThan(0);
    }
  });

  test('the launch axis spans three synodic periods when that is readable', () => {
    const s = pairSpec(EARTH, 'venus', T0, 101);
    expect(s.departStepDays * 100).toBeCloseTo(3 * synodicPeriodDays(EARTH, 'venus'), 6);
  });

  test('a very slow pair caps the launch axis', () => {
    const s = pairSpec('uranus', 'neptune', T0, 101);
    expect(s.departStepDays * 100).toBeLessThanOrEqual(30 * 365.25 + 1e-6);
  });

  test('arrivals start after launch and end beyond the last launch', () => {
    const s = pairSpec(EARTH, 'jupiter', T0, 101);
    const lastDepart = T0 + 100 * s.departStepDays * MS_PER_DAY;
    const lastArrive = s.arriveStartMs + 100 * s.arriveStepDays * MS_PER_DAY;
    expect(s.arriveStartMs).toBeGreaterThan(T0);
    expect(lastArrive).toBeGreaterThan(lastDepart + 0.9 * hohmannDays(EARTH, 'jupiter') * MS_PER_DAY);
  });
});

describe('Earth to Venus windows', () => {
  const samples = 241;
  const spec = pairSpec(EARTH, 'venus', T0, samples);
  const grid = computeGrid(spec);
  const cheapest = Array.from({length: samples}, (_, c) => {
    let best = Infinity;
    for (let r = 0; r < samples; r++) {
      const v = grid.c3Km2S2[r * samples + c]!;
      if (v < best) best = v;
    }
    return best;
  });

  test('separate windows are about one synodic period apart', () => {
    const sorted = [...cheapest].filter(Number.isFinite).sort((x, y) => x - y);
    const cutoff = sorted[Math.floor(sorted.length * 0.3)]!;
    const centres: number[] = [];
    let c = 0;
    while (c < samples) {
      if (!(cheapest[c]! <= cutoff)) { c++; continue; }
      let best = c;
      let end = c;
      while (end < samples && cheapest[end]! <= cutoff) {
        if (cheapest[end]! < cheapest[best]!) best = end;
        end++;
      }
      centres.push(best);
      c = end;
    }
    expect(centres.length).toBeGreaterThanOrEqual(3);
    const synodic = synodicPeriodDays(EARTH, 'venus');
    for (let i = 1; i < centres.length; i++) {
      const spacingDays = (centres[i]! - centres[i - 1]!) * spec.departStepDays;
      expect(Math.abs(spacingDays - synodic)).toBeLessThan(0.15 * synodic);
    }
  });
});

describe('Earth to Jupiter', () => {
  test('the grid has cells with a transfer', () => {
    const grid = computeGrid(pairSpec(EARTH, 'jupiter', T0, 61));
    expect(grid.c3Km2S2.some((v) => Number.isFinite(v))).toBe(true);
  });
});
