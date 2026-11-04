import {describe, expect, test} from 'bun:test';
import {earthMarsSpec} from '../core/porkchop';
import {cellAtPoint, nearestMarker, plotRect, pointOfDates} from './plot-geometry';

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

describe('dated markers', () => {
  const inside = {departMs: Date.UTC(2026, 5, 1), arriveMs: Date.UTC(2027, 0, 1)};

  test('a date pair on the plot maps to a point inside it, and one off the plot to null', () => {
    const p = pointOfDates(inside.departMs, inside.arriveMs, view, spec);
    expect(p).not.toBeNull();
    expect(pointOfDates(Date.UTC(2040, 0, 1), inside.arriveMs, view, spec)).toBeNull();
  });

  test('it inverts cellAtPoint to within a cell', () => {
    const p = pointOfDates(inside.departMs, inside.arriveMs, view, spec)!;
    const cell = cellAtPoint(p.x, p.y, view, spec)!;
    expect(Math.abs(cell.departMs - inside.departMs)).toBeLessThan(spec.departStepDays * 86_400_000);
  });

  test('nearestMarker picks the close marker and ignores a far click', () => {
    const p = pointOfDates(inside.departMs, inside.arriveMs, view, spec)!;
    expect(nearestMarker(p.x + 3, p.y - 3, view, spec, [inside])).toBe(0);
    expect(nearestMarker(p.x + 80, p.y, view, spec, [inside])).toBe(-1);
  });
});
