import type { QuerySpec } from "./analytics.schema.js";

/** A question the query can't answer as asked (bad date range, ...). The message is shown to the model. */
export class AnalyticsQueryError extends Error {
  override name = "AnalyticsQueryError";
}

export interface ResolvedRange {
  label: string;
  timezone: string;
  /** Inclusive local calendar dates (YYYY-MM-DD); null = unbounded. */
  from: string | null;
  to: string | null;
  /** UTC instants for the database filter: `start` inclusive, `end` exclusive. */
  start: Date | null;
  end: Date | null;
}

// Calendar arithmetic below works on "civil dates": a number of ms for 00:00 UTC of that
// calendar date. They only carry Y-M-D; `civilToInstant` turns one into the real instant
// at which that date begins in the business time zone (so DST days are handled correctly).
type Civil = number;
const DAY = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();
function zonedParts(date: Date, timeZone: string): Record<string, number> {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) parts[part.type] = Number(part.value);
  return parts;
}

/** Offset of `timeZone` from UTC at `instant`, in ms (positive east of Greenwich). */
function offsetAt(instant: number, timeZone: string): number {
  const whole = Math.floor(instant / 1000) * 1000;
  const p = zonedParts(new Date(whole), timeZone);
  return Date.UTC(p["year"]!, p["month"]! - 1, p["day"]!, p["hour"]!, p["minute"]!, p["second"]!) - whole;
}

function civilToInstant(civil: Civil, timeZone: string): Date {
  // Two passes: the offset at the first guess can differ from the offset at the real instant on DST days.
  let instant = civil - offsetAt(civil, timeZone);
  instant = civil - offsetAt(instant, timeZone);
  return new Date(instant);
}

function civilToday(now: Date, timeZone: string): Civil {
  const p = zonedParts(now, timeZone);
  return Date.UTC(p["year"]!, p["month"]! - 1, p["day"]!);
}

const toYmd = (civil: Civil): string => new Date(civil).toISOString().slice(0, 10);

function parseYmd(value: string): Civil {
  const civil = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(civil) || toYmd(civil) !== value) {
    throw new AnalyticsQueryError(`"${value}" is not a valid calendar date`);
  }
  return civil;
}

const startOfWeek = (civil: Civil): Civil => civil - ((new Date(civil).getUTCDay() + 6) % 7) * DAY; // Monday
const startOfMonth = (civil: Civil, offset = 0): Civil => {
  const d = new Date(civil);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1);
};
const startOfYear = (civil: Civil, offset = 0): Civil => Date.UTC(new Date(civil).getUTCFullYear() + offset, 0, 1);

/** Half-open civil range [start, end); null = unbounded. */
function periodBounds(period: NonNullable<QuerySpec["period"]>, today: Civil): [Civil | null, Civil | null] {
  switch (period) {
    case "today":
      return [today, today + DAY];
    case "yesterday":
      return [today - DAY, today];
    case "this_week":
      return [startOfWeek(today), startOfWeek(today) + 7 * DAY];
    case "last_week":
      return [startOfWeek(today) - 7 * DAY, startOfWeek(today)];
    case "this_month":
      return [startOfMonth(today), startOfMonth(today, 1)];
    case "last_month":
      return [startOfMonth(today, -1), startOfMonth(today)];
    case "this_year":
      return [startOfYear(today), startOfYear(today, 1)];
    case "last_year":
      return [startOfYear(today, -1), startOfYear(today)];
    case "last_7_days":
      return [today - 6 * DAY, today + DAY];
    case "last_30_days":
      return [today - 29 * DAY, today + DAY];
    case "last_90_days":
      return [today - 89 * DAY, today + DAY];
    case "all_time":
      return [null, null];
  }
}

export function resolveRange(
  spec: Pick<QuerySpec, "period" | "from" | "to">,
  now: Date,
  timeZone: string,
): ResolvedRange {
  let start: Civil | null;
  let end: Civil | null; // exclusive
  let label: string;

  if (spec.from || spec.to) {
    start = spec.from ? parseYmd(spec.from) : null;
    end = spec.to ? parseYmd(spec.to) + DAY : null;
    if (start !== null && end !== null && start >= end) {
      throw new AnalyticsQueryError("`from` must not be after `to`");
    }
    label = `${spec.from ?? "the beginning"} to ${spec.to ?? "now"}`;
  } else {
    const period = spec.period ?? "all_time";
    [start, end] = periodBounds(period, civilToday(now, timeZone));
    label = period.replaceAll("_", " ");
  }

  return {
    label,
    timezone: timeZone,
    from: start === null ? null : toYmd(start),
    to: end === null ? null : toYmd(end - DAY),
    start: start === null ? null : civilToInstant(start, timeZone),
    end: end === null ? null : civilToInstant(end, timeZone),
  };
}

/** Local date/time text for the system prompt, e.g. "Friday, 2026-11-27 14:05". */
export function describeNow(now: Date, timeZone: string): string {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(now);
  const p = zonedParts(now, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${weekday}, ${p["year"]}-${pad(p["month"]!)}-${pad(p["day"]!)} ${pad(p["hour"]!)}:${pad(p["minute"]!)}`;
}
