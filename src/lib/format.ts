import {
  formatJalaliDate,
  formatJalaliDateLong,
  formatJalaliDateTime,
  formatJalaliDateTimeLong,
  formatJalaliFullMoment,
  formatJalaliTime,
  nowISO,
  relativeTime as relativeTimeCore,
} from "./datetime";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]!);
}

export function groupDigits(value: number | string): string {
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US");
}

export type Currency = "TOMAN" | "RIAL";

export function money(amount: number, currency: Currency = "TOMAN"): string {
  const value = currency === "RIAL" ? amount * 10 : amount;
  return `${toFa(groupDigits(value))} ${currency === "RIAL" ? "ریال" : "تومان"}`;
}

/** All date/time display goes through the central Intl-based module. */
export const faDate = formatJalaliDate;
export const faDateLong = formatJalaliDateLong;
export const faDateTime = formatJalaliDateTime;
export const faDateTimeLong = formatJalaliDateTimeLong;
export const faFullMoment = formatJalaliFullMoment;

export function faTime(value: string | number | Date, withSeconds = false): string {
  return formatJalaliTime(value, withSeconds);
}

export const relativeTime = relativeTimeCore;

/** Turns an input value into a grouped, Persian-digit amount for display. */
export function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d۰-۹]/g, "").replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
  if (!digits) return "";
  return toFa(groupDigits(Number(digits)));
}

export function parseAmountInput(raw: string): number {
  const digits = raw.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

/** Canonical ISO-UTC timestamp for storage. */
export const todayISO = nowISO;
export { nowISO };
