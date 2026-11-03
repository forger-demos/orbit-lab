import {expect, test} from 'bun:test';
import {yearTicks} from './date-ticks';

test('labels January 1 of each year inside the range', () => {
  const ticks = yearTicks(Date.UTC(2026, 5, 1), Date.UTC(2029, 5, 1));
  expect(ticks.map((t) => t.label)).toEqual(['2027', '2028', '2029']);
  expect(ticks[0]!.ms).toBe(Date.UTC(2027, 0, 1));
});

test('includes a start exactly on January 1', () => {
  expect(yearTicks(Date.UTC(2026, 0, 1), Date.UTC(2027, 6, 1)).map((t) => t.label)).toEqual(['2026', '2027']);
});

test('thins to the maximum tick count', () => {
  const ticks = yearTicks(Date.UTC(1900, 0, 1), Date.UTC(2100, 0, 1), 8);
  expect(ticks.length).toBeLessThanOrEqual(8);
  expect(ticks.length).toBeGreaterThan(1);
});

test('empty or reversed ranges give no ticks', () => {
  expect(yearTicks(5, 5)).toEqual([]);
  expect(yearTicks(10, 5)).toEqual([]);
  expect(yearTicks(NaN, 5)).toEqual([]);
});
