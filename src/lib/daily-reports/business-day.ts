/**
 * Business-day helpers for the daily employee report module.
 *
 * The business timezone is Asia/Tehran and a new business day starts at
 * 00:00 Tehran time. Every day is identified by its Jalali (Persian) date,
 * serialized as `YYYY-MM-DD` (latin digits) so it can be stored, sorted and
 * compared as a plain string once a backend is added.
 */

import {
  APP_TIME_ZONE,
  JALALI_MONTH_NAMES,
  jalaliMonthLength,
  jalaliParts,
  jalaliToDate,
} from "@/lib/datetime";

export { APP_TIME_ZONE };

/** `YYYY-MM-DD` in the Jalali calendar, Tehran time. */
export type BusinessDayKey = string;

export type BusinessDay = {
  jy: number;
  jm: number;
  jd: number;
  key: BusinessDayKey;
};

const DAY_MS = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function makeBusinessDay(jy: number, jm: number, jd: number): BusinessDay {
  const day = Math.min(Math.max(jd, 1), jalaliMonthLength(jy, jm));
  return { jy, jm, jd: day, key: `${jy}-${pad(jm)}-${pad(day)}` };
}

/** The business day a real moment belongs to (Tehran, day starts at 00:00). */
export function businessDayOf(value: string | number | Date = new Date()): BusinessDay {
  const p = jalaliParts(value);
  if (!p) return todayBusinessDay();
  return makeBusinessDay(p.year, p.month, p.day);
}

export function todayBusinessDay(): BusinessDay {
  const p = jalaliParts(new Date())!;
  return makeBusinessDay(p.year, p.month, p.day);
}

export function parseBusinessDayKey(key: BusinessDayKey): BusinessDay {
  const [y, m, d] = key.split("-").map((n) => Number(n));
  if (!y || !m || !d) return todayBusinessDay();
  return makeBusinessDay(y, m, d);
}

/** Real moment (noon Tehran) that sits inside a business day — used for math. */
export function businessDayAnchor(day: BusinessDay): Date {
  return jalaliToDate(day.jy, day.jm, day.jd, 12, 0);
}

/** Move a business day forward/backward by whole days. */
export function shiftBusinessDay(day: BusinessDay, delta: number): BusinessDay {
  const anchor = new Date(businessDayAnchor(day).getTime() + delta * DAY_MS);
  return businessDayOf(anchor);
}

export function compareBusinessDays(a: BusinessDay, b: BusinessDay): number {
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

export function isSameBusinessDay(a: BusinessDay, b: BusinessDay): boolean {
  return a.key === b.key;
}

export function isFutureBusinessDay(day: BusinessDay): boolean {
  return compareBusinessDays(day, todayBusinessDay()) > 0;
}

/** Inclusive list of business days between two days (auto-ordered, capped). */
export function listBusinessDays(
  from: BusinessDay,
  to: BusinessDay,
  maxDays = 400,
): BusinessDay[] {
  const [start, end] = compareBusinessDays(from, to) <= 0 ? [from, to] : [to, from];
  const out: BusinessDay[] = [];
  let cursor = start;
  for (let i = 0; i < maxDays; i += 1) {
    out.push(cursor);
    if (isSameBusinessDay(cursor, end)) break;
    cursor = shiftBusinessDay(cursor, 1);
  }
  return out;
}

/** The last `count` business days, ending with `end` (oldest first). */
export function lastBusinessDays(count: number, end: BusinessDay = todayBusinessDay()) {
  return listBusinessDays(shiftBusinessDay(end, -(count - 1)), end);
}

/** ۲۳ مرداد ۱۴۰۵ */
export function formatBusinessDay(day: BusinessDay): string {
  return `${faNum(day.jd)} ${JALALI_MONTH_NAMES[day.jm - 1]} ${faNum(day.jy)}`;
}

/** ۱۴۰۵/۰۵/۲۳ */
export function formatBusinessDayShort(day: BusinessDay): string {
  return faNum(`${day.jy}/${pad(day.jm)}/${pad(day.jd)}`);
}

export function businessDayWeekday(day: BusinessDay): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
  }).format(businessDayAnchor(day));
}

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
function faNum(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]!);
}

export { JALALI_MONTH_NAMES, jalaliMonthLength };
