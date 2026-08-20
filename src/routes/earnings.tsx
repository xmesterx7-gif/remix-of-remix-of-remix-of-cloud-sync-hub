import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Award, Gift, ShieldAlert, Wallet, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { SelectField } from "@/components/forms/fields";
import { TASK_STATUS_LABEL, can, useStore } from "@/lib/store";
import { faDateTimeLong, money, toFa } from "@/lib/format";

export const Route = createFileRoute("/earnings")({
  head: () => ({
    meta: [
      { title: "دستمزد و پاداش | مدیریت تعمیرگاه دوچرخه" },
      {
        name: "description",
        content: "گزارش دستمزد وظایف انجام‌شده، پاداش‌ها، جریمه‌ها و مجموع درآمد هر کارمند.",
      },
      { property: "og:title", content: "دستمزد و پاداش کارمندان تعمیرگاه" },
      {
        property: "og:description",
        content: "مشاهده دقیق دستمزد، پاداش و جریمه با تاریخ و ساعت شمسی.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <EarningsPage />
    </AppShell>
  ),
});

function EarningsPage() {
  const { state, user } = useStore();
  const isManager = can(user, "approve");
  const [targetId, setTargetId] = useState(user?.id ?? "");

  const viewedId = (isManager ? targetId || user?.id : user?.id) ?? "";
  const viewed = state.users.find((u) => u.id === viewedId);

  const tasks = useMemo(
    () =>
      state.tasks
        .filter((t) => t.workerId === viewedId)
        .filter((t) => ["SUBMITTED", "APPROVED", "SYNCED_TO_ACCOUNTING"].includes(t.status))
        .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt)),
    [state.tasks, viewedId],
  );

  const related = state.expenses.filter((e) => e.relatedUserId === viewedId);
  const bonuses = related.filter((e) => e.category === "BONUS");
  const penalties = related.filter((e) => e.category === "PENALTY");

  const wageTotal = tasks.reduce((s, t) => s + (t.finalWage ?? t.wage), 0);
  const bonusTotal = bonuses.reduce((s, e) => s + e.amount, 0);
  const penaltyTotal = penalties.reduce((s, e) => s + e.amount, 0);
  const net = wageTotal + bonusTotal - penaltyTotal;

  if (!user || !can(user, "earnings"))
    return (
      <EmptyState
        icon={<Wallet className="size-6" />}
        title="دسترسی ندارید"
        description="این بخش برای شما فعال نشده است."
      />
    );

  return (
    <>
      <PageHeader
        title={isManager ? "دستمزد و پاداش پرسنل" : "دستمزد من"}
        subtitle="گزارش فقط‌خواندنی از دستمزدها، پاداش‌ها و جریمه‌ها"
      />

      {isManager ? (
        <div className="mb-4">
          <SelectField
            id="worker"
            label="انتخاب کارمند"
            value={viewedId}
            onChange={setTargetId}
            options={state.users.map((u) => ({ value: u.id, label: u.fullName }))}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Wrench className="size-5" />}
          label="مجموع دستمزد"
          value={money(wageTotal, state.currency)}
          tone="success"
        />
        <StatCard
          icon={<Gift className="size-5" />}
          label="مجموع پاداش"
          value={money(bonusTotal, state.currency)}
          tone="info"
        />
        <StatCard
          icon={<ShieldAlert className="size-5" />}
          label="مجموع جریمه"
          value={money(penaltyTotal, state.currency)}
          tone="danger"
        />
        <StatCard
          icon={<Award className="size-5" />}
          label="خالص قابل پرداخت"
          value={money(net, state.currency)}
          tone="primary"
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">
          وظایف ثبت‌شده {viewed ? `— ${viewed.fullName}` : ""}
        </h2>
        {tasks.length === 0 ? (
          <EmptyState
            icon={<Wrench className="size-6" />}
            title="هنوز دستمزدی ثبت نشده"
            description="پس از ثبت انجام وظیفه، دستمزد آن با تاریخ و ساعت دقیق اینجا نمایش داده می‌شود."
          />
        ) : (
          <ul className="space-y-3">
            {tasks.map((t) => (
              <li key={t.id} className="app-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 font-extrabold">{t.title}</h3>
                  <Chip
                    tone={
                      t.status === "SYNCED_TO_ACCOUNTING"
                        ? "info"
                        : t.status === "APPROVED"
                          ? "success"
                          : "warning"
                    }
                  >
                    {TASK_STATUS_LABEL[t.status]}
                  </Chip>
                </div>
                <p className="num mt-2 text-sm font-extrabold">
                  {money(t.finalWage ?? t.wage, state.currency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ثبت انجام: {faDateTimeLong(t.submittedAt ?? t.createdAt)}
                </p>
                {t.approvedAt ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    تأیید مدیر: {faDateTimeLong(t.approvedAt)}
                  </p>
                ) : null}
                {t.wageNote ? (
                  <p className="mt-1 text-xs leading-6">توضیح مدیر: {t.wageNote}</p>
                ) : null}
                {t.finalWage != null && t.finalWage !== t.wage ? (
                  <p className="num mt-1 text-xs text-muted-foreground">
                    دستمزد اولیه: {money(t.wage, state.currency)}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  وضعیت حسابداری:{" "}
                  {t.accountingRef
                    ? `ثبت‌شده (${t.accountingRef})`
                    : t.status === "SYNCED_TO_ACCOUNTING"
                      ? "ثبت‌شده"
                      : "در انتظار ثبت"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">پاداش‌ها و جریمه‌ها</h2>
        {related.length === 0 ? (
          <EmptyState
            icon={<Gift className="size-6" />}
            title="موردی ثبت نشده"
            description="پاداش یا جریمه‌ای برای این کاربر ثبت نشده است."
          />
        ) : (
          <ul className="app-card divide-y">
            {related.map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-4">
                <div
                  className={`grid size-10 shrink-0 place-items-center rounded-full ${
                    e.category === "PENALTY"
                      ? "bg-destructive/12 text-destructive"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {e.category === "PENALTY" ? (
                    <ShieldAlert className="size-5" />
                  ) : (
                    <Gift className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {e.category === "PENALTY" ? "جریمه" : "پاداش"}
                    {e.description ? ` — ${e.description}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {faDateTimeLong(e.date)}
                  </p>
                </div>
                <p className="num shrink-0 text-sm font-extrabold">
                  {money(e.amount, state.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        این گزارش فقط‌خواندنی است و {toFa(tasks.length + related.length)} رکورد را نشان می‌دهد.
      </p>
    </>
  );
}
