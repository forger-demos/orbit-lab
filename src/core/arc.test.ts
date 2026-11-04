import {expect, test} from 'bun:test';
import {buildArc, propagate} from './arc';
import {AU_KM, MU_SUN_KM3_S2} from './ephemeris';
import {specificEnergy} from './lambert';
import {bodyState} from './transfer';
import {norm, sub} from './vec';

const DEPART = Date.UTC(2020, 6, 30, 11, 50);
const ARRIVE = Date.UTC(2021, 1, 18, 20, 36, 50);

function arcOf(departMs: number, arriveMs: number) {
  const arc = buildArc('earthMoonBarycenter', 'mars', departMs, arriveMs);
  if (!arc.ok) throw new Error(arc.reason);
  return arc;
}

test('the arc starts at Earth at launch and ends at Mars at arrival', () => {
  const arc = arcOf(DEPART, ARRIVE);
  const first = arc.samples[0]!;
  const last = arc.samples[arc.samples.length - 1]!;
  const earth = bodyState('earthMoonBarycenter', new Date(DEPART)).rKm;
  const mars = bodyState('mars', new Date(ARRIVE)).rKm;
  expect(first.tMs).toBe(DEPART);
  expect(last.tMs).toBe(ARRIVE);
  expect(norm(sub(first.rKm, earth))).toBeLessThan(1);
  expect(norm(sub(last.rKm, mars))).toBeLessThan(1000);
  expect(norm(sub(last.rKm, mars)) / AU_KM).toBeLessThan(1e-5);
});

test('sample times rise strictly and energy is conserved along the arc', () => {
  const arc = arcOf(DEPART, ARRIVE);
  const e0 = specificEnergy(MU_SUN_KM3_S2, arc.samples[0]!.rKm, arc.samples[0]!.vKmS);
  for (let i = 1; i < arc.samples.length; i++) {
    expect(arc.samples[i]!.tMs).toBeGreaterThan(arc.samples[i - 1]!.tMs);
    const e = specificEnergy(MU_SUN_KM3_S2, arc.samples[i]!.rKm, arc.samples[i]!.vKmS);
    expect(Math.abs(e - e0) / Math.abs(e0)).toBeLessThan(1e-8);
  }
});

test('propagating a circular orbit a quarter period turns the state by 90 degrees', () => {
  const r = 1.5e8;
  const v = Math.sqrt(MU_SUN_KM3_S2 / r);
  const period = 2 * Math.PI * Math.sqrt(r ** 3 / MU_SUN_KM3_S2);
  const out = propagate(MU_SUN_KM3_S2, [r, 0, 0], [0, v, 0], period / 4);
  if (!out) throw new Error('did not converge');
  expect(Math.abs(out.rKm[0])).toBeLessThan(1e-3 * r);
  expect(out.rKm[1]).toBeCloseTo(r, -3);
  const back = propagate(MU_SUN_KM3_S2, [r, 0, 0], [0, v, 0], period);
  expect(norm(sub(back!.rKm, [r, 0, 0]))).toBeLessThan(1e-3 * r);
});

test('arrival not after launch, and bad dates, are values rather than throws', () => {
  expect(buildArc('earthMoonBarycenter', 'mars', ARRIVE, DEPART)).toEqual({ok: false, reason: 'arrival-not-after-departure'});
  expect(buildArc('earthMoonBarycenter', 'mars', DEPART, DEPART)).toEqual({ok: false, reason: 'arrival-not-after-departure'});
  expect(buildArc('earthMoonBarycenter', 'mars', NaN, ARRIVE).ok).toBe(false);
  expect(buildArc('earthMoonBarycenter', 'mars', DEPART, 8.7e15).ok).toBe(false);
});

test('any arrival date gives an arc or a no-solution value', () => {
  const sweep = [];
  for (let d = 0; d < 800; d += 5) sweep.push(buildArc('earthMoonBarycenter', 'mars', DEPART, DEPART + (20 + d) * 86_400_000));
  expect(sweep.every((a) => a.ok || a.reason === 'no-solution')).toBe(true);
});
