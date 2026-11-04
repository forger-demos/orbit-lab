import {type Body, MU_SUN_KM3_S2} from './ephemeris';
import {lambert} from './lambert';
import {bodyState} from './transfer';
import {add, dot, norm, scale, type Vec3} from './vec';

export interface ArcSample {
  tMs: number;
  rKm: Vec3;
  vKmS: Vec3;
}

export type Arc =
  | {ok: true; departMs: number; arriveMs: number; r0Km: Vec3; v0KmS: Vec3; samples: readonly ArcSample[]}
  | {ok: false; reason: 'arrival-not-after-departure' | 'no-solution'};

export const ARC_SAMPLES = 240;

// Stumpff functions C(z) and S(z); the series avoids dividing by a vanishing z.
function stumpff(z: number): {c: number; s: number} {
  if (Math.abs(z) < 1e-6) return {c: 1 / 2 - z / 24, s: 1 / 6 - z / 120};
  if (z > 0) {
    const q = Math.sqrt(z);
    return {c: (1 - Math.cos(q)) / z, s: (q - Math.sin(q)) / (q * q * q)};
  }
  const q = Math.sqrt(-z);
  return {c: (Math.cosh(q) - 1) / -z, s: (Math.sinh(q) - q) / (q * q * q)};
}

/**
 * Kepler propagation of a two-body state by `dtSeconds` with universal variables (Curtis, Algorithm 3.4). Null when
 * the iteration does not converge, so callers treat it as data rather than an exception.
 */
export function propagate(
  mu: number, r0: Vec3, v0: Vec3, dtSeconds: number,
): {rKm: Vec3; vKmS: Vec3} | null {
  const r0n = norm(r0);
  if (dtSeconds === 0) return {rKm: r0, vKmS: v0};
  const sqrtMu = Math.sqrt(mu);
  const vr0 = dot(r0, v0) / r0n;
  const alpha = 2 / r0n - dot(v0, v0) / mu;
  let chi = sqrtMu * Math.abs(alpha) * dtSeconds;
  if (!(Math.abs(alpha) > 1e-12)) chi = sqrtMu * dtSeconds / r0n;
  let converged = false;
  for (let i = 0; i < 100; i++) {
    const z = alpha * chi * chi;
    const {c, s} = stumpff(z);
    const f = ((r0n * vr0) / sqrtMu) * chi * chi * c + (1 - alpha * r0n) * chi ** 3 * s + r0n * chi - sqrtMu * dtSeconds;
    const df = ((r0n * vr0) / sqrtMu) * chi * (1 - z * s) + (1 - alpha * r0n) * chi * chi * c + r0n;
    const next = chi - f / df;
    if (!Number.isFinite(next)) return null;
    const done = Math.abs(next - chi) < 1e-10 * Math.max(1, Math.abs(chi));
    chi = next;
    if (done) { converged = true; break; }
  }
  if (!converged) return null;
  const {c, s} = stumpff(alpha * chi * chi);
  const fCoef = 1 - ((chi * chi) / r0n) * c;
  const gCoef = dtSeconds - ((chi ** 3) / sqrtMu) * s;
  const rKm = add(scale(r0, fCoef), scale(v0, gCoef));
  const rn = norm(rKm);
  const fDot = (sqrtMu / (rn * r0n)) * (alpha * chi ** 3 * s - chi);
  const gDot = 1 - ((chi * chi) / rn) * c;
  const vKmS = add(scale(r0, fDot), scale(v0, gDot));
  return [...rKm, ...vKmS].every(Number.isFinite) ? {rKm, vKmS} : null;
}

/** The ship's state at `ms`, held at the ends outside [depart, arrive]. Null if propagation fails. */
export function arcStateAt(arc: Arc & {ok: true}, ms: number): ArcSample | null {
  const t = Math.min(arc.arriveMs, Math.max(arc.departMs, ms));
  const state = propagate(MU_SUN_KM3_S2, arc.r0Km, arc.v0KmS, (t - arc.departMs) / 1000);
  return state ? {tMs: t, ...state} : null;
}

/**
 * The prograde heliocentric arc leaving `from` at `departMs` and meeting `to` at `arriveMs`, sampled evenly in time
 * by Kepler propagation. A pair of dates with no Lambert solution, or one the propagator cannot follow, is a value.
 */
export function buildArc(from: Body, to: Body, departMs: number, arriveMs: number, count = ARC_SAMPLES): Arc {
  if (!(arriveMs > departMs)) return {ok: false, reason: 'arrival-not-after-departure'};
  const start = new Date(departMs);
  const end = new Date(arriveMs);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return {ok: false, reason: 'no-solution'};
  const a = bodyState(from, start);
  const b = bodyState(to, end);
  const solved = lambert(MU_SUN_KM3_S2, a.rKm, b.rKm, (arriveMs - departMs) / 1000);
  if (!solved.ok) return {ok: false, reason: 'no-solution'};
  const base = {ok: true as const, departMs, arriveMs, r0Km: a.rKm, v0KmS: solved.v1, samples: []};
  const n = Math.max(2, Math.floor(count));
  const samples: ArcSample[] = [];
  for (let i = 0; i <= n; i++) {
    const s = arcStateAt(base, departMs + ((arriveMs - departMs) * i) / n);
    if (!s) return {ok: false, reason: 'no-solution'};
    samples.push(s);
  }
  return {...base, samples};
}
