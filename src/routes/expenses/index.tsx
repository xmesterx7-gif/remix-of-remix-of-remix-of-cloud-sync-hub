import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Banknote, Gift, Coffee, Wrench, TrendingUp, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, FilterChips, ListSkeleton, PageHeader } from "@/components/ui-kit";
import { EXPENSE_LABEL, can, useStore, type ExpenseCategory } from "@/lib/store";
import { faDateTimeLong, money, toFa } from "@/lib/format";
import { RecordActions } from "@/components/records/RecordActions";

export type Range = "TODAY" | "WEEK" | "MONTH" | "YEAR" | "ALL";

export const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "TODAY", label: "امروز" },
  { value: "WEEK", label: "هفته گذشته" },
  { value: "MONTH", label: "ماه گذشته" },
  { value: "YEAR", label: "امسال" },
  { value: "ALL", label: "همه" },
];

export function inRange(iso: string, range: Range) {
  if (range === "ALL") return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (range === "TODAY") return d.toDateString() === now.toDateString();
  const days = range === "WEEK" ? 7 : range === "MONTH" ? 30 : 365;
  return now.getTime() - d.getTime() <= days * 86400000;
}

export const Route = createFileRoute("/expenses/")({
  validateSearch: (s: Record<string, unknown>): { range: Range } => ({
    range: (["TODAY", "WEEK", "MONTH", "YEAR", "ALL"] as const).includes(s['range'] as Range)
      ? (s['range'] as Range)
      : "ALL",
  }),

  head: () => ({
    meta: [
      { title: "مدیریت هزینه‌ها | مدیریت تعمیرگاه" },
      {
        name: "description",
        content: "ثبت و پیگیری هزینه‌ها، حقوق، پاداش، جریمه و برداشت شخصی.",
      },
      { property: "og:title", content: "مدیریت هزینه‌های تعمیرگاه دوچرخه" },
      { property: "og:description", content: "خلاصه ماهانه و لیست کامل هزینه‌های ثبت‌شده." },
    ],
  }),
  component: () => (
    <AppShell>
      <ExpensesPage />
    </AppShell>
  ),
});


const ICONS: Record<ExpenseCategory, typeof Banknote> = {
  SALARY: Banknote,
  BONUS: Gift,
  PENALTY: ShieldAlert,
  PERSONAL_WITHDRAWAL: Wrench,
  MISCELLANEOUS: Coffee,
};

function ExpensesPage() {
  const { state, user, loading } = useStore();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const range = search.range;
  const [filter, setFilter] = useState<"ALL" | ExpenseCategory>("ALL");

  const list = useMemo(() => {
    if (!user) return [];
    // Reviewers see every expense; everyone else sees the ones they filed.
    const isManager = can(user, "approve");
    return state.expenses
      .filter((e) => isManager || e.createdBy === user.id)
      .filter((e) => inRange(e.date, range))
      .filter((e) => filter === "ALL" || e.category === filter);
  }, [state.expenses, filter, user, range]);

  const total = list.reduce((s, e) => s + e.amount, 0);
  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label ?? "همه";

  return (
    <>
      <PageHeader title="مدیریت هزینه‌ها" subtitle="ثبت، بررسی و تأیید هزینه‌های مجموعه" />

      <div className="rounded-2xl bg-gradient-to-l from-accent to-primary-soft p-5">
        <p className="text-sm text-muted-foreground">مجموع هزینه‌ها ({rangeLabel})</p>
        <p className="num mt-2 text-3xl font-extrabold">{money(total, state.currency)}</p>
        <p className="mt-2 flex items-center gap-1 text-sm font-bold text-primary">
          <TrendingUp className="size-4" /> {toFa(list.length)} مورد ثبت‌شده
        </p>
      </div>

      <div className="mt-4">
        <FilterChips
          value={range}
          onChange={(v) => void navigate({ search: { range: v }, replace: true })}
          options={RANGE_OPTIONS}
        />
      </div>

      <div className="mt-3">

        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "همه" },
            { value: "MISCELLANEOUS", label: "هزینه" },
            { value: "SALARY", label: "حقوق" },
            { value: "BONUS", label: "پاداش" },
            { value: "PENALTY", label: "جریمه" },
            { value: "PERSONAL_WITHDRAWAL", label: "شخصی" },
          ]}
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <ListSkeleton />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Banknote className="size-6" />}
            title="هزینه‌ای ثبت نشده"
            description="با دکمه + هزینه جدیدی ثبت کنید."
            action={
              <Link
                to="/expenses/new"
                className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                ثبت هزینه
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {list.map((e) => {
              const Icon = ICONS[e.category];
              const creator = state.users.find((u) => u.id === e.createdBy);
              return (
                <li key={e.id} className="app-card flex items-center gap-3 p-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Icon className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-extrabold">
                      {e.name || e.description || EXPENSE_LABEL[e.category]}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{faDateTimeLong(e.date)}</p>
                  </div>

                  <div className="shrink-0 text-end">
                    <p className="num text-sm font-extrabold">{money(e.amount, state.currency)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ثبت: {creator?.fullName ?? "—"}
                    </p>
                    <Chip
                      className="mt-1"
                      tone={
                        e.status === "APPROVED"
                          ? "success"
                          : e.status === "REJECTED"
                            ? "danger"
                            : e.status === "SYNCED_TO_ACCOUNTING"
                              ? "info"
                              : "warning"
                      }
                    >
                      {e.status === "APPROVED"
                        ? "تایید شده"
                        : e.status === "REJECTED"
                          ? "رد شده"
                          : e.status === "SYNCED_TO_ACCOUNTING"
                            ? "حسابداری"
                            : "در انتظار"}
                    </Chip>
                  </div>

                  <RecordActions
                    kind="expense"
                    id={e.id}
                    title={e.name || e.description || EXPENSE_LABEL[e.category]}
                    status={e.status}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
