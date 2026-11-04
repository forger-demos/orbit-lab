import {MS_PER_DAY} from './clock';
import {type Body} from './ephemeris';
import {TABLE_1} from './ephemeris-data';
import {DEFAULT_GRID_SAMPLES, type GridSpec} from './porkchop';

export const BODY_NAMES: Record<Body, string> = {
  mercury: 'Mercury',
  venus: 'Venus',
  earthMoonBarycenter: 'Earth',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
};

const DAYS_PER_YEAR = 365.25;
/** A launch axis longer than this stops being readable at the plot's resolution; the slowest pairs hit it. */
const MAX_DEPART_SPAN_DAYS = 30 * DAYS_PER_YEAR;
const SYNODIC_PERIODS_SHOWN = 3;
const ARRIVE_LEAD_HOHMANN = 0.35;
const ARRIVE_TAIL_HOHMANN = 1.4;

/** Orbital period in days from the J2000 semi-major axis (Kepler's third law, Sun-dominated). */
function periodDays(body: Body): number {
  return DAYS_PER_YEAR * TABLE_1[body].a[0] ** 1.5;
}

/** Days between successive alignments of two planets, from their mean orbital periods. */
export function synodicPeriodDays(a: Body, b: Body): number {
  const rate = Math.abs(1 / periodDays(a) - 1 / periodDays(b));
  return rate === 0 ? Infinity : 1 / rate;
}

/** Flight time in days of the minimum-energy ellipse between the two mean orbits; scales the arrival axis. */
export function hohmannDays(a: Body, b: Body): number {
  const mean = (TABLE_1[a].a[0] + TABLE_1[b].a[0]) / 2;
  return (DAYS_PER_YEAR * mean ** 1.5) / 2;
}

export type PairCheck = {ok: true} | {ok: false; message: string};

export function checkPair(from: Body, to: Body): PairCheck {
  return from === to
    ? {ok: false, message: `Choose two different planets: ${BODY_NAMES[from]} to ${BODY_NAMES[to]} is not a transfer.`}
    : {ok: true};
}

/**
 * The plot for any pair from a launch start date. The launch axis spans a few synodic periods (capped for the
 * slowest pairs); arrivals run from a fraction of the minimum-energy flight after the first launch to a
 * multiple of it after the last.
 */
export function pairSpec(from: Body, to: Body, departStartMs: number, samples = DEFAULT_GRID_SAMPLES): GridSpec {
  const steps = Math.max(1, samples - 1);
  const hohmann = hohmannDays(from, to);
  const departSpan = Math.min(SYNODIC_PERIODS_SHOWN * synodicPeriodDays(from, to), MAX_DEPART_SPAN_DAYS);
  const lead = ARRIVE_LEAD_HOHMANN * hohmann;
  const arriveSpan = departSpan + (ARRIVE_TAIL_HOHMANN - ARRIVE_LEAD_HOHMANN) * hohmann;
  return {
    from,
    to,
    departStartMs,
    departStepDays: departSpan / steps,
    cols: samples,
    arriveStartMs: departStartMs + lead * MS_PER_DAY,
    arriveStepDays: arriveSpan / steps,
    rows: samples,
  };
}
