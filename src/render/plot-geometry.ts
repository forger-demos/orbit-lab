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
