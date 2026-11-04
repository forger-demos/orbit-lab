import {type Body} from '../core/ephemeris';
import {BODY_NAMES} from '../core/pair';
import {transfer} from '../core/transfer';
import {parseDateInput} from './date-input';

export const READOUT_PROMPT = 'Choose a launch and an arrival date.';

/** The readout text for a pair and the raw values of the launch and arrival date fields. */
export function describeTransfer(from: Body, to: Body, launchValue: string, arrivalValue: string): string {
  if (launchValue.trim() === '' || arrivalValue.trim() === '') return READOUT_PROMPT;
  const launch = parseDateInput(launchValue);
  if (!launch.ok) return `Launch: ${launch.message}`;
  const arrival = parseDateInput(arrivalValue);
  if (!arrival.ok) return `Arrival: ${arrival.message}`;
  const result = transfer(from, to, launch.date, arrival.date);
  if (!result.ok) {
    return result.reason === 'arrival-not-after-departure'
      ? 'No transfer found: arrival must be after launch.'
      : 'No transfer found for these dates.';
  }
  return `Departure C3 ${result.c3Km2S2.toFixed(1)} km^2/s^2, arrival speed relative to ${BODY_NAMES[to]} ${result.arrivalVInfKmS.toFixed(2)} km/s.`;
}
