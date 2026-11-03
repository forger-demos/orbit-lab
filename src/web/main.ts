import {drawSolarSystem, type Palette} from '../render/draw-solar-system';
import {formatDateInput, MAX_YEAR, MIN_YEAR, parseDateInput} from './date-input';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const input = document.getElementById('date') as HTMLInputElement;
const message = document.getElementById('message') as HTMLElement;
const ctx = canvas.getContext('2d')!;

let current = new Date();
current = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()));
input.min = `${MIN_YEAR}-01-01`;
input.max = `${MAX_YEAR}-12-31`;
input.value = formatDateInput(current);

function palette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const get = (name: string) => css.getPropertyValue(name).trim();
  return {background: get('--bg'), foreground: get('--fg'), muted: get('--muted'), accent: get('--accent')};
}

function redraw(): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSolarSystem(ctx, {width: rect.width, height: rect.height}, current, palette());
}

input.addEventListener('input', () => {
  const parsed = parseDateInput(input.value);
  if (!parsed.ok) {
    message.textContent = `${parsed.message} Showing ${formatDateInput(current)}.`;
    return;
  }
  message.textContent = '';
  current = parsed.date;
  redraw();
});

new ResizeObserver(redraw).observe(canvas);
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', redraw);
redraw();
