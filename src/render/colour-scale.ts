/** Top of the colour scale (km^2/s^2). Cells above it take the last colour; the scale is fixed so passes agree. */
export const C3_SCALE_MAX = 60;

// Viridis, evenly spaced. Low C3 is the cheap end and takes the bright colour, so the islands stand out.
const STOPS: readonly (readonly [number, number, number])[] = [
  [253, 231, 37], [181, 222, 43], [110, 206, 88], [53, 183, 121], [31, 158, 137],
  [38, 130, 142], [49, 104, 142], [62, 74, 137], [72, 40, 120], [68, 1, 84],
];

export function c3Colour(c3: number): [number, number, number] {
  const t = (Number.isNaN(c3) ? 1 : Math.min(1, Math.max(0, c3 / C3_SCALE_MAX))) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t));
  const f = t - i;
  const a = STOPS[i]!;
  const b = STOPS[i + 1]!;
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/**
 * RGBA pixels for a heat map of `cols` x `rows` values, flipped so grid row 0 (earliest arrival) is at the
 * bottom. A blank (NaN) cell takes `blank`, so it reads as empty space and not as a very high C3.
 */
export function heatmapPixels(
  c3: Float32Array, cols: number, rows: number, blank: readonly [number, number, number],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(cols * rows * 4);
  for (let row = 0; row < rows; row++) {
    const dest = (rows - 1 - row) * cols;
    for (let col = 0; col < cols; col++) {
      const v = c3[row * cols + col]!;
      const [r, g, b] = Number.isNaN(v) ? blank : c3Colour(v);
      const o = (dest + col) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
    }
  }
  return out;
}
