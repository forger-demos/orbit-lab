import {describe, expect, test} from 'bun:test';
import {contourSegments} from './contour';

const grid = (rows: number[][]): {values: Float32Array; cols: number; rows: number} => ({
  values: Float32Array.from(rows.flat()), cols: rows[0]!.length, rows: rows.length,
});

describe('contourSegments', () => {
  test('a linear ramp gives a straight line at the interpolated position', () => {
    const g = grid([[0, 10, 20], [0, 10, 20], [0, 10, 20]]);
    const seg = contourSegments(g.values, g.cols, g.rows, 5);
    expect(seg.length).toBe(2 * 4);
    for (let k = 0; k < seg.length; k += 4) {
      expect(seg[k]).toBeCloseTo(0.5);
      expect(seg[k + 2]).toBeCloseTo(0.5);
    }
  });

  test('a single high peak makes a closed diamond of four segments', () => {
    const g = grid([[0, 0, 0], [0, 10, 0], [0, 0, 0]]);
    const seg = contourSegments(g.values, g.cols, g.rows, 5);
    expect(seg.length).toBe(4 * 4);
    for (let k = 0; k < seg.length; k += 2) {
      expect(Math.abs(seg[k]! - 1) + Math.abs(seg[k + 1]! - 1)).toBeCloseTo(0.5);
    }
  });

  test('a level outside the data gives nothing', () => {
    const g = grid([[1, 2], [3, 4]]);
    expect(contourSegments(g.values, g.cols, g.rows, 100).length).toBe(0);
    expect(contourSegments(g.values, g.cols, g.rows, -100).length).toBe(0);
  });

  test('cells touching a blank value draw nothing', () => {
    const g = grid([[0, NaN], [10, 10]]);
    expect(contourSegments(g.values, g.cols, g.rows, 5).length).toBe(0);
  });

  test('a saddle yields two segments that keep the matching corners apart', () => {
    const high = grid([[0, 10], [10, 0]]);
    const low = grid([[0, 10], [10, 0]]);
    expect(contourSegments(high.values, 2, 2, 5).length).toBe(8);
    expect(contourSegments(low.values, 2, 2, 5).length).toBe(8);
    const opposite = grid([[10, 0], [0, 10]]);
    expect(contourSegments(opposite.values, 2, 2, 5).length).toBe(8);
    const centreHigh = grid([[0, 9], [9, 0]]);
    expect(contourSegments(centreHigh.values, 2, 2, 4).length).toBe(8);
  });

  test('every end point lies on the level', () => {
    const w = 20;
    const values = Float32Array.from({length: w * w}, (_, i) => Math.hypot((i % w) - 9.5, Math.floor(i / w) - 9.5));
    const seg = contourSegments(values, w, w, 6);
    expect(seg.length).toBeGreaterThan(0);
    for (let k = 0; k < seg.length; k += 2) {
      expect(Math.hypot(seg[k]! - 9.5, seg[k + 1]! - 9.5)).toBeGreaterThan(5.6);
      expect(Math.hypot(seg[k]! - 9.5, seg[k + 1]! - 9.5)).toBeLessThan(6.1);
    }
  });

  test('degenerate shapes return an empty result', () => {
    expect(contourSegments(new Float32Array(0), 0, 0, 1).length).toBe(0);
    expect(contourSegments(new Float32Array(3), 3, 1, 1).length).toBe(0);
    expect(contourSegments(new Float32Array(2), 2, 2, 1).length).toBe(0);
    expect(contourSegments(new Float32Array(4), 1.5, 2, 1).length).toBe(0);
  });
});
