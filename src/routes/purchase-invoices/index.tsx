import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Receipt, Search, Package, Bike } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, FilterChips, ListSkeleton, PageHeader } from "@/components/ui-kit";
import { INVOICE_STATUS_LABEL, useStore, type InvoiceStatus } from "@/lib/store";
import { faDateTime, money } from "@/lib/format";
import { RecordActions } from "@/components/records/RecordActions";

export const Route = createFileRoute("/purchase-invoices/")({
  head: () => ({
    meta: [
      { title: "فاکتورهای خرید | مدیریت تعمیرگاه" },
      {
        name: "description",
        content: "پیش‌فاکتورها و فاکتورهای خرید با وضعیت خرید، نهایی‌سازی و ثبت حسابداری.",
      },
      { property: "og:title", content: "فاکتورهای خرید تعمیرگاه دوچرخه" },
      { property: "og:description", content: "پیگیری پیش‌فاکتور تا ثبت نهایی در حسابداری." },
    ],
  }),
  component: () => (
    <AppShell>
      <InvoicesPage />
    </AppShell>
  ),
});

const tone = (s: InvoiceStatus) =>
  s === "FINALIZED" ? "success" : s === "PRE_INVOICE" ? "info" : s === "PURCHASED" ? "primary" : "neutral";

function InvoicesPage() {
  const { state, loading } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | InvoiceStatus>("ALL");

  const list = state.invoices
    .filter((i) => filter === "ALL" || i.status === filter)
    .filter((i) => (q ? (i.invoiceNumber + i.supplier).includes(q) : true));

  return (
    <>
      <PageHeader
        title="خریدها و فاکتورها"
        subtitle="مدیریت پیش‌فاکتور تا نهایی‌سازی"
        action={
          <Link
            to="/purchase-invoices/new"
            className="rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            پیش‌فاکتور جدید
          </Link>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border bg-card px-4 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو در فاکتورها، تامین‌کننده..."
          aria-label="جستجوی فاکتور"
          className="h-12 w-full bg-transparent text-sm outline-none"
        />
      </div>

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: "ALL", label: "همه" },
          { value: "PRE_INVOICE", label: "پیش‌فاکتور" },
          { value: "PURCHASED", label: "خرید شده" },
          { value: "FINALIZED", label: "نهایی شده" },
          { value: "SYNCED_TO_ACCOUNTING", label: "حسابداری" },
        ]}
      />

      <div className="mt-4">
        {loading ? (
          <ListSkeleton />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-6" />}
            title="فاکتوری یافت نشد"
            description="یک پیش‌فاکتور خرید جدید بسازید تا اینجا نمایش داده شود."
            action={
              <Link
                to="/purchase-invoices/new"
                className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                ایجاد پیش‌فاکتور
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {list.map((inv) => {
              const total = inv.items.reduce(
                (s, it) => s + (it.finalQty ?? it.probableQty) * (it.finalUnitPrice ?? it.probableUnitPrice),
                0,
              );
              return (
                <li key={inv.id} className="relative">
                  <RecordActions
                    kind="invoice"
                    id={inv.id}
                    title={`فاکتور #${inv.invoiceNumber}`}
                    status={inv.status}
                    className="absolute start-2 top-2 z-10 bg-card/80 backdrop-blur"
                  />
                  <Link
                    to="/purchase-invoices/$id"
                    params={{ id: inv.id }}
                    className="app-card block border-e-4 border-e-primary p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Chip tone={tone(inv.status)}>{INVOICE_STATUS_LABEL[inv.status]}</Chip>
                      <div className="text-end">
                        <p className="text-xs text-muted-foreground">شماره فاکتور</p>
                        <p className="num text-lg font-extrabold">{inv.invoiceNumber}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <div className="min-w-0 text-end">
                        <p className="text-xs text-muted-foreground">تأمین‌کننده</p>
                        <p className="truncate font-bold">{inv.supplier || "—"}</p>
                      </div>
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                        {inv.items.length > 1 ? <Package className="size-5" /> : <Bike className="size-5" />}
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between border-t pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">تاریخ ثبت</p>
                        <p className="num text-sm font-bold">{faDateTime(inv.date)}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-xs text-muted-foreground">مبلغ کل</p>
                        <p className="num text-lg font-extrabold text-primary">
                          {money(total, state.currency)}
                        </p>
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
