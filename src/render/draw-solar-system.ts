import {BODIES, orbitPathAu, positionAu, type Body} from '../core/ephemeris';
import {type Vec3} from '../core/vec';
import {project, type Viewport} from './projection';

export interface Palette {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
}

export interface Trip {
  /** The transfer arc in heliocentric AU. */
  pathAu: readonly Vec3[];
  /** Null before launch is reached or when the ship's position is unavailable. */
  shipAu: Vec3 | null;
}

export const LABELS: Record<Body, string> = {
  mercury: 'Mercury',
  venus: 'Venus',
  earthMoonBarycenter: 'Earth',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
};

export function drawSolarSystem(
  ctx: CanvasRenderingContext2D,
  view: Viewport,
  date: Date,
  palette: Palette,
  trip: Trip | null = null,
): void {
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.lineWidth = 1;
  ctx.strokeStyle = palette.muted;
  ctx.globalAlpha = 0.45;
  for (const body of BODIES) {
    ctx.beginPath();
    orbitPathAu(body, date).forEach((p, i) => {
      const {x, y} = project(p, view);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (trip && trip.pathAu.length > 1) {
    ctx.beginPath();
    trip.pathAu.forEach((p, i) => {
      const {x, y} = project(p, view);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  const sun = project([0, 0, 0], view);
  ctx.fillStyle = palette.foreground;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  for (const body of BODIES) {
    const {x, y} = project(positionAu(body, date), view);
    const isEarth = body === 'earthMoonBarycenter';
    ctx.fillStyle = isEarth ? palette.accent : palette.foreground;
    ctx.beginPath();
    ctx.arc(x, y, isEarth ? 5 : 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = palette.muted;
    // Labels sit on the inner side of the dot so Neptune's does not leave the canvas; Earth's goes above
    // because Venus often sits beside it.
    const onRight = x > view.width / 2;
    ctx.textAlign = onRight ? 'right' : 'left';
    ctx.fillText(LABELS[body], x + (onRight ? -8 : 8), isEarth ? y - 11 : y);
  }

  if (trip?.shipAu) {
    const {x, y} = project(trip.shipAu, view);
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x, y + 7);
    ctx.lineTo(x - 6, y);
    ctx.closePath();
    ctx.fillStyle = palette.background;
    ctx.fill();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}
