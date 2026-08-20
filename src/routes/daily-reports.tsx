import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gift,
  Minus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { BusinessDayPicker } from "@/components/daily-reports/BusinessDayPicker";
import { AmountField, TextArea } from "@/components/forms/fields";
import { Chip, EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { can, roleTitle, useStore } from "@/lib/store";
import { money, toFa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RecordActions } from "@/components/records/RecordActions";
import {
  businessDayWeekday,
  compareBusinessDays,
  formatBusinessDay,
  formatBusinessDayShort,
  isFutureBusinessDay,
  isSameBusinessDay,
  lastBusinessDays,
  listBusinessDays,
  parseBusinessDayKey,
  shiftBusinessDay,
  todayBusinessDay,
  type BusinessDay,
} from "@/lib/daily-reports/business-day";
import { buildSlots, dailyReportService, scoreToRating, summarize } from "@/lib/daily-reports/service";
import {
  NO_RECORD_LABEL,
  PERFORMANCE_LABEL,
  PERFORMANCE_ORDER,
  type DailyReport,
  type PerformanceRating,
  type ReportSubject,
} from "@/lib/daily-reports/types";

export const Route = createFileRoute("/daily-reports")({
  head: () => ({
    meta: [
      { title: "گزارش روزانه کارکنان | مدیریت تعمیرگاه دوچرخه" },
      {
        name: "description",
        content:
          "ثبت و مرور گزارش روزانه کارکنان و تکنسین‌ها: حقوق روزانه، پاداش، جریمه، عملکرد و یادداشت بر پایه تقویم تهران.",
      },
      { property: "og:title", content: "گزارش روزانه کارکنان" },
      {
        property: "og:description",
        content: "گزارش روزانه، خلاصه تاریخی و جمع بازه زمانی برای کارکنان و تکنسین‌ها.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <DailyReportsPage />
    </AppShell>
  ),
});

const performanceTone: Record<PerformanceRating, "success" | "info" | "warning" | "danger"> = {
  VERY_GOOD: "success",
  GOOD: "info",
  BAD: "warning",
  VERY_BAD: "danger",
};

function DailyReportsPage() {
  const { state, user } = useStore();
  const currency = state.currency;

  const subjects: ReportSubject[] = useMemo(
    () =>
      state.users
        .filter((u) => !u.isArchived)
        .filter((u) => u.isWorker || u.role === "EMPLOYEE" || u.role === "MECHANIC")
        .map((u) => ({ id: u.id, fullName: u.fullName, roleTitle: roleTitle(u) })),
    [state.users],
  );

  const canSeeEveryone = can(user, "reports") || can(user, "approve");
  const visibleSubjects = useMemo(
    () => (canSeeEveryone ? subjects : subjects.filter((s) => s.id === user?.id)),
    [canSeeEveryone, subjects, user?.id],
  );
  const canEdit = can(user, "approve") && can(user, "write");

  const [subjectId, setSubjectId] = useState<string>("");
  const [day, setDay] = useState<BusinessDay>(() => todayBusinessDay());
  const [rangeFrom, setRangeFrom] = useState<BusinessDay>(() =>
    shiftBusinessDay(todayBusinessDay(), -6),
  );
  const [rangeTo, setRangeTo] = useState<BusinessDay>(() => todayBusinessDay());
  const [version, setVersion] = useState(0);
  const [records, setRecords] = useState<DailyReport[]>([]);

  useEffect(() => {
    if (!subjectId && visibleSubjects[0]) setSubjectId(visibleSubjects[0].id);
  }, [subjectId, visibleSubjects]);

  useEffect(() => dailyReportService.subscribe(() => setVersion((v) => v + 1)), []);

  // Widest window we need: the selected range, the visible day and the last 7 days.
  const windowDays = useMemo(() => {
    const anchors = [day, rangeFrom, rangeTo, shiftBusinessDay(todayBusinessDay(), -6), todayBusinessDay()];
    const sorted = [...anchors].sort(compareBusinessDays);
    return { from: sorted[0]!, to: sorted[sorted.length - 1]! };
  }, [day, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!subjectId) {
      setRecords([]);
      return;
    }
    let cancelled = false;
    void dailyReportService
      .listRange({ subjectId, from: windowDays.from.key, to: windowDays.to.key })
      .then((rows) => {
        if (!cancelled) setRecords(rows);
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId, windowDays, version]);

  const dayReport = useMemo(
    () => records.find((r) => r.date === day.key) ?? null,
    [records, day.key],
  );

  const rangeSummary = useMemo(
    () => summarize(rangeFrom.key, rangeTo.key, records),
    [rangeFrom.key, rangeTo.key, records],
  );
  const rangeSlots = useMemo(
    () => buildSlots(rangeFrom.key, rangeTo.key, records).slice().reverse(),
    [rangeFrom.key, rangeTo.key, records],
  );

  const history = useMemo(() => {
    const days = lastBusinessDays(7);
    return {
      slots: buildSlots(days[0]!.key, days[days.length - 1]!.key, records).slice().reverse(),
      summary: summarize(days[0]!.key, days[days.length - 1]!.key, records),
    };
  }, [records]);

  const save = useCallback(
    async (values: {
      salary: number;
      bonus: number;
      penalty: number;
      performance: PerformanceRating | null;
      notes: string;
    }) => {
      if (!subjectId || !user) return;
      await dailyReportService.saveDay({ subjectId, date: day.key, ...values }, user.id);
      toast.success("گزارش روز ذخیره شد.");
    },
    [subjectId, day.key, user],
  );

  const clearDay = useCallback(async () => {
    if (!subjectId) return;
    await dailyReportService.removeDay(subjectId, day.key);
    toast.success("رکورد این روز حذف شد.");
  }, [subjectId, day.key]);

  if (!can(user, "tasks") && !canSeeEveryone)
    return (
      <EmptyState
        icon={<ClipboardList className="size-6" />}
        title="دسترسی ندارید"
        description="گزارش روزانه کارکنان برای حساب شما فعال نیست."
      />
    );

  return (
    <>
      <PageHeader
        title="گزارش روزانه کارکنان"
        subtitle="حقوق روزانه، پاداش، جریمه، عملکرد و یادداشت برای کارکنان و تکنسین‌ها (به وقت تهران)"
      />

      {visibleSubjects.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title="کارمندی ثبت نشده"
          description="ابتدا کارکنان یا تکنسین‌ها را در بخش کاربران اضافه کنید."
        />
      ) : (
        <div className="space-y-8">
          <section className="app-card space-y-4 p-4">
            <label htmlFor="subject" className="block text-sm font-bold">
              انتخاب کارمند / تکنسین
            </label>
            <select
              id="subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="h-12 w-full rounded-xl border bg-card px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
            >
              {visibleSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} — {s.roleTitle}
                </option>
              ))}
            </select>

            <DayNavigator day={day} onChange={setDay} />
            <BusinessDayPicker id="day" label="انتخاب تاریخ" value={day} onChange={setDay} />
          </section>

          <DaySection
            day={day}
            report={dayReport}
            currency={currency}
            canEdit={canEdit}
            onSave={save}
            onClear={clearDay}
          />

          <section>
            <h2 className="mb-3 text-lg font-extrabold">خلاصه هفت روز گذشته</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                icon={<Wallet className="size-5" />}
                label="جمع حقوق"
                value={money(history.summary.totalSalary, currency)}
                tone="success"
              />
              <StatCard
                icon={<Gift className="size-5" />}
                label="جمع پاداش"
                value={money(history.summary.totalBonus, currency)}
                tone="info"
              />
              <StatCard
                icon={<Minus className="size-5" />}
                label="جمع جریمه"
                value={money(history.summary.totalPenalty, currency)}
                tone="danger"
              />
              <StatCard
                icon={<CalendarDays className="size-5" />}
                label="روزهای بدون رکورد"
                value={toFa(history.summary.missingDays)}
                tone="warning"
              />
            </div>
            <SlotList slots={history.slots} currency={currency} onPick={setDay} />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold">گزارش بازه زمانی</h2>
            <div className="app-card grid gap-4 p-4 sm:grid-cols-2">
              <BusinessDayPicker id="from" label="از تاریخ" value={rangeFrom} onChange={setRangeFrom} />
              <BusinessDayPicker id="to" label="تا تاریخ" value={rangeTo} onChange={setRangeTo} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                icon={<Wallet className="size-5" />}
                label="جمع حقوق بازه"
                value={money(rangeSummary.totalSalary, currency)}
                tone="success"
              />
              <StatCard
                icon={<Gift className="size-5" />}
                label="جمع پاداش بازه"
                value={money(rangeSummary.totalBonus, currency)}
                tone="info"
              />
              <StatCard
                icon={<Minus className="size-5" />}
                label="جمع جریمه بازه"
                value={money(rangeSummary.totalPenalty, currency)}
                tone="danger"
              />
              <StatCard
                icon={<ClipboardList className="size-5" />}
                label="خالص بازه"
                value={money(rangeSummary.netTotal, currency)}
                tone="primary"
              />
            </div>

            <div className="app-card mt-4 space-y-3 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  {formatBusinessDayShort(rangeFrom)} تا {formatBusinessDayShort(rangeTo)}
                </span>
                <span className="num text-muted-foreground">
                  {toFa(rangeSummary.recordedDays)} روز دارای رکورد از {toFa(rangeSummary.days)} روز
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PERFORMANCE_ORDER.map((p) => (
                  <Chip key={p} tone={performanceTone[p]}>
                    {PERFORMANCE_LABEL[p]}: {toFa(rangeSummary.performanceCounts[p])}
                  </Chip>
                ))}
                <Chip tone="neutral">
                  {NO_RECORD_LABEL}: {toFa(rangeSummary.missingDays)}
                </Chip>
              </div>
              <p className="text-xs text-muted-foreground">
                میانگین عملکرد:{" "}
                {rangeSummary.averagePerformanceScore === null
                  ? NO_RECORD_LABEL
                  : `${PERFORMANCE_LABEL[scoreToRating(rangeSummary.averagePerformanceScore)!]} (${toFa(
                      rangeSummary.averagePerformanceScore.toFixed(1),
                    )})`}
              </p>
            </div>

            <SlotList slots={rangeSlots} currency={currency} onPick={setDay} />
          </section>
        </div>
      )}
    </>
  );
}

function DayNavigator({
  day,
  onChange,
}: {
  day: BusinessDay;
  onChange: (d: BusinessDay) => void;
}) {
  const today = todayBusinessDay();
  const isToday = isSameBusinessDay(day, today);
  const nextDisabled = isFutureBusinessDay(shiftBusinessDay(day, 1));

  const btn =
    "inline-flex h-11 items-center justify-center gap-1 rounded-xl border bg-card px-3 text-sm font-bold disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" className={btn} onClick={() => onChange(shiftBusinessDay(day, -1))}>
        <ChevronRight className="size-4" />
        روز قبل
      </button>

      <div className="text-center">
        <p className="text-sm font-extrabold">{formatBusinessDay(day)}</p>
        <p className="text-xs text-muted-foreground">
          {businessDayWeekday(day)}
          {isToday ? " — امروز" : ""}
        </p>
      </div>

      <div className="flex gap-2">
        <button type="button" className={btn} onClick={() => onChange(today)} disabled={isToday}>
          امروز
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => onChange(shiftBusinessDay(day, 1))}
          disabled={nextDisabled}
        >
          روز بعد
          <ChevronLeft className="size-4" />
        </button>
      </div>
    </div>
  );
}

function DaySection({
  day,
  report,
  currency,
  canEdit,
  onSave,
  onClear,
}: {
  day: BusinessDay;
  report: DailyReport | null;
  currency: "TOMAN" | "RIAL";
  canEdit: boolean;
  onSave: (values: {
    salary: number;
    bonus: number;
    penalty: number;
    performance: PerformanceRating | null;
    notes: string;
  }) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [salary, setSalary] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [performance, setPerformance] = useState<PerformanceRating | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setSalary(report?.salary ?? 0);
    setBonus(report?.bonus ?? 0);
    setPenalty(report?.penalty ?? 0);
    setPerformance(report?.performance ?? null);
    setNotes(report?.notes ?? "");
  }, [report, day.key]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">گزارش {formatBusinessDay(day)}</h2>
        {report ? (
          <div className="flex items-center gap-1">
            <Chip tone={report.performance ? performanceTone[report.performance] : "neutral"}>
              {report.performance ? PERFORMANCE_LABEL[report.performance] : "عملکرد ثبت نشده"}
            </Chip>
            <RecordActions
              kind="dailyReport"
              id={report.id}
              title={`گزارش ${formatBusinessDay(day)}`}
              onEdit={() =>
                document
                  .getElementById("day-report-form")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              onDelete={onClear}
            />
          </div>
        ) : (
          <Chip tone="neutral">{NO_RECORD_LABEL}</Chip>
        )}
      </div>

      {report ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<Wallet className="size-5" />}
            label="حقوق روزانه"
            value={money(report.salary, currency)}
            tone="success"
          />
          <StatCard
            icon={<Gift className="size-5" />}
            label="پاداش"
            value={money(report.bonus, currency)}
            tone="info"
          />
          <StatCard
            icon={<Minus className="size-5" />}
            label="جریمه"
            value={money(report.penalty, currency)}
            tone="danger"
          />
          <StatCard
            icon={<ClipboardList className="size-5" />}
            label="خالص روز"
            value={money(report.salary + report.bonus - report.penalty, currency)}
            tone="primary"
          />
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title={NO_RECORD_LABEL}
          description="برای این روز هیچ گزارشی ثبت نشده است. نبود رکورد به معنی صفر بودن مبالغ یا عملکرد بد نیست."
        />
      )}

      {report?.notes ? (
        <p className="app-card p-4 text-sm leading-6">{report.notes}</p>
      ) : null}

      {canEdit ? (
        <form
          id="day-report-form"
          className="app-card space-y-4 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onSave({ salary, bonus, penalty, performance, notes });
          }}
        >
          <h3 className="text-sm font-extrabold">
            {report ? "ویرایش گزارش این روز" : "ثبت گزارش این روز"}
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <AmountField
              id="salary"
              label="حقوق روزانه"
              value={salary}
              onChange={setSalary}
              currency={currency}
            />
            <AmountField
              id="bonus"
              label="پاداش"
              value={bonus}
              onChange={setBonus}
              currency={currency}
            />
            <AmountField
              id="penalty"
              label="جریمه"
              value={penalty}
              onChange={setPenalty}
              currency={currency}
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-bold">عملکرد</span>
            <div className="flex flex-wrap gap-2">
              {PERFORMANCE_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={performance === p}
                  onClick={() => setPerformance(performance === p ? null : p)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                    performance === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground hover:bg-accent/70",
                  )}
                >
                  {PERFORMANCE_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <TextArea
            id="notes"
            label="یادداشت"
            value={notes}
            onChange={setNotes}
            placeholder="توضیح کوتاه درباره عملکرد یا اتفاقات این روز"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              ذخیره گزارش روز
            </button>

          </div>
        </form>
      ) : null}
    </section>
  );
}

function SlotList({
  slots,
  currency,
  onPick,
}: {
  slots: { date: string; report: DailyReport | null }[];
  currency: "TOMAN" | "RIAL";
  onPick: (d: BusinessDay) => void;
}) {
  if (slots.length === 0) return null;

  return (
    <ul className="app-card mt-4 divide-y">
      {slots.map((slot) => {
        const day = parseBusinessDayKey(slot.date);
        const r = slot.report;
        return (
          <li key={slot.date}>
            <button
              type="button"
              onClick={() => onPick(day)}
              className="flex w-full items-center gap-3 p-4 text-right"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{formatBusinessDay(day)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r
                    ? `${money(r.salary, currency)} حقوق • ${money(r.bonus, currency)} پاداش • ${money(
                        r.penalty,
                        currency,
                      )} جریمه`
                    : NO_RECORD_LABEL}
                </p>
              </div>
              <Chip tone={r?.performance ? performanceTone[r.performance] : "neutral"}>
                {r ? (r.performance ? PERFORMANCE_LABEL[r.performance] : "بدون عملکرد") : NO_RECORD_LABEL}
              </Chip>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Kept for future use by other screens that need the same day window. */
export function businessDayWindow(from: BusinessDay, to: BusinessDay) {
  return listBusinessDays(from, to);
}
