import {type Vec3} from './vec';

export const AU_KM = 149597870.7;
export const MU_SUN_KM3_S2 = 1.32712440018e11;

interface Elements {
  a: [number, number];
  e: [number, number];
  i: [number, number];
  L: [number, number];
  peri: [number, number];
  node: [number, number];
}

// JPL "Keplerian Elements for Approximate Positions of the Major Planets", Table 1 (1800-2050).
export const TABLE_1: Record<'earthMoonBarycenter' | 'mars', Elements> = {
  earthMoonBarycenter: {
    a: [1.00000261, 0.00000562],
    e: [0.01671123, -0.00004392],
    i: [-0.00001531, -0.01294668],
    L: [100.46457166, 35999.37244981],
    peri: [102.93768193, 0.32327364],
    node: [0, 0],
  },
  mars: {
    a: [1.52371034, 0.00001847],
    e: [0.0933941, 0.00007882],
    i: [1.84969142, -0.00813131],
    L: [-4.55343205, 19140.30268499],
    peri: [-23.94362959, 0.44441088],
    node: [49.55953891, -0.29257343],
  },
};

const RAD = Math.PI / 180;

export function julianDate(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

/** Heliocentric J2000 ecliptic position in AU. */
export function positionAu(body: keyof typeof TABLE_1, date: Date): Vec3 {
  const el = TABLE_1[body];
  const T = (julianDate(date) - 2451545.0) / 36525;
  const at = (p: [number, number]) => p[0] + p[1] * T;
  const a = at(el.a);
  const e = at(el.e);
  const inc = at(el.i) * RAD;
  const peri = at(el.peri);
  const node = at(el.node);
  let M = (((at(el.L) - peri) % 360) + 540) % 360 - 180;
  M *= RAD;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 50; k++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (peri - node) * RAD;
  const O = node * RAD;
  const [cw, sw, cO, sO, ci, si] = [Math.cos(w), Math.sin(w), Math.cos(O), Math.sin(O), Math.cos(inc), Math.sin(inc)];
  return [
    (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}

/** Heliocentric velocity in km/s by central difference of the position. */
export function velocityKmS(body: keyof typeof TABLE_1, date: Date, stepSeconds = 3600): Vec3 {
  const h = stepSeconds * 1000;
  const p = positionAu(body, new Date(date.getTime() + h));
  const m = positionAu(body, new Date(date.getTime() - h));
  const k = AU_KM / (2 * stepSeconds);
  return [(p[0] - m[0]) * k, (p[1] - m[1]) * k, (p[2] - m[2]) * k];
}
