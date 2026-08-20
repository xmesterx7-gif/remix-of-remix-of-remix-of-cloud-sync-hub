import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, Banknote, ShoppingCart, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, FilterChips, PageHeader, StatCard } from "@/components/ui-kit";
import { EXPENSE_LABEL, can, expenseTitle, useStore, type ExpenseCategory } from "@/lib/store";
import { faDateTimeLong, money, toFa } from "@/lib/format";
import { RANGE_OPTIONS, inRange, type Range } from "@/routes/expenses/index";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "گزارش و تحلیل | مدیریت تعمیرگاه دوچرخه" },
      {
        name: "description",
        content: "تحلیل هزینه‌ها، خریدها و دستمزدها در بازه امروز، هفته، ماه و سال گذشته.",
      },
      { property: "og:title", content: "گزارش و تحلیل فروشگاه و تعمیرگاه دوچرخه" },
      { property: "og:description", content: "نمودار سهم هر دسته هزینه با تاریخ شمسی دقیق." },
    ],
  }),
  component: () => (
    <AppShell>
      <ReportsPage />
    </AppShell>
  ),
});

function ReportsPage() {
  const { state, user } = useStore();
  const [range, setRange] = useState<Range>("MONTH");

  const expenses = useMemo(
    () => state.expenses.filter((e) => inRange(e.date, range)),
    [state.expenses, range],
  );
  const purchases = useMemo(
    () => state.purchases.filter((p) => inRange(p.createdAt, range)),
    [state.purchases, range],
  );
  const wages = useMemo(
    () =>
      state.tasks
        .filter((t) => ["APPROVED", "SYNCED_TO_ACCOUNTING"].includes(t.status))
        .filter((t) => inRange(t.submittedAt ?? t.createdAt, range)),
    [state.tasks, range],
  );

  if (!can(user, "reports"))
    return (
      <EmptyState
        icon={<BarChart3 className="size-6" />}
        title="دسترسی ندارید"
        description="گزارش‌های تحلیلی فقط برای مدیران فعال است."
      />
    );

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = (Object.keys(EXPENSE_LABEL) as ExpenseCategory[])
    .map((c) => ({
      category: c,
      amount: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <>
      <PageHeader title="گزارش و تحلیل" subtitle="بررسی هزینه‌ها و فعالیت‌ها در بازه‌های زمانی" />

      <FilterChips value={range} onChange={setRange} options={RANGE_OPTIONS} />

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Banknote className="size-5" />}
          label="مجموع هزینه‌ها"
          value={money(total, state.currency)}
          tone="danger"
        />
        <StatCard
          icon={<ShoppingCart className="size-5" />}
          label="خریدهای ثبت‌شده"
          value={toFa(purchases.length)}
          tone="info"
          to="/bicycle-purchases"
        />
        <StatCard
          icon={<Wrench className="size-5" />}
          label="دستمزد وظایف"
          value={money(
            wages.reduce((s, t) => s + (t.finalWage ?? t.wage), 0),
            state.currency,
          )}
          tone="success"
          to="/earnings"
        />
        <StatCard
          icon={<BarChart3 className="size-5" />}
          label="تعداد رکوردها"
          value={toFa(expenses.length + purchases.length + wages.length)}
          tone="warning"
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">سهم هر دسته از هزینه‌ها</h2>
        {byCategory.length === 0 ? (
          <EmptyState
            icon={<Banknote className="size-6" />}
            title="داده‌ای در این بازه نیست"
            description="بازه دیگری را انتخاب کنید یا هزینه‌ای ثبت کنید."
          />
        ) : (
          <ul className="app-card space-y-4 p-4">
            {byCategory.map((row) => {
              const pct = total ? Math.round((row.amount / total) * 100) : 0;
              return (
                <li key={row.category}>
                  <div className="flex items-center justify-between gap-3 text-sm font-bold">
                    <span>{EXPENSE_LABEL[row.category]}</span>
                    <span className="num">{money(row.amount, state.currency)}</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="num mt-1 text-xs text-muted-foreground">{toFa(pct)}٪ از کل</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">آخرین هزینه‌های این بازه</h2>
        {expenses.length === 0 ? (
          <EmptyState
            icon={<Banknote className="size-6" />}
            title="هزینه‌ای ثبت نشده"
            description="در این بازه زمانی هزینه‌ای ثبت نشده است."
          />
        ) : (
          <ul className="app-card divide-y">
            {expenses.slice(0, 10).map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{expenseTitle(e)}</p>
                  <p className="truncate text-xs text-muted-foreground">{faDateTimeLong(e.date)}</p>
                </div>
                <p className="num shrink-0 text-sm font-extrabold">
                  {money(e.amount, state.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
