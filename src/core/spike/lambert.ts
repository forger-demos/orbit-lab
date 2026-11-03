import {add, cross, dot, norm, scale, sub, type Vec3} from './vec';

export interface LambertResult {
  v1: Vec3;
  v2: Vec3;
}

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

function solveX(lambda: number, t: number): number {
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
    if (done) return x;
  }
  return bisectX(lambda, t);
}

// Time of flight falls monotonically as x rises, so bisection always lands when Householder does not
// (very short flights overshoot into the hyperbolic branch).
function bisectX(lambda: number, t: number): number {
  if (!(t > 0)) throw new Error('lambert: time of flight must be positive');
  let lo = -1 + 1e-9;
  let hi = 1e6;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (timeOfFlight(mid, lambda) > t) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Zero-revolution Lambert solver after Izzo (2015). Any consistent units. */
export function lambert(mu: number, r1: Vec3, r2: Vec3, dt: number, prograde = true): LambertResult {
  const r1n = norm(r1);
  const r2n = norm(r2);
  const c = norm(sub(r2, r1));
  const s = (r1n + r2n + c) / 2;
  const ir1 = scale(r1, 1 / r1n);
  const ir2 = scale(r2, 1 / r2n);
  const ih0 = cross(ir1, ir2);
  const ih = scale(ih0, 1 / norm(ih0));
  let lambda = Math.sqrt(1 - c / s);
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
  const y = Math.sqrt(1 - lambda * lambda * (1 - x * x));
  const gamma = Math.sqrt((mu * s) / 2);
  const rho = (r1n - r2n) / c;
  const sigma = Math.sqrt(1 - rho * rho);
  const vr1 = (gamma * (lambda * y - x - rho * (lambda * y + x))) / r1n;
  const vr2 = (-gamma * (lambda * y - x + rho * (lambda * y + x))) / r2n;
  const vt = gamma * sigma * (y + lambda * x);
  return {
    v1: add(scale(ir1, vr1), scale(it1, vt / r1n)),
    v2: add(scale(ir2, vr2), scale(it2, vt / r2n)),
  };
}

export const specificEnergy = (mu: number, r: Vec3, v: Vec3): number => dot(v, v) / 2 - mu / norm(r);
