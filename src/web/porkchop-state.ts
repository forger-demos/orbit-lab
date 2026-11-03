import {ARRIVAL_CONTOUR_LEVELS_KM_S, contourSegments} from '../core/contour';
import {type GridSpec, type PorkchopMessage} from '../core/porkchop';
import {type PlotData} from '../render/draw-porkchop';

export type PlotPhase = 'computing' | 'refining' | 'ready';

export interface PlotState {
  spec: GridSpec;
  phase: PlotPhase;
  /** The grid on screen: the coarse pass, then the full-resolution grid once its bands arrive. */
  shownSpec: GridSpec;
  c3Km2S2: Float32Array | null;
  arrivalVInfKmS: Float32Array | null;
  /** Full-resolution accumulators filled band by band. */
  fineC3: Float32Array;
  fineVInf: Float32Array;
}

export function initialPlotState(spec: GridSpec): PlotState {
  const n = spec.cols * spec.rows;
  return {
    spec, phase: 'computing', shownSpec: spec, c3Km2S2: null, arrivalVInfKmS: null,
    fineC3: new Float32Array(n).fill(NaN), fineVInf: new Float32Array(n).fill(NaN),
  };
}

/**
 * Folds one worker message into the state. The coarse grid is shown until the last band lands; partial bands
 * are not shown on their own because they would paint a half-fine, half-blank plot.
 */
export function applyMessage(state: PlotState, message: PorkchopMessage): PlotState {
  if (message.type === 'coarse') {
    return {
      ...state, phase: 'refining', shownSpec: message.spec,
      c3Km2S2: message.c3Km2S2, arrivalVInfKmS: message.arrivalVInfKmS,
    };
  }
  if (message.type === 'band') {
    const offset = message.rowStart * state.spec.cols;
    state.fineC3.set(message.c3Km2S2, offset);
    state.fineVInf.set(message.arrivalVInfKmS, offset);
    return state;
  }
  return {
    ...state, phase: 'ready', shownSpec: state.spec, c3Km2S2: state.fineC3, arrivalVInfKmS: state.fineVInf,
  };
}

export function plotDataOf(state: PlotState): PlotData {
  const {shownSpec: spec, arrivalVInfKmS} = state;
  const contours = arrivalVInfKmS
    ? ARRIVAL_CONTOUR_LEVELS_KM_S.map((level) => ({
        level, segments: contourSegments(arrivalVInfKmS, spec.cols, spec.rows, level),
      }))
    : [];
  return {spec, c3Km2S2: state.c3Km2S2, contours};
}

export function statusText(state: PlotState): string {
  return state.phase === 'computing' ? 'Computing...' : state.phase === 'refining' ? 'Refining...' : '';
}
