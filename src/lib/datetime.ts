/**
 * Central date/time module.
 *
 * Rules enforced here (single source of truth for the whole app):
 *  - Real time always comes from `new Date()`.
 *  - Storage/serialization is always ISO UTC (`nowISO()`).
 *  - Persian (Jalali) display is produced ONLY by `Intl.DateTimeFormat`
 *    with the Persian calendar and the Asia/Tehran time zone.
 *  - No manual/hand-rolled Jalali arithmetic anywhere.
 */

export const APP_TIME_ZONE = "Asia/Tehran";
const FA_LOCALE = "fa-IR-u-ca-persian-nu-persian";
/** Same calendar/zone, latin digits — used when we need numbers, not text. */
const CALC_LOCALE = "en-US-u-ca-persian-nu-latn";

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(options);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone: APP_TIME_ZONE, ...options });
    cache.set(key, f);
  }
  return f;
}

export function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The live current moment. */
export function now(): Date {
  return new Date();
}

/** Canonical timestamp for storage (created_at / updated_at / any log). */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Any date -> ISO UTC string for storage. */
export function toISO(value: string | number | Date): string {
  return (toDate(value) ?? new Date()).toISOString();
}

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
};

const PART_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "long",
  hour12: false,
};

/** Persian-calendar parts (numeric, latin digits) of a moment in Tehran. */
export function jalaliParts(value: string | number | Date): Parts | null {
  const d = toDate(value);
  if (!d) return null;
  const map: Record<string, string> = {};
  for (const p of formatter(CALC_LOCALE, PART_OPTS).formatToParts(d)) map[p.type] = p.value;
  const n = (k: string) => Number(String(map[k] ?? "").replace(/[^\d]/g, ""));
  const hour = n("hour");
  return {
    year: n("year"),
    month: n("month"),
    day: n("day"),
    hour: hour === 24 ? 0 : hour,
    minute: n("minute"),
    second: n("second"),
    weekday: map['weekday'] ?? "",
  };
}

function fa(value: string | number | Date, options: Intl.DateTimeFormatOptions): string {
  const d = toDate(value);
  if (!d) return "—";
  return formatter(FA_LOCALE, options).format(d);
}

/** ۱۴۰۵/۰۵/۲۳ */
export function formatJalaliDate(value: string | number | Date): string {
  return fa(value, { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** ۲۳ مرداد ۱۴۰۵ */
export function formatJalaliDateLong(value: string | number | Date): string {
  return fa(value, { year: "numeric", month: "long", day: "numeric" });
}

/** ۱۰:۱۴ or ۱۰:۱۴:۰۵ */
export function formatJalaliTime(value: string | number | Date, withSeconds = false): string {
  return fa(value, {
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : {}),
    hour12: false,
  });
}

/** ۱۴۰۵/۰۵/۲۳ – ۱۰:۱۴:۰۵ */
export function formatJalaliDateTime(value: string | number | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatJalaliDate(d)} – ${formatJalaliTime(d, true)}`;
}

/** ۲۳ مرداد ۱۴۰۵ ساعت ۱۰:۱۴:۰۵ */
export function formatJalaliDateTimeLong(value: string | number | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatJalaliDateLong(d)} ساعت ${formatJalaliTime(d, true)}`;
}

/** پنجشنبه ۲۳ مرداد ۱۴۰۵ – ۱۰:۱۴:۰۵ */
export function formatJalaliFullMoment(value: string | number | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatJalaliWeekday(d)} ${formatJalaliDateLong(d)} – ${formatJalaliTime(d, true)}`;
}

export function formatJalaliWeekday(value: string | number | Date): string {
  return fa(value, { weekday: "long" });
}

export function formatJalaliMonthYear(value: string | number | Date): string {
  return fa(value, { year: "numeric", month: "long" });
}

/** Persian month names, straight from Intl (never hardcoded). */
export const JALALI_MONTH_NAMES: string[] = Array.from({ length: 12 }, (_, i) =>
  fa(Date.UTC(2024, 2, 21 + i * 31), { month: "long" }),
);

function sameJalali(date: Date, jy: number, jm: number, jd: number): boolean {
  const p = jalaliParts(date);
  return !!p && p.year === jy && p.month === jm && p.day === jd;
}

const DAY = 86400000;

/**
 * Jalali (y, m, d) -> real Date, resolved by converging on Intl output.
 * No manual calendar math: every candidate is verified through Intl.
 */
export function jalaliToDate(jy: number, jm: number, jd: number, hour = 12, minute = 0): Date {
  // Start from a rough Gregorian anchor, then correct using Intl feedback only.
  let guess = new Date(Date.UTC(jy + 621, 2, 21, 12));
  for (let i = 0; i < 12; i += 1) {
    const p = jalaliParts(guess);
    if (!p) break;
    if (p.year === jy && p.month === jm && p.day === jd) break;
    const delta =
      (jy - p.year) * 365.2425 + (jm - p.month) * 30.44 + (jd - p.day);
    if (Math.abs(delta) < 1) break;
    guess = new Date(guess.getTime() + Math.round(delta) * DAY);
  }
  for (let step = -40; step <= 40; step += 1) {
    const candidate = new Date(guess.getTime() + step * DAY);
    if (sameJalali(candidate, jy, jm, jd)) {
      const local = jalaliParts(candidate)!;
      // shift the verified day to the requested wall-clock time in Tehran
      return new Date(
        candidate.getTime() + (hour - local.hour) * 3600000 + (minute - local.minute) * 60000,
      );
    }
  }
  return new Date();
}

/** Valid day count of a Jalali month, discovered via Intl round-trips. */
export function jalaliMonthLength(jy: number, jm: number): number {
  for (const d of [31, 30, 29]) {
    if (jm <= 6 ? d === 31 : false) return 31;
    if (sameJalali(jalaliToDate(jy, jm, d), jy, jm, d)) return d;
  }
  return 29;
}

export function relativeTime(value: string | number | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  const diff = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("fa-IR", { numeric: "auto" });
  if (abs < 60) return rtf.format(diff, "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(diff / 86400), "day");
  return formatJalaliDateTime(d);
}
