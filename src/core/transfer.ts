import {AU_KM, type Body, MU_SUN_KM3_S2, positionAu, velocityKmS} from './ephemeris';
import {lambert} from './lambert';
import {norm, scale, sub} from './vec';

export type TransferResult =
  | {ok: true; c3Km2S2: number; arrivalVInfKmS: number}
  | {ok: false; reason: 'arrival-not-after-departure' | 'no-solution'};

/**
 * Departure C3 (km^2/s^2) and arrival v-infinity (km/s) for a prograde heliocentric arc between two bodies.
 * Bodies are the ephemeris points, so Earth is the Earth-Moon barycentre.
 */
export function transfer(from: Body, to: Body, depart: Date, arrive: Date): TransferResult {
  const dtSeconds = (arrive.getTime() - depart.getTime()) / 1000;
  if (!(dtSeconds > 0)) return {ok: false, reason: 'arrival-not-after-departure'};
  const r1 = scale(positionAu(from, depart), AU_KM);
  const r2 = scale(positionAu(to, arrive), AU_KM);
  const arc = lambert(MU_SUN_KM3_S2, r1, r2, dtSeconds);
  if (!arc.ok) return {ok: false, reason: 'no-solution'};
  const vInfDep = norm(sub(arc.v1, velocityKmS(from, depart)));
  const vInfArr = norm(sub(arc.v2, velocityKmS(to, arrive)));
  return {ok: true, c3Km2S2: vInfDep * vInfDep, arrivalVInfKmS: vInfArr};
}
