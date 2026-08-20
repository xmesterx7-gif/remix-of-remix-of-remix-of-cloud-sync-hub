/**
 * Backend-ready service contract for «گزارش روزانه کارکنان».
 *
 * This file defines the *contract only*. It creates no tables, performs no
 * network calls, and changes no current behavior: the active implementation
 * stays the existing in-memory service (see `./memory-backend`).
 *
 * A Cloud-backed implementation later only has to satisfy
 * `DailyReportsBackend` and be registered with `setDailyReportsBackend`.
 */

import type { BusinessDayKey } from "./business-day";
import type {
  DailyReport,
  DailyReportInput,
  DailyReportQuery,
  DailyReportSlot,
  DailyReportSummary,
  PerformanceRating,
  ReportSubject,
} from "./types";

export type { PerformanceRating, ReportSubject };

/** Employee vs. technician: the two kinds of people a report is written for. */
export type SubjectKind = "EMPLOYEE" | "TECHNICIAN";

export const SUBJECT_KIND_LABEL: Record<SubjectKind, string> = {
  EMPLOYEE: "کارمند",
  TECHNICIAN: "تکنسین",
};

/** A report subject with its kind, for backends that distinguish the two. */
export type DailyReportSubject = ReportSubject & {
  kind?: SubjectKind;
  /** Inactive people stay visible in history but cannot receive new records. */
  active?: boolean;
};

/** Filters accepted when listing subjects. */
export type SubjectQuery = {
  organizationId?: string;
  kind?: SubjectKind;
  /** Free-text match on full name; backend decides the matching strategy. */
  search?: string;
  includeInactive?: boolean;
};

/** Range query across every subject (not just one). */
export type DailyReportRangeQuery = {
  from: BusinessDayKey;
  to: BusinessDayKey;
  /** Omit to include every subject the caller may read. */
  subjectIds?: string[];
  organizationId?: string;
};

/** One day for one subject, including the explicit "no record" case. */
export type DailyReportDayView = {
  subject: DailyReportSubject;
  date: BusinessDayKey;
  report: DailyReport | null;
};

/** Per-subject summary of a date range, plus its day-by-day slots. */
export type SubjectRangeSummary = {
  subject: DailyReportSubject;
  summary: DailyReportSummary;
  slots: DailyReportSlot[];
};

/** All subjects for a single Tehran business day. */
export type DailyOverview = {
  date: BusinessDayKey;
  entries: DailyReportDayView[];
  /** Totals over the recorded entries of that single day. */
  summary: DailyReportSummary;
};

/** All subjects across a Tehran business-day range. */
export type RangeOverview = {
  from: BusinessDayKey;
  to: BusinessDayKey;
  subjects: SubjectRangeSummary[];
  /** Totals across every subject in the range. */
  summary: DailyReportSummary;
};

/** Stable error codes so the UI can map failures without parsing messages. */
export type DailyReportErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "FUTURE_DATE"
  | "BACKEND_UNAVAILABLE"
  | "UNKNOWN";

export class DailyReportError extends Error {
  readonly code: DailyReportErrorCode;

  constructor(code: DailyReportErrorCode, message: string) {
    super(message);
    this.name = "DailyReportError";
    this.code = code;
  }
}

/**
 * Full backend contract.
 *
 * Every date is a Jalali Asia/Tehran business day key (`YYYY-MM-DD`) produced
 * by `./business-day`; implementations must never reinterpret it in UTC or in
 * the viewer's local time zone.
 */
export interface DailyReportsBackend {
  /** Implementation name, e.g. "memory" or "cloud". */
  readonly name: string;

  /** People that reports can be written for. */
  listSubjects(query?: SubjectQuery): Promise<DailyReportSubject[]>;

  /** One subject/day record, or null when the day has no record at all. */
  getDay(subjectId: string, date: BusinessDayKey): Promise<DailyReport | null>;

  /** Records for one subject over a range (missing days are simply absent). */
  listRange(query: DailyReportQuery): Promise<DailyReport[]>;

  /** Create or update the record of one subject/day. */
  saveDay(input: DailyReportInput, actorId: string): Promise<DailyReport>;

  /** Delete the record of one subject/day; a missing record is a no-op. */
  removeDay(subjectId: string, date: BusinessDayKey): Promise<void>;

  /** Everyone's state for a single Tehran business day, plus that day's totals. */
  getDailyOverview(
    date: BusinessDayKey,
    query?: Omit<DailyReportRangeQuery, "from" | "to">,
  ): Promise<DailyOverview>;

  /** Per-subject and overall totals for a Tehran business-day range. */
  getRangeOverview(query: DailyReportRangeQuery): Promise<RangeOverview>;

  /** Notifies subscribers whenever any record changes. */
  subscribe(listener: () => void): () => void;
}

let currentBackend: DailyReportsBackend | null = null;

/** Registers the active implementation (in-memory today, Cloud later). */
export function setDailyReportsBackend(backend: DailyReportsBackend) {
  currentBackend = backend;
}

export function getDailyReportsBackend(): DailyReportsBackend {
  if (!currentBackend) {
    throw new DailyReportError(
      "BACKEND_UNAVAILABLE",
      "سرویس گزارش روزانه هنوز پیکربندی نشده است.",
    );
  }
  return currentBackend;
}
