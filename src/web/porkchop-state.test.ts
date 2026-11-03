import {expect, test} from 'bun:test';
import {earthMarsSpec, type PorkchopMessage, runPorkchop} from '../core/porkchop';
import {applyMessage, initialPlotState, plotDataOf, statusText} from './porkchop-state';

const spec = {...earthMarsSpec(Date.UTC(2026, 0, 1), 41)};

test('starts empty and computing, with axes data but no pixels', () => {
  const state = initialPlotState(spec);
  expect(state.phase).toBe('computing');
  expect(statusText(state)).toBe('Computing...');
  const data = plotDataOf(state);
  expect(data.c3Km2S2).toBeNull();
  expect(data.contours).toEqual([]);
});

test('shows the coarse grid first, then the full grid once done', () => {
  let state = initialPlotState(spec);
  const phases: string[] = [];
  const shown: number[] = [];
  runPorkchop(spec, (m: PorkchopMessage) => {
    state = applyMessage(state, m);
    phases.push(`${m.type}:${state.phase}`);
    shown.push(state.shownSpec.cols);
  });
  expect(phases[0]).toBe('coarse:refining');
  expect(phases.at(-1)).toBe('done:ready');
  expect(shown[0]).toBeLessThan(spec.cols);
  expect(shown.at(-1)).toBe(spec.cols);
  expect(statusText(state)).toBe('');
  const data = plotDataOf(state);
  expect(data.c3Km2S2?.length).toBe(spec.cols * spec.rows);
  expect(data.contours.some((c) => c.segments.length > 0)).toBe(true);
});

test('bands land at their own rows and do not change what is shown', () => {
  const state = initialPlotState(spec);
  const c3 = new Float32Array(spec.cols * 2).fill(7);
  const after = applyMessage(state, {
    type: 'band', rowStart: 3, rowCount: 2, c3Km2S2: c3, arrivalVInfKmS: c3,
  });
  expect(after.fineC3[3 * spec.cols]).toBe(7);
  expect(after.fineC3[2 * spec.cols]).toBeNaN();
  expect(after.c3Km2S2).toBeNull();
});
