export const MS_PER_DAY = 86_400_000;
export const CLOCK_START_MS = Date.UTC(1900, 0, 1);
export const CLOCK_END_MS = Date.UTC(2100, 11, 31);
export const CLOCK_SPAN_DAYS = (CLOCK_END_MS - CLOCK_START_MS) / MS_PER_DAY;

/** Playback speeds in simulated days per real second. */
export const SPEEDS_DAYS_PER_SECOND = [1, 10, 30, 100, 365.25, 3652.5] as const;

export type StopReason = 'start' | 'end';

export interface ClockState {
  /** Simulated time, milliseconds since the Unix epoch (UTC). Kept unrounded so repeated steps do not drift. */
  timeMs: number;
  playing: boolean;
  daysPerSecond: number;
  /** Why playback last stopped on its own; null while playing or after a manual pause. */
  stopped: StopReason | null;
}

export function clampTimeMs(timeMs: number): number {
  if (Number.isNaN(timeMs)) return CLOCK_START_MS;
  return Math.min(CLOCK_END_MS, Math.max(CLOCK_START_MS, timeMs));
}

/**
 * Advances the clock by real elapsed milliseconds. Negative speeds play backwards.
 * Hitting either end of the range clamps the time and stops playback.
 */
export function stepClock(state: ClockState, elapsedMs: number): ClockState {
  if (!state.playing || !(elapsedMs > 0)) return state;
  const next = state.timeMs + (elapsedMs * state.daysPerSecond * MS_PER_DAY) / 1000;
  if (next >= CLOCK_END_MS) return {...state, timeMs: CLOCK_END_MS, playing: false, stopped: 'end'};
  if (next <= CLOCK_START_MS) return {...state, timeMs: CLOCK_START_MS, playing: false, stopped: 'start'};
  return {...state, timeMs: next};
}

/** Starts playback; from the end of the range it restarts at the beginning so play is never a no-op. */
export function play(state: ClockState): ClockState {
  const atEnd = state.daysPerSecond >= 0 ? state.timeMs >= CLOCK_END_MS : state.timeMs <= CLOCK_START_MS;
  const timeMs = atEnd ? (state.daysPerSecond >= 0 ? CLOCK_START_MS : CLOCK_END_MS) : state.timeMs;
  return {...state, timeMs, playing: true, stopped: null};
}

export function pause(state: ClockState): ClockState {
  return {...state, playing: false, stopped: null};
}

/** A manual jump (slider or date field) clamps into range and clears a stop reason. */
export function seek(state: ClockState, timeMs: number): ClockState {
  return {...state, timeMs: clampTimeMs(timeMs), stopped: null};
}

export function setSpeed(state: ClockState, daysPerSecond: number): ClockState {
  return {...state, daysPerSecond};
}

export function dayIndexOf(timeMs: number): number {
  return Math.floor((clampTimeMs(timeMs) - CLOCK_START_MS) / MS_PER_DAY);
}

export function timeMsOfDayIndex(day: number): number {
  return clampTimeMs(CLOCK_START_MS + Math.round(day) * MS_PER_DAY);
}

/** Calendar day (UTC midnight) shown for a simulated time. */
export function wholeDay(timeMs: number): Date {
  return new Date(CLOCK_START_MS + dayIndexOf(timeMs) * MS_PER_DAY);
}

export function describeSpeed(daysPerSecond: number): string {
  const d = Math.abs(daysPerSecond);
  if (d >= 365) return `${+(d / 365.25).toFixed(1)} yr/s`;
  return `${d} d/s`;
}
