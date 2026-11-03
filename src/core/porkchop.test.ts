import {describe, expect, test} from 'bun:test';
import {MS_PER_DAY} from './clock';
import {
  BAND_ROWS, coarsen, computeBand, computeGrid, DEFAULT_GRID_SAMPLES, earthMarsSpec, type GridSpec, isValidSpec,
  MAX_CELLS, type PorkchopMessage, runPorkchop,
} from './porkchop';
import {transfer} from './transfer';

const T0 = Date.UTC(2019, 0, 1);

function spec(overrides: Partial<GridSpec> = {}): GridSpec {
  return {
    from: 'earthMoonBarycenter', to: 'mars', departStartMs: T0, departStepDays: 10, cols: 301,
    arriveStartMs: T0 + 90 * MS_PER_DAY, arriveStepDays: 10, rows: 341, ...overrides,
  };
}

describe('grid shape and values', () => {
  const small = spec({cols: 31, rows: 41});
  const grid = computeGrid(small);

  test('has one value per cell in both arrays', () => {
    expect(grid.c3Km2S2.length).toBe(31 * 41);
    expect(grid.arrivalVInfKmS.length).toBe(31 * 41);
    expect(grid.rowStart).toBe(0);
    expect(grid.rowCount).toBe(41);
  });

  test('a cell equals the single-transfer answer for its dates', () => {
    const c = 12;
    const r = 30;
    const direct = transfer(
      'earthMoonBarycenter', 'mars',
      new Date(T0 + c * 10 * MS_PER_DAY), new Date(T0 + (90 + r * 10) * MS_PER_DAY),
    );
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    expect(grid.c3Km2S2[r * 31 + c]).toBeCloseTo(direct.c3Km2S2, 3);
    expect(grid.arrivalVInfKmS[r * 31 + c]).toBeCloseTo(direct.arrivalVInfKmS, 3);
  });

  test('cells with arrival not after launch are blank', () => {
    const early = computeGrid(spec({cols: 5, rows: 5, arriveStartMs: T0 - 40 * MS_PER_DAY, arriveStepDays: 10}));
    expect(Number.isNaN(early.c3Km2S2[0])).toBe(true);
    expect(Number.isNaN(early.arrivalVInfKmS[4])).toBe(true);
  });

  test('mixes blank and solved cells on a real plot', () => {
    const solved = grid.c3Km2S2.filter((v) => !Number.isNaN(v)).length;
    expect(solved).toBeGreaterThan(0);
    expect(solved).toBeLessThan(grid.c3Km2S2.length);
    expect(grid.c3Km2S2.every((v) => Number.isNaN(v) || v >= 0)).toBe(true);
  });

});

describe('bands', () => {
  test('bands stitch back to the whole grid', () => {
    const s = spec({cols: 20, rows: 50});
    const whole = computeGrid(s);
    const a = computeBand(s, 0, 30);
    const b = computeBand(s, 30, 30);
    expect(b.rowCount).toBe(20);
    expect([...a.c3Km2S2, ...b.c3Km2S2]).toEqual([...whole.c3Km2S2]);
  });
});

describe('never throws', () => {
  const hostile: Partial<GridSpec>[] = [
    {cols: 0}, {rows: -3}, {cols: 2.5}, {cols: Infinity}, {departStepDays: NaN}, {departStartMs: NaN},
    {arriveStartMs: Infinity}, {cols: MAX_CELLS, rows: 2}, {departStartMs: 8.64e15}, {arriveStartMs: 8.64e15}, {arriveStepDays: 1e12},
    {departStepDays: -10, cols: 10, rows: 10},
  ];
  for (const [i, o] of hostile.entries()) {
    test(`hostile spec ${i}`, () => {
      const s = spec(o);
      expect(() => computeGrid(s)).not.toThrow();
      const g = computeGrid(s);
      expect(g.c3Km2S2.length).toBe(g.arrivalVInfKmS.length);
      if (!isValidSpec(s)) expect(g.c3Km2S2.length).toBe(0);
      else expect(g.c3Km2S2.length).toBe(s.cols * s.rows);
    });
  }

  test('bad row ranges give an empty band', () => {
    const s = spec({cols: 4, rows: 4});
    expect(computeBand(s, -1, 2).c3Km2S2.length).toBe(0);
    expect(computeBand(s, 1.5, 2).c3Km2S2.length).toBe(0);
    expect(computeBand(s, 10, 2).c3Km2S2.length).toBe(0);
    expect(computeBand(s, 0, NaN).c3Km2S2.length).toBe(0);
  });
});

describe('coarse pass', () => {
  test('covers the same extents with fewer samples', () => {
    const fine = earthMarsSpec(T0);
    const coarse = coarsen(fine, 4);
    expect(coarse.cols).toBe(151);
    expect(coarse.departStartMs + (coarse.cols - 1) * coarse.departStepDays * MS_PER_DAY).toBeCloseTo(
      fine.departStartMs + (fine.cols - 1) * fine.departStepDays * MS_PER_DAY, -2,
    );
  });

  test('a factor below one leaves the grid alone', () => {
    expect(coarsen(spec(), 0)).toEqual(spec());
  });
});

describe('runPorkchop message order', () => {
  test('coarse first, then bands covering every row once, then done', () => {
    const s = spec({cols: 41, rows: 61});
    const messages: PorkchopMessage[] = [];
    runPorkchop(s, (m) => messages.push(m));
    expect(messages[0]?.type).toBe('coarse');
    expect(messages.at(-1)?.type).toBe('done');
    const rows: number[] = [];
    for (const m of messages) {
      if (m.type === 'band') for (let r = 0; r < m.rowCount; r++) rows.push(m.rowStart + r);
    }
    expect(rows).toEqual(Array.from({length: 61}, (_, i) => i));
    expect(messages.filter((m) => m.type === 'band').length).toBe(Math.ceil(61 / BAND_ROWS));
  });

  test('an invalid spec ends at once', () => {
    const messages: PorkchopMessage[] = [];
    runPorkchop(spec({cols: 0}), (m) => messages.push(m));
    expect(messages).toEqual([{type: 'done'}]);
  });
});

describe('Earth to Mars windows', () => {
  // Launch dates from 2019 for about eight years; each window is a run of launch dates whose cheapest arrival is low.
  const grid = computeGrid(spec());
  const cols = 301;
  const cheapest = Array.from({length: cols}, (_, c) => {
    let best = Infinity;
    for (let r = 0; r < 341; r++) {
      const v = grid.c3Km2S2[r * cols + c]!;
      if (v < best) best = v;
    }
    return best;
  });

  test('separate islands appear about one synodic period apart', () => {
    const centres: number[] = [];
    let c = 0;
    while (c < cols) {
      if (cheapest[c]! >= 20) { c++; continue; }
      let best = c;
      let end = c;
      while (end < cols && cheapest[end]! < 20) {
        if (cheapest[end]! < cheapest[best]!) best = end;
        end++;
      }
      centres.push(best);
      c = end;
    }
    expect(centres.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < centres.length; i++) {
      const spacingDays = (centres[i]! - centres[i - 1]!) * 10;
      expect(Math.abs(spacingDays - 779.9)).toBeLessThan(60);
    }
  });

  test('the 2020 window is cheap and the gap between windows is blocked', () => {
    const july2020 = Math.round((Date.UTC(2020, 6, 30) - T0) / (10 * MS_PER_DAY));
    expect(cheapest[july2020]!).toBeLessThan(20);
    const gap = Math.round((Date.UTC(2021, 10, 1) - T0) / (10 * MS_PER_DAY));
    expect(cheapest[gap]!).toBeGreaterThan(35);
  });
});

describe('timing guard', () => {
  test('a coarse-sized grid computes well inside a generous bound', () => {
    const s = earthMarsSpec(T0, 151);
    const start = performance.now();
    const g = computeGrid(s);
    const elapsed = performance.now() - start;
    expect(g.c3Km2S2.length).toBe(151 * 151);
    // Orders of magnitude above the measured cost, so only an accidental quadratic or per-cell ephemeris blows it.
    expect(elapsed).toBeLessThan(3000);
  });

  test('the default resolution is odd so the coarse pass lands on the same edges', () => {
    expect((DEFAULT_GRID_SAMPLES - 1) % 4).toBe(0);
  });
});
