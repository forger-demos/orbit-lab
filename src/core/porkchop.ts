import {MS_PER_DAY} from './clock';
import {type Body} from './ephemeris';
import {bodyState, type BodyState, transferBetweenStates} from './transfer';

/**
 * A porkchop grid: `cols` launch dates across and `rows` arrival dates up, sampled at grid points
 * (`start + index * step`), so the first and last samples sit on the plot edges.
 */
export interface GridSpec {
  from: Body;
  to: Body;
  departStartMs: number;
  departStepDays: number;
  cols: number;
  arriveStartMs: number;
  arriveStepDays: number;
  rows: number;
}

/** Row-major values, row 0 is the earliest arrival. A blank cell (no transfer) is NaN. */
export interface GridBand {
  rowStart: number;
  rowCount: number;
  c3Km2S2: Float32Array;
  arrivalVInfKmS: Float32Array;
}

export type PorkchopMessage =
  | {type: 'coarse'; spec: GridSpec; c3Km2S2: Float32Array; arrivalVInfKmS: Float32Array}
  | ({type: 'band'} & GridBand)
  | {type: 'done'};

/** Upper bound on cells so a bad request cannot exhaust memory. */
export const MAX_CELLS = 4_000_000;

export function isValidSpec(spec: GridSpec): boolean {
  const {cols, rows} = spec;
  return (
    Number.isInteger(cols) && Number.isInteger(rows) && cols >= 1 && rows >= 1 && cols * rows <= MAX_CELLS &&
    [spec.departStartMs, spec.departStepDays, spec.arriveStartMs, spec.arriveStepDays].every(Number.isFinite)
  );
}

function emptyBand(rowStart: number, rowCount: number, cols: number): GridBand {
  const n = Math.max(0, rowCount * cols);
  return {rowStart, rowCount, c3Km2S2: new Float32Array(n).fill(NaN), arrivalVInfKmS: new Float32Array(n).fill(NaN)};
}

function statesAlong(body: Body, startMs: number, stepDays: number, from: number, count: number): (BodyState | null)[] {
  const out: (BodyState | null)[] = [];
  for (let i = from; i < from + count; i++) {
    const ms = startMs + i * stepDays * MS_PER_DAY;
    const date = new Date(ms);
    out.push(Number.isNaN(date.getTime()) ? null : bodyState(body, date));
  }
  return out;
}

/** Departure states for every column; computed once and reused by every band. */
export function departureStates(spec: GridSpec): (BodyState | null)[] {
  return isValidSpec(spec) ? statesAlong(spec.from, spec.departStartMs, spec.departStepDays, 0, spec.cols) : [];
}

/**
 * Computes rows [rowStart, rowStart + rowCount) of the grid. Never throws: an invalid spec or range gives
 * blank cells, and a cell with arrival not after launch or with no Lambert solution is NaN.
 */
export function computeBand(
  spec: GridSpec,
  rowStart: number,
  rowCount: number,
  departures: (BodyState | null)[] = departureStates(spec),
): GridBand {
  if (!isValidSpec(spec) || !Number.isInteger(rowStart) || !Number.isInteger(rowCount) || rowStart < 0) {
    return emptyBand(rowStart, 0, 0);
  }
  const count = Math.max(0, Math.min(rowCount, spec.rows - rowStart));
  const band = emptyBand(rowStart, count, spec.cols);
  const arrivals = statesAlong(spec.to, spec.arriveStartMs, spec.arriveStepDays, rowStart, count);
  for (let r = 0; r < count; r++) {
    const arrival = arrivals[r];
    if (!arrival) continue;
    const arriveMs = spec.arriveStartMs + (rowStart + r) * spec.arriveStepDays * MS_PER_DAY;
    for (let c = 0; c < spec.cols; c++) {
      const departure = departures[c];
      if (!departure) continue;
      const departMs = spec.departStartMs + c * spec.departStepDays * MS_PER_DAY;
      const result = transferBetweenStates(departure, arrival, (arriveMs - departMs) / 1000);
      if (!result.ok) continue;
      band.c3Km2S2[r * spec.cols + c] = result.c3Km2S2;
      band.arrivalVInfKmS[r * spec.cols + c] = result.arrivalVInfKmS;
    }
  }
  return band;
}

/** The whole grid in one call. */
export function computeGrid(spec: GridSpec): GridBand {
  return computeBand(spec, 0, spec.rows);
}

/** The same extents sampled `factor` times more coarsely, for a first pass that appears at once. */
export function coarsen(spec: GridSpec, factor: number): GridSpec {
  const k = Math.max(1, Math.floor(factor));
  return {
    ...spec,
    cols: Math.floor((spec.cols - 1) / k) + 1,
    rows: Math.floor((spec.rows - 1) / k) + 1,
    departStepDays: spec.departStepDays * k,
    arriveStepDays: spec.arriveStepDays * k,
  };
}

export const COARSE_FACTOR = 4;
export const BAND_ROWS = 24;

/**
 * Emits the coarse grid, then the full-resolution grid in bands, then `done`. The worker is a thin wrapper
 * around this so the order and content of messages are tested without a browser.
 */
export function runPorkchop(spec: GridSpec, emit: (message: PorkchopMessage) => void): void {
  if (!isValidSpec(spec)) {
    emit({type: 'done'});
    return;
  }
  const coarseSpec = coarsen(spec, COARSE_FACTOR);
  const coarse = computeGrid(coarseSpec);
  emit({type: 'coarse', spec: coarseSpec, c3Km2S2: coarse.c3Km2S2, arrivalVInfKmS: coarse.arrivalVInfKmS});
  const departures = departureStates(spec);
  for (let row = 0; row < spec.rows; row += BAND_ROWS) {
    emit({type: 'band', ...computeBand(spec, row, BAND_ROWS, departures)});
  }
  emit({type: 'done'});
}

/** Samples per axis of the full-resolution grid; see docs/research/rendering-and-speed.md for how it was chosen. */
export const DEFAULT_GRID_SAMPLES = 601;
const DEPART_SPAN_DAYS = 2400;
const ARRIVE_LEAD_DAYS = 90;
const ARRIVE_SPAN_DAYS = 2760;

/**
 * The Earth to Mars plot from a launch start date: about three synodic periods of launch dates, and arrivals from
 * 90 days after the first launch to 360 days after the last, which covers every sensible flight time.
 */
export function earthMarsSpec(departStartMs: number, samples = DEFAULT_GRID_SAMPLES): GridSpec {
  const steps = Math.max(1, samples - 1);
  return {
    from: 'earthMoonBarycenter',
    to: 'mars',
    departStartMs,
    departStepDays: DEPART_SPAN_DAYS / steps,
    cols: samples,
    arriveStartMs: departStartMs + ARRIVE_LEAD_DAYS * MS_PER_DAY,
    arriveStepDays: ARRIVE_SPAN_DAYS / steps,
    rows: samples,
  };
}
