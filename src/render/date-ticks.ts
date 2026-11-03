export interface DateTick {
  ms: number;
  label: string;
}

/** January 1 ticks labelled by year across [startMs, endMs], thinned so no more than `maxTicks` remain. */
export function yearTicks(startMs: number, endMs: number, maxTicks = 8): DateTick[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];
  const first = new Date(startMs).getUTCFullYear() + (Date.UTC(new Date(startMs).getUTCFullYear(), 0, 1) < startMs ? 1 : 0);
  const last = new Date(endMs).getUTCFullYear();
  const years = Math.max(0, last - first + 1);
  const every = Math.max(1, Math.ceil(years / Math.max(1, maxTicks)));
  const out: DateTick[] = [];
  for (let y = first; y <= last; y += every) out.push({ms: Date.UTC(y, 0, 1), label: String(y)});
  return out;
}
