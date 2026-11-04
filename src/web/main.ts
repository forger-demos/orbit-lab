import {
  CLOCK_SPAN_DAYS, type ClockState, dayIndexOf, describeSpeed, pause, play, seek, setSpeed, SPEEDS_DAYS_PER_SECOND,
  stepClock, timeMsOfDayIndex, wholeDay,
} from '../core/clock';
import {drawSolarSystem, type Palette} from '../render/draw-solar-system';
import {BODIES, type Body} from '../core/ephemeris';
import {BODY_NAMES, checkPair, pairSpec} from '../core/pair';
import {earthMarsSpec, type GridSpec, type PorkchopMessage} from '../core/porkchop';
import {drawPorkchop} from '../render/draw-porkchop';
import {cellAtPoint, nearestMarker} from '../render/plot-geometry';
import {bestCellNear, describeLaunch, launchOnGrid, REAL_LAUNCHES} from '../core/launches';
import {applyMessage, initialPlotState, plotDataOf, type PlotState, statusText} from './porkchop-state';
import {describeFlight, planTrip, stopAtArrival, type TripPlan, tripOnDay} from './trip';
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
let tripPlan: TripPlan | null = null;
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
  drawSolarSystem(ctx, {width: rect.width, height: rect.height}, current, palette(), tripPlan ? tripOnDay(tripPlan, current) : null);
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
  if (tripPlan) clock = stopAtArrival(clock, tripPlan.arc.arriveMs);
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
const showButton = document.getElementById('show-trip') as HTMLButtonElement;
const originSelect = document.getElementById('origin') as HTMLSelectElement;
const destinationSelect = document.getElementById('destination') as HTMLSelectElement;
const pairTitle = document.getElementById('pair-title') as HTMLElement;
const pairMessage = document.getElementById('pair-message') as HTMLElement;
const EARTH: Body = 'earthMoonBarycenter';
/** The pair the plot and the transfer controls currently work on; a refused selection never changes it. */
let pair: {from: Body; to: Body} = {from: EARTH, to: 'mars'};
for (const select of [originSelect, destinationSelect]) {
  for (const body of BODIES) {
    const option = document.createElement('option');
    option.value = body;
    option.textContent = BODY_NAMES[body];
    select.append(option);
  }
}
originSelect.value = pair.from;
destinationSelect.value = pair.to;

function updateReadout(): void {
  readout.textContent = describeTransfer(pair.from, pair.to, launchInput.value, arrivalInput.value);
}

/** Draws the transfer for a launch and arrival, moves the date to launch and plays to arrival. */
function selectTrip(departMs: number, arriveMs: number): void {
  const planned = planTrip(pair.from, pair.to, departMs, arriveMs);
  launchInput.value = formatDateInput(new Date(departMs));
  arrivalInput.value = formatDateInput(new Date(arriveMs));
  updateReadout();
  if (!planned.ok) {
    tripPlan = null;
    plotSelected = null;
    clock = pause(clock);
    message.textContent = planned.message;
    sync();
    redraw();
    redrawPlot();
    return;
  }
  tripPlan = planned.plan;
  plotSelected = {departMs, arriveMs};
  message.textContent = describeFlight(planned.plan);
  clock = play(seek(clock, departMs));
  last = null;
  sync();
  redraw();
  redrawPlot();
  requestAnimationFrame(frame);
}

showButton.addEventListener('click', () => {
  const launch = parseDateInput(launchInput.value);
  const arrival = parseDateInput(arrivalInput.value);
  if (!launch.ok || !arrival.ok) {
    message.textContent = 'Enter a launch and an arrival date first.';
    return;
  }
  selectTrip(launch.date.getTime(), arrival.date.getTime());
});
launchInput.addEventListener('input', updateReadout);
arrivalInput.addEventListener('input', updateReadout);

const plotCanvas = document.getElementById('porkchop') as HTMLCanvasElement;
const plotCtx = plotCanvas.getContext('2d')!;
const plotFrom = document.getElementById('plot-from') as HTMLInputElement;
const plotStatus = document.getElementById('plot-status') as HTMLElement;
const plotRetry = document.getElementById('plot-retry') as HTMLButtonElement;
plotFrom.min = input.min;
plotFrom.max = input.max;
plotFrom.value = `${now.getUTCFullYear()}-01-01`;

let worker: Worker | null = null;
let plotState: PlotState | null = null;
let plotSelected: {departMs: number; arriveMs: number} | null = null;
let launchMarkers: {label: string; departMs: number; arriveMs: number; best: {departMs: number; arriveMs: number} | null; tip: string}[] = [];

function markersFor(spec: GridSpec): typeof launchMarkers {
  if (spec.from !== EARTH || spec.to !== 'mars') return [];
  return REAL_LAUNCHES.filter((l) => launchOnGrid(spec, l)).map((l) => {
    const best = bestCellNear(spec, l);
    return {label: l.name, departMs: l.launchMs, arriveMs: l.arriveMs, best, tip: describeLaunch(l, best)};
  });
}

function redrawPlot(): void {
  if (!plotState) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = plotCanvas.getBoundingClientRect();
  plotCanvas.width = Math.round(rect.width * dpr);
  plotCanvas.height = Math.round(rect.height * dpr);
  plotCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const text = statusText(plotState);
  drawPorkchop(plotCtx, {width: rect.width, height: rect.height}, {...plotDataOf(plotState), selected: plotSelected, launches: launchMarkers}, palette(), text ? {text} : null);
}

function failPlot(detail: string): void {
  worker?.terminate();
  worker = null;
  plotStatus.textContent = `The launch plot could not be computed (${detail}).`;
  plotRetry.hidden = false;
  if (plotState) { plotState = {...plotState, phase: 'ready'}; redrawPlot(); }
}

function startPlot(): void {
  worker?.terminate();
  worker = null;
  const parsed = parseDateInput(plotFrom.value);
  if (!parsed.ok) {
    plotStatus.textContent = `${parsed.message} The plot is unchanged.`;
    return;
  }
  const spec: GridSpec = pair.from === EARTH && pair.to === 'mars'
    ? earthMarsSpec(parsed.date.getTime())
    : pairSpec(pair.from, pair.to, parsed.date.getTime());
  plotStatus.textContent = '';
  plotRetry.hidden = true;
  plotState = initialPlotState(spec);
  launchMarkers = markersFor(spec);
  plotCanvas.title = '';
  redrawPlot();
  try {
    const mine = new Worker('porkchop-worker.js', {type: 'module'});
    worker = mine;
    mine.onmessage = (event: MessageEvent<PorkchopMessage>) => {
      if (worker !== mine || !plotState) return;
      plotState = applyMessage(plotState, event.data);
      if (event.data.type !== 'band') redrawPlot();
      if (event.data.type === 'done') { mine.terminate(); worker = null; }
    };
    mine.onerror = (event) => { if (worker === mine) failPlot(event.message || 'worker error'); };
    mine.postMessage(spec);
  } catch (error) {
    failPlot(error instanceof Error ? error.message : 'worker unavailable');
  }
}

plotCanvas.addEventListener('click', (event) => {
  if (!plotState) return;
  const rect = plotCanvas.getBoundingClientRect();
  const cell = cellAtPoint(event.clientX - rect.left, event.clientY - rect.top, {width: rect.width, height: rect.height}, plotState.spec);
  if (cell) selectTrip(cell.departMs, cell.arriveMs);
});
plotCanvas.addEventListener('mousemove', (event) => {
  if (!plotState) return;
  const rect = plotCanvas.getBoundingClientRect();
  const i = nearestMarker(event.clientX - rect.left, event.clientY - rect.top, {width: rect.width, height: rect.height}, plotState.spec, launchMarkers);
  plotCanvas.title = i >= 0 ? launchMarkers[i]!.tip : '';
});
function changePair(): void {
  const from = originSelect.value as Body;
  const to = destinationSelect.value as Body;
  const check = checkPair(from, to);
  if (!check.ok) {
    pairMessage.textContent = check.message;
    return;
  }
  pairMessage.textContent = '';
  pair = {from, to};
  const names = `${BODY_NAMES[from]} to ${BODY_NAMES[to]}`;
  pairTitle.textContent = names;
  document.getElementById('plot')!.setAttribute('aria-label', `${names} launch windows`);
  plotCanvas.setAttribute('aria-label', `Porkchop plot for ${names}: launch date across, arrival date up, coloured by departure C3 with arrival speed contours`);
  tripPlan = null;
  plotSelected = null;
  clock = pause(clock);
  message.textContent = '';
  updateReadout();
  sync();
  redraw();
  startPlot();
}
originSelect.addEventListener('change', changePair);
destinationSelect.addEventListener('change', changePair);
plotFrom.addEventListener('change', startPlot);
plotRetry.addEventListener('click', startPlot);

new ResizeObserver(redraw).observe(canvas);
new ResizeObserver(redrawPlot).observe(plotCanvas);
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { redraw(); redrawPlot(); });
sync();
redraw();
startPlot();
