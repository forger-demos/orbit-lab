import {expect, test} from 'bun:test';
import {C3_SCALE_MAX, c3Colour, heatmapPixels} from './colour-scale';

test('the scale runs from bright at low C3 to dark at the top and clamps outside', () => {
  const low = c3Colour(0);
  const high = c3Colour(C3_SCALE_MAX);
  expect(low[0] + low[1] + low[2]).toBeGreaterThan(high[0] + high[1] + high[2]);
  expect(c3Colour(-5)).toEqual(low);
  expect(c3Colour(1e9)).toEqual(high);
  expect(c3Colour(NaN).every(Number.isFinite)).toBe(true);
});

test('heat map pixels put row 0 at the bottom and blank cells in the blank colour', () => {
  const c3 = Float32Array.from([0, NaN, C3_SCALE_MAX, 30]);
  const px = heatmapPixels(c3, 2, 2, [1, 2, 3]);
  expect(px.length).toBe(16);
  const bottomLeft = [...px.slice(8, 12)];
  expect(bottomLeft).toEqual([...c3Colour(0), 255]);
  const bottomRight = [...px.slice(12, 16)];
  expect(bottomRight).toEqual([1, 2, 3, 255]);
  const topLeft = [...px.slice(0, 4)];
  expect(topLeft).toEqual([...c3Colour(C3_SCALE_MAX), 255]);
});
