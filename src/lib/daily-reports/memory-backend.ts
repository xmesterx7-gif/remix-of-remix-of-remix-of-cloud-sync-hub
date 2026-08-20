/**
 * Temporary in-memory implementation of `DailyReportsBackend`.
 *
 * It delegates every read/write to the existing session-only
 * `dailyReportService`, so current behavior is unchanged. Daily and range
 * summaries are computed with the existing `buildSlots` / `summarize` helpers.
 *
 * Subjects are not owned by this module: the UI already builds them from the
 * app store, so a subject source can be injected. Until one is registered the
 * subject list is empty, which keeps this file free of side effects.
 */

import {
  buildSlots,
  dailyReportService,
  summarize,
} from "./service";
import type { BusinessDayKey } from "./business-day";
import type {
  DailyReport,
  DailyReportQuery,
  DailyReportSummary,
} from "./types";
import {
  setDailyReportsBackend,
  type DailyOverview,
  type DailyReportRangeQuery,
  type DailyReportSubject,
  type DailyReportsBackend,
  type RangeOverview,
  type SubjectQuery,
} from "./contract";

export type SubjectSource = (query?: SubjectQuery) => DailyReportSubject[];

let subjectSource: SubjectSource = () => [];

/** Lets the app supply the subject list without changing this module. */
export function setDailyReportSubjectSource(source: SubjectSource) {
  subjectSource = source;
}

function filterSubjects(query?: SubjectQuery): DailyReportSubject[] {
  const all = subjectSource(query);
  const search = query?.search?.trim().toLowerCase();
  return all.filter((s) => {
    if (query?.organizationId && s.organizationId !== query.organizationId) return false;
    if (query?.kind && s.kind && s.kind !== query.kind) return false;
    if (!query?.includeInactive && s.active === false) return false;
    if (search && !s.fullName.toLowerCase().includes(search)) return false;
    return true;
  });
}

function pickSubjects(query?: DailyReportRangeQuery): DailyReportSubject[] {
  const subjectQuery: SubjectQuery = query?.organizationId
    ? { organizationId: query.organizationId }
    : {};
  const subjects = filterSubjects(subjectQuery);
  if (!query?.subjectIds) return subjects;
  const wanted = new Set(query.subjectIds);
  return subjects.filter((s) => wanted.has(s.id));
}

function emptySummary(from: BusinessDayKey, to: BusinessDayKey): DailyReportSummary {
  return summarize(from, to, []);
}

/** Merges per-subject summaries into one total for the same range. */
function mergeSummaries(
  from: BusinessDayKey,
  to: BusinessDayKey,
  parts: DailyReportSummary[],
): DailyReportSummary {
  const base = emptySummary(from, to);
  if (parts.length === 0) return base;

  let scoreSum = 0;
  let scored = 0;
  const merged: DailyReportSummary = {
    ...base,
    days: parts.reduce((s, p) => s + p.days, 0),
    recordedDays: 0,
    missingDays: 0,
    totalSalary: 0,
    totalBonus: 0,
    totalPenalty: 0,
    netTotal: 0,
    performanceCounts: { ...base.performanceCounts },
  };

  for (const p of parts) {
    merged.recordedDays += p.recordedDays;
    merged.missingDays += p.missingDays;
    merged.totalSalary += p.totalSalary;
    merged.totalBonus += p.totalBonus;
    merged.totalPenalty += p.totalPenalty;
    for (const [rating, count] of Object.entries(p.performanceCounts)) {
      const key = rating as keyof typeof merged.performanceCounts;
      merged.performanceCounts[key] += count;
      if (p.averagePerformanceScore !== null && count > 0) {
        scoreSum += p.averagePerformanceScore * count;
        scored += count;
      }
    }
  }

  merged.netTotal = merged.totalSalary + merged.totalBonus - merged.totalPenalty;
  merged.averagePerformanceScore = scored ? scoreSum / scored : null;
  return merged;
}

export const memoryDailyReportsBackend: DailyReportsBackend = {
  name: "memory",

  async listSubjects(query) {
    return filterSubjects(query);
  },

  getDay(subjectId, date) {
    return dailyReportService.getDay(subjectId, date);
  },

  listRange(query: DailyReportQuery) {
    return dailyReportService.listRange(query);
  },

  saveDay(input, actorId) {
    return dailyReportService.saveDay(input, actorId);
  },

  removeDay(subjectId, date) {
    return dailyReportService.removeDay(subjectId, date);
  },

  async getDailyOverview(date, query): Promise<DailyOverview> {
    const subjects = pickSubjects({ ...query, from: date, to: date });
    const entries = await Promise.all(
      subjects.map(async (subject) => ({
        subject,
        date,
        report: await dailyReportService.getDay(subject.id, date),
      })),
    );
    const reports = entries
      .map((e) => e.report)
      .filter((r): r is DailyReport => !!r);

    return {
      date,
      entries,
      summary: {
        ...summarize(date, date, reports),
        days: subjects.length,
        recordedDays: reports.length,
        missingDays: subjects.length - reports.length,
      },
    };
  },

  async getRangeOverview(query): Promise<RangeOverview> {
    const { from, to } = query;
    const subjects = pickSubjects(query);
    const perSubject = await Promise.all(
      subjects.map(async (subject) => {
        const reports = await dailyReportService.listRange({
          subjectId: subject.id,
          from,
          to,
        });
        return {
          subject,
          summary: summarize(from, to, reports),
          slots: buildSlots(from, to, reports),
        };
      }),
    );

    return {
      from,
      to,
      subjects: perSubject,
      summary: mergeSummaries(from, to, perSubject.map((s) => s.summary)),
    };
  },

  subscribe(listener) {
    return dailyReportService.subscribe(listener);
  },
};

// Register the temporary implementation as the active backend.
setDailyReportsBackend(memoryDailyReportsBackend);
