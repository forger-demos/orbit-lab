import {expect, test} from 'bun:test';
import {describeTransfer, READOUT_PROMPT} from './transfer-readout';

test('prompts while either date is empty', () => {
  expect(describeTransfer('', '2021-02-18')).toBe(READOUT_PROMPT);
  expect(describeTransfer('2020-07-30', '')).toBe(READOUT_PROMPT);
});

test('shows C3 and arrival speed for a real window', () => {
  expect(describeTransfer('2020-07-30', '2021-02-18')).toMatch(
    /^Departure C3 \d+\.\d km\^2\/s\^2, arrival speed relative to Mars \d\.\d\d km\/s\.$/,
  );
});

test('says no transfer found when arrival is not after launch', () => {
  expect(describeTransfer('2021-02-18', '2020-07-30')).toBe('No transfer found: arrival must be after launch.');
  expect(describeTransfer('2020-07-30', '2020-07-30')).toContain('No transfer found');
});

test('names the field with an invalid date', () => {
  expect(describeTransfer('2020-02-31', '2021-02-18')).toStartWith('Launch:');
  expect(describeTransfer('2020-07-30', 'nope')).toStartWith('Arrival:');
});

test('says no transfer found when the geometry has no solution', () => {
  expect(describeTransfer('2020-11-15', '2020-12-08')).toBe('No transfer found for these dates.');
});
