import {AU_KM, MU_SUN_KM3_S2, positionAu, velocityKmS} from '../ephemeris';
import {lambert} from './lambert';
import {norm, scale, sub} from '../vec';

export interface Transfer {
  c3: number;
  arrivalVInfKmS: number;
}

/** Departure C3 (km^2/s^2) and arrival v-infinity for a heliocentric Earth to Mars arc. */
export function earthMarsTransfer(depart: Date, arrive: Date): Transfer {
  const r1 = scale(positionAu('earthMoonBarycenter', depart), AU_KM);
  const r2 = scale(positionAu('mars', arrive), AU_KM);
  const dt = (arrive.getTime() - depart.getTime()) / 1000;
  const {v1, v2} = lambert(MU_SUN_KM3_S2, r1, r2, dt);
  const vInfDep = norm(sub(v1, velocityKmS('earthMoonBarycenter', depart)));
  const vInfArr = norm(sub(v2, velocityKmS('mars', arrive)));
  return {c3: vInfDep * vInfDep, arrivalVInfKmS: vInfArr};
}
