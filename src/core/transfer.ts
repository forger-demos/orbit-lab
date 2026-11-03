import {AU_KM, type Body, MU_SUN_KM3_S2, positionAu, velocityKmS} from './ephemeris';
import {lambert} from './lambert';
import {norm, scale, sub, type Vec3} from './vec';

export type TransferResult =
  | {ok: true; c3Km2S2: number; arrivalVInfKmS: number}
  | {ok: false; reason: 'arrival-not-after-departure' | 'no-solution'};

/** Heliocentric position (km) and velocity (km/s) of a body at one instant. */
export interface BodyState {
  rKm: Vec3;
  vKmS: Vec3;
}

export function bodyState(body: Body, date: Date): BodyState {
  return {rKm: scale(positionAu(body, date), AU_KM), vKmS: velocityKmS(body, date)};
}

/** The transfer between two precomputed body states; a grid computes each state once per row and column. */
export function transferBetweenStates(from: BodyState, to: BodyState, dtSeconds: number): TransferResult {
  if (!(dtSeconds > 0)) return {ok: false, reason: 'arrival-not-after-departure'};
  const arc = lambert(MU_SUN_KM3_S2, from.rKm, to.rKm, dtSeconds);
  if (!arc.ok) return {ok: false, reason: 'no-solution'};
  const vInfDep = norm(sub(arc.v1, from.vKmS));
  const vInfArr = norm(sub(arc.v2, to.vKmS));
  return {ok: true, c3Km2S2: vInfDep * vInfDep, arrivalVInfKmS: vInfArr};
}

/**
 * Departure C3 (km^2/s^2) and arrival v-infinity (km/s) for a prograde heliocentric arc between two bodies.
 * Bodies are the ephemeris points, so Earth is the Earth-Moon barycentre.
 */
export function transfer(from: Body, to: Body, depart: Date, arrive: Date): TransferResult {
  const dtSeconds = (arrive.getTime() - depart.getTime()) / 1000;
  if (!(dtSeconds > 0)) return {ok: false, reason: 'arrival-not-after-departure'};
  return transferBetweenStates(bodyState(from, depart), bodyState(to, arrive), dtSeconds);
}
