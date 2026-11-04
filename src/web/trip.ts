import {type Arc, arcStateAt, buildArc} from '../core/arc';
import {type ClockState, MS_PER_DAY, pause, seek, wholeDay} from '../core/clock';
import {AU_KM, type Body} from '../core/ephemeris';
import {scale, type Vec3} from '../core/vec';
import {type Trip} from '../render/draw-solar-system';

export interface TripPlan {
  arc: Arc & {ok: true};
  pathAu: readonly Vec3[];
}

export type PlanResult = {ok: true; plan: TripPlan} | {ok: false; message: string};

const toAu = (km: Vec3): Vec3 => scale(km, 1 / AU_KM);

export function planTrip(from: Body, to: Body, departMs: number, arriveMs: number): PlanResult {
  const arc = buildArc(from, to, departMs, arriveMs);
  if (!arc.ok) {
    return {
      ok: false,
      message: arc.reason === 'arrival-not-after-departure'
        ? 'No transfer for this pick: arrival must be after launch.'
        : 'No transfer exists for this launch and arrival.',
    };
  }
  return {ok: true, plan: {arc, pathAu: arc.samples.map((s) => toAu(s.rKm))}};
}

/**
 * What to draw on a displayed day. Before launch there is no ship; from the arrival day on it sits at the arrival
 * point. The planets are drawn at whole days, so the ship follows the same day.
 */
export function tripOnDay(plan: TripPlan, day: Date): Trip {
  const {departMs, arriveMs} = plan.arc;
  const ms = day.getTime();
  if (ms < departMs) return {pathAu: plan.pathAu, shipAu: null};
  const at = ms >= wholeDay(arriveMs).getTime() ? arriveMs : ms;
  const state = arcStateAt(plan.arc, at);
  return {pathAu: plan.pathAu, shipAu: state ? toAu(state.rKm) : null};
}

/** Ends playback exactly at arrival so the ship meets its destination rather than running past it. */
export function stopAtArrival(clock: ClockState, arriveMs: number): ClockState {
  return clock.playing && clock.timeMs >= arriveMs ? pause(seek(clock, arriveMs)) : clock;
}

/** The "Launch ... arrival ..." line for a pick, in whole days of flight. */
export function describeFlight(plan: TripPlan): string {
  const days = Math.round((plan.arc.arriveMs - plan.arc.departMs) / MS_PER_DAY);
  return `Showing a ${days}-day transfer.`;
}
