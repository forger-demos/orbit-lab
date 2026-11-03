import {expect, test} from 'bun:test';
import {formatDateInput, parseDateInput} from './date-input';

test('parses a valid date as UTC midnight', () => {
  const r = parseDateInput('2025-03-01');
  expect(r.ok && r.date.toISOString()).toBe('2025-03-01T00:00:00.000Z');
});

test('rejects malformed, impossible and out-of-range dates with a message', () => {
  for (const v of ['', 'tomorrow', '2025-02-30', '2025-13-01', '1899-12-31', '2101-01-01']) {
    const r = parseDateInput(v);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.message.length).toBeGreaterThan(0);
  }
});

test('accepts the range ends and round-trips through format', () => {
  for (const v of ['1900-01-01', '2100-12-31']) {
    const r = parseDateInput(v);
    expect(r.ok && formatDateInput(r.date)).toBe(v);
  }
});
