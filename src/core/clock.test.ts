import {expect, test} from 'bun:test';
import {
  CLOCK_END_MS, CLOCK_SPAN_DAYS, CLOCK_START_MS, MS_PER_DAY, SPEEDS_DAYS_PER_SECOND,
  type ClockState, dayIndexOf, describeSpeed, pause, play, seek, setSpeed, stepClock, timeMsOfDayIndex, wholeDay,
} from './clock';

const base: ClockState = {timeMs: Date.UTC(2000, 0, 1), playing: true, daysPerSecond: 1, stopped: null};

test('each speed advances by exactly speed x elapsed, however the elapsed time is split', () => {
  for (const speed of SPEEDS_DAYS_PER_SECOND) {
    const start = {...base, daysPerSecond: speed / 100};
    let s = start;
    for (let i = 0; i < 1000; i++) s = stepClock(s, 16);
    const oneShot = stepClock(start, 16_000);
    expect(Math.abs(s.timeMs - oneShot.timeMs)).toBeLessThan(1e-3);
    expect(oneShot.timeMs - start.timeMs).toBeCloseTo((16 * speed * MS_PER_DAY) / 100, 3);
  }
});

test('one real second at 1 d/s is one day; 365.25 d/s is a Julian year (a leap year ends 6h short)', () => {
  expect(stepClock(base, 1000).timeMs - base.timeMs).toBe(MS_PER_DAY);
  expect(wholeDay(stepClock({...base, daysPerSecond: 365.25}, 1000).timeMs).toISOString()).toBe('2000-12-31T00:00:00.000Z');
});

test('paused clocks and non-positive elapsed times do not move', () => {
  expect(stepClock(pause(base), 1000)).toEqual(pause(base));
  expect(stepClock(base, 0)).toBe(base);
  expect(stepClock(base, -50)).toBe(base);
  expect(stepClock(base, NaN)).toBe(base);
});

test('reaching the end clamps and stops with a reason', () => {
  const s = stepClock({...base, timeMs: CLOCK_END_MS - MS_PER_DAY, daysPerSecond: 3652.5}, 1000);
  expect(s).toMatchObject({timeMs: CLOCK_END_MS, playing: false, stopped: 'end'});
});

test('playing backwards stops at the start', () => {
  const s = stepClock({...base, timeMs: CLOCK_START_MS + MS_PER_DAY, daysPerSecond: -100}, 1000);
  expect(s).toMatchObject({timeMs: CLOCK_START_MS, playing: false, stopped: 'start'});
});

test('play from the end restarts at the beginning and clears the reason', () => {
  const ended = stepClock({...base, timeMs: CLOCK_END_MS - 1, daysPerSecond: 10}, 1000);
  const again = play(ended);
  expect(again).toMatchObject({timeMs: CLOCK_START_MS, playing: true, stopped: null});
});

test('seek clamps into the range and clears the stop reason', () => {
  const stopped: ClockState = {...base, playing: false, stopped: 'end'};
  expect(seek(stopped, Date.UTC(3000, 0, 1))).toMatchObject({timeMs: CLOCK_END_MS, stopped: null});
  expect(seek(stopped, Date.UTC(1800, 0, 1)).timeMs).toBe(CLOCK_START_MS);
  expect(seek(stopped, NaN).timeMs).toBe(CLOCK_START_MS);
});

test('setSpeed keeps position and play state', () => {
  expect(setSpeed(base, 30)).toEqual({...base, daysPerSecond: 30});
});

test('day indexes round-trip across the range and the slider span matches the range', () => {
  expect(CLOCK_SPAN_DAYS).toBe(dayIndexOf(CLOCK_END_MS));
  for (const day of [0, 1, 366, 36524, CLOCK_SPAN_DAYS]) expect(dayIndexOf(timeMsOfDayIndex(day))).toBe(day);
  expect(timeMsOfDayIndex(-5)).toBe(CLOCK_START_MS);
  expect(timeMsOfDayIndex(CLOCK_SPAN_DAYS + 10)).toBe(CLOCK_END_MS);
});

test('wholeDay drops the time of day', () => {
  expect(wholeDay(Date.UTC(2020, 5, 15, 13)).toISOString()).toBe('2020-06-15T00:00:00.000Z');
});

test('speed labels', () => {
  expect(SPEEDS_DAYS_PER_SECOND.map(describeSpeed)).toEqual(['1 d/s', '10 d/s', '30 d/s', '100 d/s', '1 yr/s', '10 yr/s']);
});
