import {add, cross, dot, norm, scale, sub, type Vec3} from './vec';

export type LambertResult =
  | {ok: true; v1: Vec3; v2: Vec3}
  | {ok: false; reason: 'opposed' | 'degenerate' | 'no-convergence' | 'bad-input'};

// Below this sine of the transfer angle the transfer plane is undefined (a 180 degree or 0 degree arc).
const MIN_PLANE_SINE = 1e-6;

// Time of flight for the Lancaster-Blanchard variable x (zero revolutions), non-dimensional.
function timeOfFlight(x: number, lambda: number): number {
  if (Math.abs(x - 1) < 1e-12) return (2 / 3) * (1 - lambda ** 3);
  const a = 1 / (1 - x * x);
  if (a > 0) {
    const alpha = 2 * Math.acos(Math.max(-1, Math.min(1, x)));
    let beta = 2 * Math.asin(Math.min(1, Math.sqrt((lambda * lambda) / a)));
    if (lambda < 0) beta = -beta;
    return (a * Math.sqrt(a) * (alpha - Math.sin(alpha) - (beta - Math.sin(beta)))) / 2;
  }
  const alpha = 2 * Math.acosh(x);
  const beta = 2 * Math.asinh(Math.sqrt((-lambda * lambda) / a));
  return (-a * Math.sqrt(-a) * (beta - Math.sinh(beta) - (alpha - Math.sinh(alpha)))) / 2;
}

function initialGuess(lambda: number, t: number): number {
  const t0 = Math.acos(lambda) + lambda * Math.sqrt(1 - lambda * lambda);
  const t1 = (2 / 3) * (1 - lambda ** 3);
  if (t >= t0) return (t0 / t) ** (2 / 3) - 1;
  if (t < t1) return ((5 / 2) * (t1 * (t1 - t))) / (t * (1 - lambda ** 5)) + 1;
  return (t0 / t) ** (Math.log2(t1 / t0)) - 1;
}

function solveX(lambda: number, t: number): number | null {
  let x = initialGuess(lambda, t);
  for (let i = 0; i < 40; i++) {
    const y = Math.sqrt(1 - lambda * lambda * (1 - x * x));
    const tx = timeOfFlight(x, lambda);
    const delta = tx - t;
    const d1 = (3 * tx * x - 2 + (2 * lambda ** 3 * x) / y) / (1 - x * x);
    const d2 = (3 * tx + 5 * x * d1 + (2 * (1 - lambda * lambda) * lambda ** 3) / y ** 3) / (1 - x * x);
    const d3 =
      (7 * x * d2 + 8 * d1 - (6 * (1 - lambda * lambda) * lambda ** 5 * x) / y ** 5) / (1 - x * x);
    const next =
      x - (delta * (d1 * d1 - (delta * d2) / 2)) / (d1 * (d1 * d1 - delta * d2) + (d3 * delta * delta) / 6);
    if (!Number.isFinite(next)) break;
    const done = Math.abs(next - x) < 1e-11;
    x = next;
    if (done && x > -1 && Number.isFinite(timeOfFlight(x, lambda))) return x;
  }
  return bisectX(lambda, t);
}

// Time of flight falls monotonically as x rises, so bisection always lands when Householder does not
// (very short flights overshoot into the hyperbolic branch).
function bisectX(lambda: number, t: number): number | null {
  let lo = -1 + 1e-9;
  let hi = 1e6;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (timeOfFlight(mid, lambda) > t) lo = mid;
    else hi = mid;
  }
  const x = (lo + hi) / 2;
  return Math.abs(timeOfFlight(x, lambda) - t) <= 1e-6 * t ? x : null;
}

/**
 * Zero-revolution Lambert solver after Izzo (2015). Any consistent units. A geometry or time of flight with no
 * usable arc is a value (`ok: false`), never an exception.
 */
export function lambert(mu: number, r1: Vec3, r2: Vec3, dt: number, prograde = true): LambertResult {
  const r1n = norm(r1);
  const r2n = norm(r2);
  if (![mu, r1n, r2n, dt].every(Number.isFinite) || !(mu > 0) || !(r1n > 0) || !(r2n > 0) || !(dt > 0)) {
    return {ok: false, reason: 'bad-input'};
  }
  const c = norm(sub(r2, r1));
  const s = (r1n + r2n + c) / 2;
  const ir1 = scale(r1, 1 / r1n);
  const ir2 = scale(r2, 1 / r2n);
  const ih0 = cross(ir1, ir2);
  const planeSine = norm(ih0);
  if (planeSine < MIN_PLANE_SINE) {
    return {ok: false, reason: dot(ir1, ir2) < 0 ? 'opposed' : 'degenerate'};
  }
  const ih = scale(ih0, 1 / planeSine);
  let lambda = Math.sqrt(Math.max(0, 1 - c / s));
  let it1: Vec3;
  let it2: Vec3;
  if (ih[2] < 0) {
    lambda = -lambda;
    it1 = cross(ir1, ih);
    it2 = cross(ir2, ih);
  } else {
    it1 = cross(ih, ir1);
    it2 = cross(ih, ir2);
  }
  if (!prograde) {
    lambda = -lambda;
    it1 = scale(it1, -1);
    it2 = scale(it2, -1);
  }
  const t = Math.sqrt((2 * mu) / s ** 3) * dt;
  const x = solveX(lambda, t);
  if (x === null) return {ok: false, reason: 'no-convergence'};
  const y = Math.sqrt(1 - lambda * lambda * (1 - x * x));
  const gamma = Math.sqrt((mu * s) / 2);
  const rho = (r1n - r2n) / c;
  const sigma = Math.sqrt(1 - rho * rho);
  const vr1 = (gamma * (lambda * y - x - rho * (lambda * y + x))) / r1n;
  const vr2 = (-gamma * (lambda * y - x + rho * (lambda * y + x))) / r2n;
  const vt = gamma * sigma * (y + lambda * x);
  const v1 = add(scale(ir1, vr1), scale(it1, vt / r1n));
  const v2 = add(scale(ir2, vr2), scale(it2, vt / r2n));
  if (![...v1, ...v2].every(Number.isFinite)) return {ok: false, reason: 'no-convergence'};
  return {ok: true, v1, v2};
}

export const specificEnergy = (mu: number, r: Vec3, v: Vec3): number => dot(v, v) / 2 - mu / norm(r);
