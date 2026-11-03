import {TABLE_1, TABLE_2A, TABLE_2B} from './ephemeris-data';
import {type Vec3} from './vec';

export const AU_KM = 149597870.7;
export const MU_SUN_KM3_S2 = 1.32712440018e11;

export const BODIES = [
  'mercury',
  'venus',
  'earthMoonBarycenter',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;
export type Body = (typeof BODIES)[number];

/** [value at J2000, rate per Julian century]. */
type Pair = readonly [number, number];

export interface Elements {
  a: Pair;
  e: Pair;
  i: Pair;
  L: Pair;
  peri: Pair;
  node: Pair;
}

/** Extra mean-anomaly terms: b*T^2 + c*cos(f*T) + s*sin(f*T), f in degrees per century. */
export interface ExtraTerms {
  b: number;
  c: number;
  s: number;
  f: number;
}

export type ElementSet = 'table1' | 'table2';

const RAD = Math.PI / 180;
const JD_J2000 = 2451545.0;
const JD_TABLE_1_START = 2378496.5; // 1800-01-01
const JD_TABLE_1_END = 2469807.5; // 2050-01-01

export function julianDate(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

/** Table 1 is the better fit inside its stated range; Table 2a (with 2b) covers everything else. */
export function elementSetFor(date: Date): ElementSet {
  const jd = julianDate(date);
  return jd >= JD_TABLE_1_START && jd < JD_TABLE_1_END ? 'table1' : 'table2';
}

/** Solves M = E - e sin E for E, both angles in radians, M in [-pi, pi]. */
function solveKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 50; k++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

interface OrbitFrame {
  a: number;
  e: number;
  incRad: number;
  periDeg: number;
  nodeDeg: number;
  meanAnomalyRad: number;
}

function orbitFrame(body: Body, date: Date): OrbitFrame {
  const T = (julianDate(date) - JD_J2000) / 36525;
  const table2 = elementSetFor(date) === 'table2';
  const el = (table2 ? TABLE_2A : TABLE_1)[body];
  const at = (p: Pair) => p[0] + p[1] * T;
  const periDeg = at(el.peri);
  let meanAnomalyDeg = at(el.L) - periDeg;
  const extra = table2 ? TABLE_2B[body] : undefined;
  if (extra) {
    meanAnomalyDeg +=
      extra.b * T * T + extra.c * Math.cos(extra.f * T * RAD) + extra.s * Math.sin(extra.f * T * RAD);
  }
  return {
    a: at(el.a),
    e: at(el.e),
    incRad: at(el.i) * RAD,
    periDeg,
    nodeDeg: at(el.node),
    meanAnomalyRad: ((((meanAnomalyDeg % 360) + 540) % 360) - 180) * RAD,
  };
}

function positionAtEccentricAnomaly(f: OrbitFrame, E: number): Vec3 {
  const xp = f.a * (Math.cos(E) - f.e);
  const yp = f.a * Math.sqrt(1 - f.e * f.e) * Math.sin(E);
  const w = (f.periDeg - f.nodeDeg) * RAD;
  const O = f.nodeDeg * RAD;
  const [cw, sw, cO, sO, ci, si] = [
    Math.cos(w),
    Math.sin(w),
    Math.cos(O),
    Math.sin(O),
    Math.cos(f.incRad),
    Math.sin(f.incRad),
  ];
  return [
    (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}

/** Heliocentric J2000 ecliptic position in AU. */
export function positionAu(body: Body, date: Date): Vec3 {
  const f = orbitFrame(body, date);
  return positionAtEccentricAnomaly(f, solveKepler(f.meanAnomalyRad, f.e));
}

/** Heliocentric velocity in km/s by central difference of the position. */
export function velocityKmS(body: Body, date: Date, stepSeconds = 3600): Vec3 {
  const h = stepSeconds * 1000;
  const p = positionAu(body, new Date(date.getTime() + h));
  const m = positionAu(body, new Date(date.getTime() - h));
  const k = AU_KM / (2 * stepSeconds);
  return [(p[0] - m[0]) * k, (p[1] - m[1]) * k, (p[2] - m[2]) * k];
}

/** One closed ellipse of the body's orbit at the date's elements, in AU, for drawing. */
export function orbitPathAu(body: Body, date: Date, samples = 180): Vec3[] {
  const f = orbitFrame(body, date);
  const out: Vec3[] = [];
  for (let k = 0; k <= samples; k++) out.push(positionAtEccentricAnomaly(f, (2 * Math.PI * k) / samples));
  return out;
}
