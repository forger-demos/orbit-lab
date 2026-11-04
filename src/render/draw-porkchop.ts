import {MS_PER_DAY} from '../core/clock';
import {type GridSpec} from '../core/porkchop';
import {C3_SCALE_MAX, c3Colour, heatmapPixels} from './colour-scale';
import {yearTicks} from './date-ticks';
import {type Palette} from './draw-solar-system';
import {plotRect} from './plot-geometry';
import {type Viewport} from './projection';

export interface ContourLevel {
  level: number;
  /** [x1, y1, x2, y2, ...] in grid coordinates of `PlotData.spec`. */
  segments: Float32Array;
}

export interface PlotData {
  spec: GridSpec;
  /** Null until the first pass arrives; the axes draw without it. */
  c3Km2S2: Float32Array | null;
  contours: readonly ContourLevel[];
  /** The picked launch and arrival, as dates, so the marker lands right on the coarse and the fine grid alike. */
  selected?: {departMs: number; arriveMs: number} | null;
}

export interface PlotStatus {
  text: string;
}

function hexToRgb(colour: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(colour.trim());
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Draws the porkchop plot: heat map by C3, arrival-speed contours, dated axes and a colour legend. Samples sit at
 * cell centres, so every mapping adds half a cell and the image, contours and ticks agree.
 */
export function drawPorkchop(
  ctx: CanvasRenderingContext2D, view: Viewport, plot: PlotData, palette: Palette, status: PlotStatus | null,
): void {
  const {spec} = plot;
  const r = plotRect(view);
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, view.width, view.height);
  const font = '12px system-ui, sans-serif';
  ctx.font = font;

  if (plot.c3Km2S2) {
    const pixels = heatmapPixels(plot.c3Km2S2, spec.cols, spec.rows, hexToRgb(palette.background));
    const image = document.createElement('canvas');
    image.width = spec.cols;
    image.height = spec.rows;
    image.getContext('2d')!.putImageData(new ImageData(pixels, spec.cols, spec.rows), 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, r.x, r.y, r.w, r.h);
  }

  const gx = (i: number): number => r.x + ((i + 0.5) / spec.cols) * r.w;
  const gy = (j: number): number => r.y + r.h - ((j + 0.5) / spec.rows) * r.h;

  ctx.lineJoin = 'round';
  for (const {level, segments} of plot.contours) {
    ctx.beginPath();
    for (let k = 0; k + 3 < segments.length; k += 4) {
      ctx.moveTo(gx(segments[k]!), gy(segments[k + 1]!));
      ctx.lineTo(gx(segments[k + 2]!), gy(segments[k + 3]!));
    }
    ctx.strokeStyle = palette.background;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.foreground;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (segments.length >= 4) {
      const mid = Math.floor(segments.length / 8) * 4;
      const x = gx((segments[mid]! + segments[mid + 2]!) / 2);
      const y = gy((segments[mid + 1]! + segments[mid + 3]!) / 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = palette.background;
      ctx.strokeText(String(level), x, y);
      ctx.fillStyle = palette.foreground;
      ctx.fillText(String(level), x, y);
    }
  }

  if (plot.selected) {
    const x = gx((plot.selected.departMs - spec.departStartMs) / (spec.departStepDays * MS_PER_DAY));
    const y = gy((plot.selected.arriveMs - spec.arriveStartMs) / (spec.arriveStepDays * MS_PER_DAY));
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      for (const [width, colour] of [[4, palette.background], [2, palette.foreground]] as const) {
        ctx.lineWidth = width;
        ctx.strokeStyle = colour;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.moveTo(x - 11, y);
        ctx.lineTo(x + 11, y);
        ctx.moveTo(x, y - 11);
        ctx.lineTo(x, y + 11);
        ctx.stroke();
      }
    }
  }

  ctx.strokeStyle = palette.muted;
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  ctx.fillStyle = palette.muted;

  const departEnd = spec.departStartMs + (spec.cols - 1) * spec.departStepDays * MS_PER_DAY;
  const arriveEnd = spec.arriveStartMs + (spec.rows - 1) * spec.arriveStepDays * MS_PER_DAY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of yearTicks(spec.departStartMs, departEnd, Math.max(2, Math.floor(r.w / 60)))) {
    const x = gx((t.ms - spec.departStartMs) / (spec.departStepDays * MS_PER_DAY));
    ctx.fillRect(x, r.y + r.h, 1, 4);
    ctx.fillText(t.label, x, r.y + r.h + 6);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const t of yearTicks(spec.arriveStartMs, arriveEnd, Math.max(2, Math.floor(r.h / 36)))) {
    const y = gy((t.ms - spec.arriveStartMs) / (spec.arriveStepDays * MS_PER_DAY));
    ctx.fillRect(r.x - 4, y, 4, 1);
    ctx.fillText(t.label, r.x - 8, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.foreground;
  ctx.fillText('Launch date', r.x + r.w / 2, r.y + r.h + 22);
  ctx.save();
  ctx.translate(12, r.y + r.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle';
  ctx.fillText('Arrival date', 0, 0);
  ctx.restore();

  const barY = r.y + r.h + 42;
  const steps = Math.max(2, Math.floor(r.w));
  for (let i = 0; i < steps; i++) {
    const [cr, cg, cb] = c3Colour(((i + 0.5) / steps) * C3_SCALE_MAX);
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.fillRect(r.x + (i / steps) * r.w, barY, r.w / steps + 1, 10);
  }
  ctx.fillStyle = palette.muted;
  ctx.textBaseline = 'top';
  const tickCount = r.w < 300 ? 3 : 7;
  for (let k = 0; k <= tickCount - 1; k++) {
    const value = (k / (tickCount - 1)) * C3_SCALE_MAX;
    ctx.textAlign = k === 0 ? 'left' : k === tickCount - 1 ? 'right' : 'center';
    ctx.fillText(k === tickCount - 1 ? `${value}+` : String(value), r.x + (k / (tickCount - 1)) * r.w, barY + 13);
  }

  if (status) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = palette.background;
    const x = r.x + r.w / 2;
    const y = plot.c3Km2S2 ? r.y + 14 : r.y + r.h / 2;
    ctx.strokeText(status.text, x, y);
    ctx.fillStyle = palette.foreground;
    ctx.fillText(status.text, x, y);
  }
}
