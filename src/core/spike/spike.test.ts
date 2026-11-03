import {expect, test} from 'bun:test';
import {AU_KM, positionAu} from '../ephemeris';
import {earthMarsTransfer} from './earth-mars';
import {lambert} from './lambert';
import {norm, sub} from '../vec';

test('Lambert reproduces Curtis, Orbital Mechanics for Engineering Students, example 5.2', () => {
  const {v1, v2} = lambert(398600, [5000, 10000, 2100], [-14600, 2500, 7000], 3600);
  const want1 = [-5.9925, 1.9254, 3.2456];
  const want2 = [-3.3125, -4.1966, -0.38529];
  v1.forEach((c, i) => expect(Math.abs(c - want1[i]!)).toBeLessThan(2e-3));
  v2.forEach((c, i) => expect(Math.abs(c - want2[i]!)).toBeLessThan(2e-3));
});

test('Lambert round trip: the returned arc reaches r2 under two-body motion energy', () => {
  const {v1, v2} = lambert(398600, [7000, 0, 0], [0, 9000, 1000], 2500);
  const e1 = (v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2) / 2 - 398600 / 7000;
  const e2 = (v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2) / 2 - 398600 / Math.hypot(0, 9000, 1000);
  expect(Math.abs(e1 - e2)).toBeLessThan(1e-6);
});

test('Keplerian ephemeris: Earth radius at the 2000 perihelion, Mars-Earth distance at 2020 opposition', () => {
  const j2000 = new Date('2000-01-01T12:00:00Z');
  expect(norm(positionAu('earthMoonBarycenter', j2000))).toBeCloseTo(0.9833, 2);
  const d = new Date('2020-10-06T00:00:00Z');
  const sep = norm(sub(positionAu('mars', d), positionAu('earthMoonBarycenter', d)));
  expect(Math.abs(sep - 0.4149)).toBeLessThan(0.005);
  expect(AU_KM).toBeGreaterThan(1.4e8);
});

// Published: Mars 2020 launched 2020-07-30 11:50 UTC with C3 14.49 km^2/s^2 (ULA mission booklet) and
// entered the Mars atmosphere 2021-02-18 20:36:50 UTC (NASA/JPL).
test('Perseverance transfer: departure C3 within ten percent of the published value', () => {
  const t = earthMarsTransfer(new Date('2020-07-30T11:50:00Z'), new Date('2021-02-18T20:36:50Z'));
  expect(Math.abs(t.c3 - 14.49) / 14.49).toBeLessThan(0.1);
});

test('Lambert covers clockwise and explicitly retrograde arcs, and a fast hyperbolic one', () => {
  const energy = (mu: number, r: number[], v: readonly number[]) =>
    (v[0]! ** 2 + v[1]! ** 2 + v[2]! ** 2) / 2 - mu / Math.hypot(r[0]!, r[1]!, r[2]!);
  const r1 = [7000, 0, 0];
  const r2 = [0, -9000, 1000];
  for (const [dt, prograde] of [[2500, true], [2500, false], [900, true]] as const) {
    const {v1, v2} = lambert(398600, r1 as [number, number, number], r2 as [number, number, number], dt, prograde);
    expect(Math.abs(energy(398600, r1, v1) - energy(398600, r2, v2))).toBeLessThan(1e-6);
  }
  const fast = lambert(398600, [7000, 0, 0], [0, 9000, 1000], 600);
  expect(energy(398600, [7000, 0, 0], fast.v1)).toBeGreaterThan(0);
});

test('Lambert throws rather than return garbage when time of flight is not positive', () => {
  expect(() => lambert(398600, [7000, 0, 0], [0, 9000, 1000], -5)).toThrow();
});
