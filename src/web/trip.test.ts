import {expect, test} from 'bun:test';
import {pause, play, seek, wholeDay} from '../core/clock';
import {AU_KM} from '../core/ephemeris';
import {bodyState} from '../core/transfer';
import {norm, scale, sub} from '../core/vec';
import {describeFlight, planTrip, stopAtArrival, tripOnDay} from './trip';

const EARTH = 'earthMoonBarycenter';
const DEPART = Date.UTC(2026, 9, 29);
const ARRIVE = Date.UTC(2027, 7, 9);

function plan() {
  const r = planTrip(EARTH, 'mars', DEPART, ARRIVE);
  if (!r.ok) throw new Error(r.message);
  return r.plan;
}

test('no ship before launch; the ship starts at Earth and ends at Mars', () => {
  const p = plan();
  expect(tripOnDay(p, new Date(DEPART - 86_400_000)).shipAu).toBeNull();
  const start = tripOnDay(p, new Date(DEPART)).shipAu!;
  const earth = scale(bodyState('earthMoonBarycenter', new Date(DEPART)).rKm, 1 / AU_KM);
  expect(norm(sub(start, earth))).toBeLessThan(1e-6);
  const end = tripOnDay(p, wholeDay(ARRIVE)).shipAu!;
  const mars = scale(bodyState('mars', new Date(ARRIVE)).rKm, 1 / AU_KM);
  expect(norm(sub(end, mars))).toBeLessThan(1e-5);
  expect(tripOnDay(p, new Date(ARRIVE + 30 * 86_400_000)).shipAu).toEqual(end);
});

test('the same pick drawn twice is the same arc, and another pick replaces it', () => {
  const a = plan();
  const b = planTrip(EARTH, 'mars', DEPART + 8 * 86_400_000, ARRIVE);
  if (!b.ok) throw new Error(b.message);
  expect(plan().pathAu).toEqual(a.pathAu);
  expect(b.plan.pathAu).not.toEqual(a.pathAu);
});

test('a pick with arrival before launch gives a message and no plan', () => {
  const r = planTrip(EARTH, 'mars', ARRIVE, DEPART);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.message).toContain('arrival must be after launch');
});

test('playback stops exactly at arrival and not before', () => {
  const running = play(seek({timeMs: 0, playing: false, daysPerSecond: 30, stopped: null}, ARRIVE - 1000));
  expect(stopAtArrival(running, ARRIVE)).toBe(running);
  const past = {...running, timeMs: ARRIVE + 5 * 86_400_000};
  const stopped = stopAtArrival(past, ARRIVE);
  expect(stopped.playing).toBe(false);
  expect(stopped.timeMs).toBe(ARRIVE);
  const idle = pause(past);
  expect(stopAtArrival(idle, ARRIVE)).toBe(idle);
});

test('describes the flight in days', () => {
  expect(describeFlight(plan())).toBe('Showing a 284-day transfer.');
});

test('plans an arc for another pair that ends at the chosen destination', () => {
  const r = planTrip(EARTH, 'venus', Date.UTC(2026, 9, 1), Date.UTC(2027, 1, 20));
  if (!r.ok) throw new Error(r.message);
  const end = r.plan.pathAu.at(-1)!;
  const venus = scale(bodyState('venus', new Date(Date.UTC(2027, 1, 20))).rKm, 1 / AU_KM);
  expect(norm(sub(end, venus))).toBeLessThan(0.01);
});
