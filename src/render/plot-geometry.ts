import {MS_PER_DAY} from '../core/clock';
import {type GridSpec} from '../core/porkchop';
import {type Viewport} from './projection';

const MARGIN = {left: 54, right: 14, top: 14, bottom: 70};

/** Where the plot rectangle sits inside the canvas. */
export function plotRect(view: Viewport): {x: number; y: number; w: number; h: number} {
  return {
    x: MARGIN.left,
    y: MARGIN.top,
    w: Math.max(1, view.width - MARGIN.left - MARGIN.right),
    h: Math.max(1, view.height - MARGIN.top - MARGIN.bottom),
  };
}

/** The launch and arrival dates of the grid cell under a point in canvas pixels, or null outside the plot. */
export function cellAtPoint(
  x: number, y: number, view: Viewport, spec: GridSpec,
): {departMs: number; arriveMs: number} | null {
  const r = plotRect(view);
  if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return null;
  const col = Math.min(spec.cols - 1, Math.max(0, Math.round(((x - r.x) / r.w) * spec.cols - 0.5)));
  const row = Math.min(spec.rows - 1, Math.max(0, Math.round(((r.y + r.h - y) / r.h) * spec.rows - 0.5)));
  return {
    departMs: spec.departStartMs + col * spec.departStepDays * MS_PER_DAY,
    arriveMs: spec.arriveStartMs + row * spec.arriveStepDays * MS_PER_DAY,
  };
}

/** Canvas position of a launch and arrival date pair, or null when it falls outside the plot. */
export function pointOfDates(
  departMs: number, arriveMs: number, view: Viewport, spec: GridSpec,
): {x: number; y: number} | null {
  const r = plotRect(view);
  const x = r.x + ((((departMs - spec.departStartMs) / (spec.departStepDays * MS_PER_DAY)) + 0.5) / spec.cols) * r.w;
  const y = r.y + r.h - ((((arriveMs - spec.arriveStartMs) / (spec.arriveStepDays * MS_PER_DAY)) + 0.5) / spec.rows) * r.h;
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h ? {x, y} : null;
}

/** The nearest of the given dated points within `radius` pixels of (x, y), or -1. */
export function nearestMarker(
  x: number, y: number, view: Viewport, spec: GridSpec,
  markers: readonly {departMs: number; arriveMs: number}[], radius = 12,
): number {
  let best = -1;
  let bestDistance = radius;
  markers.forEach((m, i) => {
    const p = pointOfDates(m.departMs, m.arriveMs, view, spec);
    if (!p) return;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bestDistance) { best = i; bestDistance = d; }
  });
  return best;
}
