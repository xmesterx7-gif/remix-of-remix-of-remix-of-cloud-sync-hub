import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ShoppingCart, Calendar, Ruler, CheckCircle2, Clock, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, FilterChips, ListSkeleton, PageHeader } from "@/components/ui-kit";
import { BIKE_TYPE_LABEL, useStore, type BicyclePurchase } from "@/lib/store";
import { faDateTime, money } from "@/lib/format";
import { RecordActions } from "@/components/records/RecordActions";

export const Route = createFileRoute("/bicycle-purchases/")({
  head: () => ({
    meta: [
      { title: "خریدهای دوچرخه | مدیریت تعمیرگاه" },
      {
        name: "description",
        content: "لیست خریدهای دوچرخه با جستجو، فیلتر وضعیت و جزئیات کامل هر خرید.",
      },
      { property: "og:title", content: "لیست خریدهای دوچرخه" },
      { property: "og:description", content: "پیگیری خریدهای ثبت‌شده و وضعیت تأیید آن‌ها." },
    ],
  }),
  component: () => (
    <AppShell>
      <PurchasesPage />
    </AppShell>
  ),
});

const STATUS_META: Record<
  BicyclePurchase["status"],
  { label: string; tone: "success" | "warning" | "danger" | "info" }
> = {
  APPROVED: { label: "تایید شده", tone: "success" },
  PENDING: { label: "در انتظار تایید", tone: "warning" },
  REJECTED: { label: "رد شده", tone: "danger" },
  SYNCED_TO_ACCOUNTING: { label: "همگام‌سازی شده", tone: "info" },
};

function PurchasesPage() {
  const { state, user, loading } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | BicyclePurchase["status"]>("ALL");

  const list = useMemo(() => {
    if (!user) return [];
    const isManager = user.role === "ADMIN" || user.role === "STORE_MANAGER";
    return state.purchases
      .filter((p) => isManager || p.createdBy === user.id)
      .filter((p) => filter === "ALL" || p.status === filter)
      .filter((p) => (q ? (p.brand + p.color + p.size).includes(q) : true));
  }, [state.purchases, user, filter, q]);

  return (
    <>
      <PageHeader title="لیست خریدهای دوچرخه" subtitle="ثبت، بررسی و تأیید خریدها" />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border bg-card px-4 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو بر اساس برند یا کد..."
          aria-label="جستجوی خرید دوچرخه"
          className="h-12 w-full bg-transparent text-sm outline-none"
        />
      </div>

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: "ALL", label: "همه" },
          { value: "PENDING", label: "در انتظار تایید" },
          { value: "APPROVED", label: "تایید شده" },
          { value: "SYNCED_TO_ACCOUNTING", label: "همگام‌ساز" },
        ]}
      />

      <div className="mt-4">
        {loading ? (
          <ListSkeleton />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="size-6" />}
            title="خریدی یافت نشد"
            description="با دکمه + یک خرید دوچرخه جدید ثبت کنید یا فیلترها را تغییر دهید."
            action={
              <Link
                to="/bicycle-purchases/new"
                className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                ثبت خرید جدید
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {list.map((p) => {
              const meta = STATUS_META[p.status];
              const Icon =
                p.status === "APPROVED"
                  ? CheckCircle2
                  : p.status === "PENDING"
                    ? Clock
                    : p.status === "REJECTED"
                      ? XCircle
                      : CheckCircle2;
              return (
                <li key={p.id} className="relative">
                  <RecordActions
                    kind="purchase"
                    id={p.id}
                    title={p.brand}
                    status={p.status}
                    className="absolute start-2 top-2 z-10 bg-card/80 backdrop-blur"
                  />
                  <Link
                    to="/bicycle-purchases/$id"
                    params={{ id: p.id }}
                    className="app-card block overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 bg-secondary px-4 py-3">
                      <Chip tone={meta.tone}>
                        <Icon className="size-3.5" /> {meta.label}
                      </Chip>
                      <span className="text-xs font-bold text-muted-foreground">
                        {BIKE_TYPE_LABEL[p.bikeType]}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-extrabold">{p.brand}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Ruler className="size-4" /> سایز: {p.size} · رنگ: {p.color}
                      </p>
                      <div className="mt-4 flex items-end justify-between gap-3 border-t pt-3">
                        <span className="flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                          <Calendar className="size-3.5" /> {faDateTime(p.createdAt)}
                        </span>
                        <div className="text-end">
                          <p className="text-xs text-muted-foreground">قیمت خرید</p>
                          <p className="num text-lg font-extrabold">
                            {money(p.purchasePrice, state.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
