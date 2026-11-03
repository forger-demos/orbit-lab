import {
  CLOCK_SPAN_DAYS, type ClockState, dayIndexOf, describeSpeed, pause, play, seek, setSpeed, SPEEDS_DAYS_PER_SECOND,
  stepClock, timeMsOfDayIndex, wholeDay,
} from '../core/clock';
import {drawSolarSystem, type Palette} from '../render/draw-solar-system';
import {describeTransfer} from './transfer-readout';
import {formatDateInput, MAX_YEAR, MIN_YEAR, parseDateInput} from './date-input';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const input = document.getElementById('date') as HTMLInputElement;
const message = document.getElementById('message') as HTMLElement;
const ctx = canvas.getContext('2d')!;

const playButton = document.getElementById('play') as HTMLButtonElement;
const speedSelect = document.getElementById('speed') as HTMLSelectElement;
const slider = document.getElementById('day') as HTMLInputElement;
const stateLabel = document.getElementById('state') as HTMLElement;

const now = new Date();
let clock: ClockState = seek(
  {timeMs: 0, playing: false, daysPerSecond: SPEEDS_DAYS_PER_SECOND[2], stopped: null},
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
);
let current = wholeDay(clock.timeMs);
slider.max = String(CLOCK_SPAN_DAYS);
for (const speed of SPEEDS_DAYS_PER_SECOND) {
  const option = document.createElement('option');
  option.value = String(speed);
  option.textContent = describeSpeed(speed);
  option.selected = speed === clock.daysPerSecond;
  speedSelect.append(option);
}
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

function sync(): void {
  const day = wholeDay(clock.timeMs);
  const changed = day.getTime() !== current.getTime();
  current = day;
  if (document.activeElement !== input) input.value = formatDateInput(current);
  slider.value = String(dayIndexOf(clock.timeMs));
  slider.setAttribute('aria-valuetext', formatDateInput(current));
  playButton.textContent = clock.playing ? 'Pause' : 'Play';
  playButton.setAttribute('aria-label', clock.playing ? 'Pause' : 'Play');
  playButton.setAttribute('aria-pressed', String(clock.playing));
  stateLabel.textContent = clock.playing
    ? `Playing at ${describeSpeed(clock.daysPerSecond)}`
    : clock.stopped === 'end' ? 'Stopped: reached the end of the range (2100)'
    : clock.stopped === 'start' ? 'Stopped: reached the start of the range (1900)'
    : 'Paused';
  if (changed) redraw();
}

let last: number | null = null;
function frame(timestamp: number): void {
  if (!clock.playing) { last = null; return; }
  if (last !== null) clock = stepClock(clock, timestamp - last);
  last = timestamp;
  sync();
  if (clock.playing) requestAnimationFrame(frame);
}

playButton.addEventListener('click', () => {
  clock = clock.playing ? pause(clock) : play(clock);
  message.textContent = '';
  sync();
  if (clock.playing) { last = null; requestAnimationFrame(frame); }
});
speedSelect.addEventListener('change', () => { clock = setSpeed(clock, Number(speedSelect.value)); sync(); });
slider.addEventListener('input', () => {
  clock = seek(clock, timeMsOfDayIndex(Number(slider.value)));
  message.textContent = '';
  sync();
});

input.addEventListener('input', () => {
  const parsed = parseDateInput(input.value);
  if (!parsed.ok) {
    message.textContent = `${parsed.message} Showing ${formatDateInput(current)}.`;
    return;
  }
  message.textContent = '';
  clock = seek(clock, parsed.date.getTime());
  sync();
});

const launchInput = document.getElementById('launch') as HTMLInputElement;
const arrivalInput = document.getElementById('arrival') as HTMLInputElement;
const readout = document.getElementById('readout') as HTMLElement;
launchInput.min = arrivalInput.min = input.min;
launchInput.max = arrivalInput.max = input.max;
function updateReadout(): void {
  readout.textContent = describeTransfer(launchInput.value, arrivalInput.value);
}
launchInput.addEventListener('input', updateReadout);
arrivalInput.addEventListener('input', updateReadout);

new ResizeObserver(redraw).observe(canvas);
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', redraw);
sync();
redraw();
