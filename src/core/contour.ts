/**
 * Marching squares over a row-major grid of `cols` x `rows` samples. Returns segments as
 * [x1, y1, x2, y2, ...] in grid coordinates (sample i, j sits at x = i, y = j), with end points interpolated
 * linearly along cell edges. A cell with any NaN corner is skipped, so blank regions never draw a line.
 */
export function contourSegments(values: Float32Array, cols: number, rows: number, level: number): Float32Array {
  const out: number[] = [];
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2 || values.length < cols * rows) {
    return new Float32Array(0);
  }
  const at = (x: number, y: number): number => values[y * cols + x]!;
  const cross = (a: number, b: number): number => (level - a) / (b - a);
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const tl = at(x, y);
      const tr = at(x + 1, y);
      const br = at(x + 1, y + 1);
      const bl = at(x, y + 1);
      if (Number.isNaN(tl + tr + br + bl)) continue;
      const code = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const top: [number, number] = [x + cross(tl, tr), y];
      const right: [number, number] = [x + 1, y + cross(tr, br)];
      const bottom: [number, number] = [x + cross(bl, br), y + 1];
      const left: [number, number] = [x, y + cross(tl, bl)];
      const push = (a: [number, number], b: [number, number]): void => {
        out.push(a[0], a[1], b[0], b[1]);
      };
      switch (code) {
        case 1: case 14: push(left, bottom); break;
        case 2: case 13: push(bottom, right); break;
        case 3: case 12: push(left, right); break;
        case 4: case 11: push(top, right); break;
        case 6: case 9: push(top, bottom); break;
        case 7: case 8: push(left, top); break;
        default: {
          // Saddle: the cell centre decides which pair of corners the contour keeps apart.
          const centreHigh = (tl + tr + br + bl) / 4 >= level;
          if ((code === 5) === centreHigh) { push(left, top); push(bottom, right); }
          else { push(top, right); push(left, bottom); }
        }
      }
    }
  }
  return Float32Array.from(out);
}

/** Arrival v-infinity levels (km/s) drawn as contours on the Earth to Mars plot. */
export const ARRIVAL_CONTOUR_LEVELS_KM_S: readonly number[] = [3, 4, 5, 6, 8];
