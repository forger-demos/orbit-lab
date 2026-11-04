import {expect, test} from 'bun:test';
import {earthMarsSpec} from '../core/porkchop';
import {cellAtPoint, plotRect} from './plot-geometry';

const view = {width: 600, height: 400};
const spec = earthMarsSpec(Date.UTC(2026, 0, 1), 41);

test('picks nothing outside the plot rectangle', () => {
  expect(cellAtPoint(1, 1, view, spec)).toBeNull();
  const r = plotRect(view);
  expect(cellAtPoint(r.x + r.w + 5, r.y + 5, view, spec)).toBeNull();
});

test('the corners pick the first and last cells, and the pick lands on a grid sample', () => {
  const r = plotRect(view);
  const bottomLeft = cellAtPoint(r.x + 1, r.y + r.h - 1, view, spec)!;
  expect(bottomLeft).toEqual({departMs: spec.departStartMs, arriveMs: spec.arriveStartMs});
  const topRight = cellAtPoint(r.x + r.w - 1, r.y + 1, view, spec)!;
  expect(topRight.departMs).toBe(spec.departStartMs + (spec.cols - 1) * spec.departStepDays * 86_400_000);
  expect(topRight.arriveMs).toBeCloseTo(spec.arriveStartMs + (spec.rows - 1) * spec.arriveStepDays * 86_400_000, 3);
});
