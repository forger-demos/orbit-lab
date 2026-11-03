import {type Vec3} from '../core/vec';

export interface Viewport {
  width: number;
  height: number;
}

/** Outermost planet distance the view must fit, in AU (Neptune's aphelion with a little margin). */
export const OUTER_EDGE_AU = 30.5;

const MARGIN_PX = 28;

/**
 * Maps a heliocentric ecliptic position (AU) to canvas pixels, looking down on the ecliptic with the Sun at
 * the centre. Distance is compressed with a square root, otherwise the four inner planets sit inside a
 * few pixels of the Sun; the angle is untouched.
 */
export function project(posAu: Vec3, view: Viewport): {x: number; y: number} {
  const r = Math.hypot(posAu[0], posAu[1]);
  const radiusPx = Math.min(view.width, view.height) / 2 - MARGIN_PX;
  const k = r === 0 ? 0 : (Math.sqrt(r / OUTER_EDGE_AU) * radiusPx) / r;
  return {x: view.width / 2 + posAu[0] * k, y: view.height / 2 - posAu[1] * k};
}
