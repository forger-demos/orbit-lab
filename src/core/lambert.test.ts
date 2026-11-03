import {expect, test} from 'bun:test';
import {lambert, specificEnergy} from './lambert';
import {norm, type Vec3} from './vec';

const MU_EARTH = 398600;

function solved(r1: Vec3, r2: Vec3, dt: number, prograde = true) {
  const arc = lambert(MU_EARTH, r1, r2, dt, prograde);
  if (!arc.ok) throw new Error(`expected a solution, got ${arc.reason}`);
  return arc;
}

test('reproduces Curtis, Orbital Mechanics for Engineering Students, example 5.2', () => {
  const {v1, v2} = solved([5000, 10000, 2100], [-14600, 2500, 7000], 3600);
  const want1 = [-5.9925, 1.9254, 3.2456];
  const want2 = [-3.3125, -4.1966, -0.38529];
  v1.forEach((c, i) => expect(Math.abs(c - want1[i]!)).toBeLessThan(2e-3));
  v2.forEach((c, i) => expect(Math.abs(c - want2[i]!)).toBeLessThan(2e-3));
});

test('energy is equal at both ends of the arc across prograde, retrograde and fast flights', () => {
  const r1: Vec3 = [7000, 0, 0];
  const cases: Array<[Vec3, number, boolean]> = [
    [[0, 9000, 1000], 2500, true],
    [[0, -9000, 1000], 2500, true],
    [[0, -9000, 1000], 2500, false],
    [[-3000, 8000, -2000], 4000, false],
    [[0, 9000, 1000], 900, true],
    [[0, 9000, 1000], 600, true],
  ];
  for (const [r2, dt, prograde] of cases) {
    const {v1, v2} = solved(r1, r2, dt, prograde);
    expect(Math.abs(specificEnergy(MU_EARTH, r1, v1) - specificEnergy(MU_EARTH, r2, v2))).toBeLessThan(1e-6);
  }
});

test('energy conservation holds over a sweep of geometries and flight times', () => {
  let solvedCount = 0;
  for (let angle = 20; angle < 340; angle += 20) {
    for (const dt of [300, 1200, 3000, 9000, 40000]) {
      const a = (angle * Math.PI) / 180;
      const r2: Vec3 = [9000 * Math.cos(a), 9000 * Math.sin(a), 700];
      for (const prograde of [true, false]) {
        const arc = lambert(MU_EARTH, [7000, 0, 0], r2, dt, prograde);
        if (!arc.ok) continue;
        solvedCount++;
        const gap = Math.abs(specificEnergy(MU_EARTH, [7000, 0, 0], arc.v1) - specificEnergy(MU_EARTH, r2, arc.v2));
        expect(gap).toBeLessThan(1e-5);
      }
    }
  }
  expect(solvedCount).toBeGreaterThan(100);
});

test('a fast flight is hyperbolic and a retrograde arc swings the other way', () => {
  const fast = solved([7000, 0, 0], [0, 9000, 1000], 600);
  expect(specificEnergy(MU_EARTH, [7000, 0, 0], fast.v1)).toBeGreaterThan(0);
  const pro = solved([7000, 0, 0], [0, 9000, 1000], 2500, true);
  const retro = solved([7000, 0, 0], [0, 9000, 1000], 2500, false);
  expect(pro.v1[1]).toBeGreaterThan(0);
  expect(retro.v1[1]).toBeLessThan(0);
});

test('nearly opposed vectors return no-solution rather than a number from an undefined plane', () => {
  expect(lambert(MU_EARTH, [7000, 0, 0], [-9000, 0, 0], 3000)).toEqual({ok: false, reason: 'opposed'});
  expect(lambert(MU_EARTH, [7000, 0, 0], [-9000, 1e-4, 0], 3000)).toEqual({ok: false, reason: 'opposed'});
});

test('bad input is a no-solution result, not an exception', () => {
  for (const dt of [-5, 0, Number.NaN, Infinity]) {
    expect(lambert(MU_EARTH, [7000, 0, 0], [0, 9000, 1000], dt)).toEqual({ok: false, reason: 'bad-input'});
  }
  expect(lambert(MU_EARTH, [0, 0, 0], [0, 9000, 1000], 100).ok).toBe(false);
});

test('a solved arc has finite, non-zero velocities', () => {
  const {v1, v2} = solved([7000, 0, 0], [0, 9000, 1000], 2500);
  expect(norm(v1)).toBeGreaterThan(0);
  expect(norm(v2)).toBeGreaterThan(0);
});
