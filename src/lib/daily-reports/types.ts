/**
 * Types for «گزارش روزانه کارکنان».
 *
 * Salary, bonus, penalty and performance are deliberately separate concepts:
 * none of them is derived from another, and a missing day is *not* a zero day —
 * it has no record at all (rendered as «بدون رکورد»).
 */

import type { BusinessDayKey } from "./business-day";

export type PerformanceRating = "VERY_GOOD" | "GOOD" | "BAD" | "VERY_BAD";

export const PERFORMANCE_LABEL: Record<PerformanceRating, string> = {
  VERY_GOOD: "خیلی خوب",
  GOOD: "خوب",
  BAD: "بد",
  VERY_BAD: "خیلی بد",
};

export const PERFORMANCE_ORDER: PerformanceRating[] = [
  "VERY_GOOD",
  "GOOD",
  "BAD",
  "VERY_BAD",
];

/** Numeric weight used only for averages/summaries, never for money. */
export const PERFORMANCE_SCORE: Record<PerformanceRating, number> = {
  VERY_GOOD: 4,
  GOOD: 3,
  BAD: 2,
  VERY_BAD: 1,
};

/** Shown wherever a day has no record at all. */
export const NO_RECORD_LABEL = "بدون رکورد";

/** A person a daily report can be written for (employee or technician). */
export type ReportSubject = {
  id: string;
  fullName: string;
  roleTitle: string;
  /** Organization the person belongs to, when the backend scopes by org. */
  organizationId?: string;
};

export type DailyReport = {
  id: string;
  /** Organization scope, filled in by the backend implementation later. */
  organizationId?: string;
  subjectId: string;
  /** Jalali business day (Asia/Tehran), `YYYY-MM-DD`. */
  date: BusinessDayKey;
  /** Daily salary for that day (never mixed with bonus/penalty). */
  salary: number;
  bonus: number;
  penalty: number;
  performance: PerformanceRating | null;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** Payload accepted when creating/updating a day. */
export type DailyReportInput = {
  subjectId: string;
  date: BusinessDayKey;
  salary: number;
  bonus: number;
  penalty: number;
  performance: PerformanceRating | null;
  notes: string;
};

/** A day slot in a range: either a record or an explicit "missing" marker. */
export type DailyReportSlot = {
  date: BusinessDayKey;
  report: DailyReport | null;
};

export type DailyReportSummary = {
  from: BusinessDayKey;
  to: BusinessDayKey;
  /** Number of calendar business days in the range. */
  days: number;
  /** Days that actually have a record. */
  recordedDays: number;
  /** Days with no record at all — never counted as zero or bad performance. */
  missingDays: number;
  totalSalary: number;
  totalBonus: number;
  totalPenalty: number;
  /** totalSalary + totalBonus - totalPenalty. */
  netTotal: number;
  /** Count per rating, only over recorded days. */
  performanceCounts: Record<PerformanceRating, number>;
  /** Average score over recorded days, or null when nothing is recorded. */
  averagePerformanceScore: number | null;
};

export type DailyReportQuery = {
  subjectId: string;
  from: BusinessDayKey;
  to: BusinessDayKey;
};

/**
 * Service contract. The current implementation is in-memory (session only);
 * a Cloud-backed implementation can replace it without touching the UI.
 */
export type DailyReportService = {
  getDay(subjectId: string, date: BusinessDayKey): Promise<DailyReport | null>;
  listRange(query: DailyReportQuery): Promise<DailyReport[]>;
  saveDay(input: DailyReportInput, actorId: string): Promise<DailyReport>;
  removeDay(subjectId: string, date: BusinessDayKey): Promise<void>;
  /** Notifies subscribers whenever any record changes. */
  subscribe(listener: () => void): () => void;
};
