export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

export type ParsedDate = {ok: true; date: Date} | {ok: false; message: string};

/** Parses the value of a date field (YYYY-MM-DD) as UTC midnight within the supported years. */
export function parseDateInput(value: string): ParsedDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return {ok: false, message: 'Enter a date as year-month-day.'};
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return {ok: false, message: 'That date does not exist.'};
  }
  if (y < MIN_YEAR || y > MAX_YEAR) {
    return {ok: false, message: `Choose a date between ${MIN_YEAR} and ${MAX_YEAR}.`};
  }
  return {ok: true, date};
}

export function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
