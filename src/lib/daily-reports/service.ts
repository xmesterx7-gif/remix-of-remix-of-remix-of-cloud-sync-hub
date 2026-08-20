/**
 * Daily report service — cloud-backed implementation.
 *
 * Records are persisted in `public.daily_reports` (organization-scoped, RLS
 * enforced, audited). The UI only ever talks to the `DailyReportService`
 * contract, so the backing store can be swapped without touching screens.
 */

import { cloudDailyReportService } from "./cloud-backend";
import {
  listBusinessDays,
  parseBusinessDayKey,
  type BusinessDayKey,
} from "./business-day";
import {
  PERFORMANCE_ORDER,
  PERFORMANCE_SCORE,
  type DailyReport,
  type DailyReportService,
  type DailyReportSlot,
  type DailyReportSummary,
  type PerformanceRating,
} from "./types";

/** Active implementation: persisted in the shared cloud database. */
export const dailyReportService: DailyReportService = cloudDailyReportService;

/** Builds the day-by-day slots of a range; missing days keep a null report. */
export function buildSlots(
  from: BusinessDayKey,
  to: BusinessDayKey,
  reports: DailyReport[],
): DailyReportSlot[] {
  const byDate = new Map(reports.map((r) => [r.date, r]));
  return listBusinessDays(parseBusinessDayKey(from), parseBusinessDayKey(to)).map((d) => ({
    date: d.key,
    report: byDate.get(d.key) ?? null,
  }));
}

/** Range totals. Missing days never contribute zeros to the averages. */
export function summarize(
  from: BusinessDayKey,
  to: BusinessDayKey,
  reports: DailyReport[],
): DailyReportSummary {
  const slots = buildSlots(from, to, reports);
  const recorded = slots.filter((s) => s.report).map((s) => s.report!);

  const performanceCounts = Object.fromEntries(
    PERFORMANCE_ORDER.map((p) => [p, 0]),
  ) as Record<PerformanceRating, number>;

  let scoreSum = 0;
  let scored = 0;
  for (const r of recorded) {
    if (r.performance) {
      performanceCounts[r.performance] += 1;
      scoreSum += PERFORMANCE_SCORE[r.performance];
      scored += 1;
    }
  }

  const totalSalary = recorded.reduce((s, r) => s + r.salary, 0);
  const totalBonus = recorded.reduce((s, r) => s + r.bonus, 0);
  const totalPenalty = recorded.reduce((s, r) => s + r.penalty, 0);

  return {
    from,
    to,
    days: slots.length,
    recordedDays: recorded.length,
    missingDays: slots.length - recorded.length,
    totalSalary,
    totalBonus,
    totalPenalty,
    netTotal: totalSalary + totalBonus - totalPenalty,
    performanceCounts,
    averagePerformanceScore: scored ? scoreSum / scored : null,
  };
}

/** Nearest rating label for an average score (used in historical summaries). */
export function scoreToRating(score: number | null): PerformanceRating | null {
  if (score === null) return null;
  let best: PerformanceRating = PERFORMANCE_ORDER[0]!;
  let bestDiff = Infinity;
  for (const p of PERFORMANCE_ORDER) {
    const diff = Math.abs(PERFORMANCE_SCORE[p] - score);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best;
}
