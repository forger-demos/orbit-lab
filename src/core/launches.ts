import {MS_PER_DAY} from './clock';
import {computeBand, type GridSpec} from './porkchop';

/** One reviewed record of a real Earth to Mars launch. Every number carries a primary source. */
export interface RealLaunch {
  id: string;
  name: string;
  launchMs: number;
  arriveMs: number;
  /** Published departure C3 in km^2/s^2, or null when no primary source has been read; null is never filled in. */
  publishedC3Km2S2: number | null;
  /** Where the dates and the C3 come from; the validation note repeats each link. */
  sources: readonly {label: string; url: string}[];
}

export const NOTE_URL = 'docs/research/validation.md';

export const REAL_LAUNCHES: readonly RealLaunch[] = [
  {
    id: 'mars2020',
    name: 'Mars 2020 Perseverance',
    launchMs: Date.UTC(2020, 6, 30, 11, 50),
    arriveMs: Date.UTC(2021, 1, 18, 20, 36, 50),
    publishedC3Km2S2: 14.49,
    sources: [
      {label: 'ULA mission booklet (C3 14.49)', url: 'https://www.ulalaunch.com/docs/default-source/launch-booklets/mars2020_mobrochure_200717.pdf'},
      {label: 'JPL press kit (dates)', url: 'https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/'},
    ],
  },
  {
    id: 'maven',
    name: 'MAVEN',
    launchMs: Date.UTC(2013, 10, 18),
    arriveMs: Date.UTC(2014, 8, 22),
    publishedC3Km2S2: null,
    sources: [{label: 'Planetary Society MAVEN launch FAQ (dates)', url: 'https://www.planetary.org/articles/11140900-maven-launch-faq'}],
  },
  {
    id: 'msl',
    name: 'Mars Science Laboratory',
    launchMs: Date.UTC(2011, 10, 26),
    arriveMs: Date.UTC(2012, 7, 6),
    publishedC3Km2S2: null,
    sources: [{label: 'Abilleira, MSL trajectory reconstruction, NTRS (dates)', url: 'https://ntrs.nasa.gov/citations/20150007334'}],
  },
];

/** The lowest-C3 cell of a grid near a real launch. */
export interface BestCell {
  departMs: number;
  arriveMs: number;
  c3Km2S2: number;
}

/** How far from the real dates the search looks, in days. */
export const SEARCH_LAUNCH_DAYS = 10;
export const SEARCH_ARRIVE_DAYS = 15;

/**
 * The lowest-C3 cell within the search window around a launch's real launch and arrival dates, or null when the
 * grid does not cover the window or has no solution there. Reads only the cells inside the window.
 */
export function bestCellNear(spec: GridSpec, launch: RealLaunch): BestCell | null {
  const colOf = (ms: number): number => (ms - spec.departStartMs) / (spec.departStepDays * MS_PER_DAY);
  const rowOf = (ms: number): number => (ms - spec.arriveStartMs) / (spec.arriveStepDays * MS_PER_DAY);
  const c0 = Math.max(0, Math.ceil(colOf(launch.launchMs - SEARCH_LAUNCH_DAYS * MS_PER_DAY)));
  const c1 = Math.min(spec.cols - 1, Math.floor(colOf(launch.launchMs + SEARCH_LAUNCH_DAYS * MS_PER_DAY)));
  const r0 = Math.max(0, Math.ceil(rowOf(launch.arriveMs - SEARCH_ARRIVE_DAYS * MS_PER_DAY)));
  const r1 = Math.min(spec.rows - 1, Math.floor(rowOf(launch.arriveMs + SEARCH_ARRIVE_DAYS * MS_PER_DAY)));
  if (c0 > c1 || r0 > r1) return null;
  const band = computeBand(spec, r0, r1 - r0 + 1);
  let best: BestCell | null = null;
  for (let r = 0; r < band.rowCount; r++) {
    for (let c = c0; c <= c1; c++) {
      const c3 = band.c3Km2S2[r * spec.cols + c]!;
      if (Number.isNaN(c3) || (best && c3 >= best.c3Km2S2)) continue;
      best = {
        departMs: spec.departStartMs + c * spec.departStepDays * MS_PER_DAY,
        arriveMs: spec.arriveStartMs + (r0 + r) * spec.arriveStepDays * MS_PER_DAY,
        c3Km2S2: c3,
      };
    }
  }
  return best;
}

/** True when the grid's launch axis covers the real launch date, so a marker can be placed. */
export function launchOnGrid(spec: GridSpec, launch: RealLaunch): boolean {
  const end = spec.departStartMs + (spec.cols - 1) * spec.departStepDays * MS_PER_DAY;
  const arriveEnd = spec.arriveStartMs + (spec.rows - 1) * spec.arriveStepDays * MS_PER_DAY;
  return launch.launchMs >= spec.departStartMs && launch.launchMs <= end &&
    launch.arriveMs >= spec.arriveStartMs && launch.arriveMs <= arriveEnd;
}

/** Tooltip text: launch, source and result. Without a published C3 it states dates only. */
export function describeLaunch(launch: RealLaunch, best: BestCell | null): string {
  const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
  const real = `${launch.name}: launched ${day(launch.launchMs)}, arrived ${day(launch.arriveMs)}.`;
  const published = launch.publishedC3Km2S2 === null
    ? 'No published C3 read from a primary source; dates only.'
    : `Published C3 ${launch.publishedC3Km2S2} km^2/s^2.`;
  const found = best
    ? `Best cell nearby: launch ${day(best.departMs)}, C3 ${best.c3Km2S2.toFixed(1)} km^2/s^2.`
    : 'No transfer found near these dates on this plot.';
  return `${real} ${published} ${found} Source: ${launch.sources[0]!.label}.`;
}
