import {describe, expect, test} from 'bun:test';
import {MS_PER_DAY} from './clock';
import {bestCellNear, describeLaunch, launchOnGrid, REAL_LAUNCHES, SEARCH_ARRIVE_DAYS, SEARCH_LAUNCH_DAYS} from './launches';
import {earthMarsSpec} from './porkchop';

const specFor = (launchMs: number) => earthMarsSpec(Date.UTC(new Date(launchMs).getUTCFullYear() - 1, 0, 1));

describe('the reviewed table', () => {
  test('every record has dates in order and at least one https source', () => {
    for (const l of REAL_LAUNCHES) {
      expect(l.arriveMs).toBeGreaterThan(l.launchMs);
      expect(l.sources.length).toBeGreaterThan(0);
      for (const s of l.sources) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  test('only Mars 2020 asserts a C3; MAVEN and MSL stay dates only', () => {
    const c3 = Object.fromEntries(REAL_LAUNCHES.map((l) => [l.id, l.publishedC3Km2S2]));
    expect(c3).toEqual({mars2020: 14.49, maven: null, msl: null});
  });
});

describe.each(REAL_LAUNCHES.map((l) => [l.name, l] as const))('%s', (_name, launch) => {
  const spec = specFor(launch.launchMs);
  const best = bestCellNear(spec, launch);

  test('the real dates sit on the plot', () => {
    expect(launchOnGrid(spec, launch)).toBe(true);
  });

  test('the best cell lands within days of the real launch and arrival', () => {
    if (!best) throw new Error('no cell found');
    expect(Math.abs(best.departMs - launch.launchMs) / MS_PER_DAY).toBeLessThanOrEqual(SEARCH_LAUNCH_DAYS + 0.5);
    expect(Math.abs(best.arriveMs - launch.arriveMs) / MS_PER_DAY).toBeLessThanOrEqual(SEARCH_ARRIVE_DAYS + 0.5);
  });

  test('where a C3 is published the best cell is within ten percent of it', () => {
    if (!best) throw new Error('no cell found');
    if (launch.publishedC3Km2S2 === null) return;
    expect(Math.abs(best.c3Km2S2 - launch.publishedC3Km2S2) / launch.publishedC3Km2S2).toBeLessThan(0.1);
  });

  test('the tooltip names the source and asserts no C3 that is not published', () => {
    const text = describeLaunch(launch, best);
    expect(text).toContain(launch.sources[0]!.label);
    if (launch.publishedC3Km2S2 === null) expect(text).toContain('dates only');
    else expect(text).toContain(`Published C3 ${launch.publishedC3Km2S2}`);
  });
});

test('a grid that does not cover the launch gives no best cell and no marker', () => {
  const mars2020 = REAL_LAUNCHES[0]!;
  const spec = earthMarsSpec(Date.UTC(2030, 0, 1));
  expect(bestCellNear(spec, mars2020)).toBeNull();
  expect(launchOnGrid(spec, mars2020)).toBe(false);
  expect(describeLaunch(mars2020, null)).toContain('No transfer found');
});
