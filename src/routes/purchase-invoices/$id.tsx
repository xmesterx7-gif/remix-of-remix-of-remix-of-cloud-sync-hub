import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Copy, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, PageHeader } from "@/components/ui-kit";
import { AmountField, Field, InfoRow } from "@/components/forms/fields";
import {
  INVOICE_STATUS_LABEL,
  can,
  useStore,
  type InvoiceItem,
  type PurchaseInvoice,
} from "@/lib/store";
import { faDateTimeLong, money, toFa } from "@/lib/format";
import { RecordActions } from "@/components/records/RecordActions";

export const Route = createFileRoute("/purchase-invoices/$id")({
  head: () => ({
    meta: [
      { title: "جزئیات فاکتور خرید | مدیریت تعمیرگاه" },
      {
        name: "description",
        content: "ثبت تعداد و قیمت نهایی اقلام، مشاهده تفاوت قیمت و نهایی‌سازی فاکتور خرید.",
      },
      { property: "og:title", content: "جزئیات فاکتور خرید" },
      { property: "og:description", content: "خلاصه مالی و نهایی‌سازی فاکتور خرید تعمیرگاه." },
    ],
  }),
  component: () => (
    <AppShell>
      <InvoiceDetail />
    </AppShell>
  ),
});

function InvoiceDetail() {
  const { id } = useParams({ from: "/purchase-invoices/$id" });
  const { state, setState, user, notify } = useStore();
  const navigate = useNavigate();
  const [accRef, setAccRef] = useState("");

  const inv = state.invoices.find((i) => i.id === id);
  if (!inv || !user)
    return (
      <EmptyState
        icon={<XCircle className="size-6" />}
        title="فاکتور یافت نشد"
        description="این فاکتور حذف شده یا دسترسی ندارید."
      />
    );

  const editable = can(user, "invoices") && inv.status !== "SYNCED_TO_ACCOUNTING";
  const totalProbable = inv.items.reduce((s, i) => s + i.probableQty * i.probableUnitPrice, 0);
  const totalFinal = inv.items.reduce(
    (s, i) => s + (i.finalQty ?? i.probableQty) * (i.finalUnitPrice ?? i.probableUnitPrice),
    0,
  );
  const diff = totalFinal - totalProbable;

  function patchItem(itemId: string, p: Partial<InvoiceItem>) {
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) =>
        i.id === id
          ? { ...i, items: i.items.map((it) => (it.id === itemId ? { ...it, ...p } : it)) }
          : i,
      ),
    }));
  }

  function setStatus(status: PurchaseInvoice["status"], accountingRef?: string) {
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) =>
        i.id === id ? { ...i, status, ...(accountingRef ? { accountingRef } : {}) } : i,
      ),
    }));
  }

  function copyAll() {
    inv!.items.forEach((it) =>
      patchItem(it.id, { finalQty: it.probableQty, finalUnitPrice: it.probableUnitPrice }),
    );
    toast.success("مقادیر اولیه در فیلدهای نهایی کپی شد");
  }

  function finalize() {
    if (inv!.items.some((i) => !i.finalUnitPrice || !i.finalQty)) {
      toast.error("برای همه آیتم‌ها تعداد و قیمت نهایی را ثبت کنید.");
      return;
    }
    setStatus("FINALIZED");
    notify({
      userRole: ["ADMIN"],
      title: "فاکتور خرید نهایی شد",
      body: "فاکتور خرید نهایی شد و باید در حسابداری ثبت شود.",
      url: "/purchase-invoices",
      type: "invoice",
      priority: "URGENT",
    });
    toast.success("فاکتور نهایی شد و به مدیر اطلاع داده شد");
  }

  return (
    <>
      <button
        onClick={() => navigate({ to: "/purchase-invoices" })}
        className="mb-3 flex items-center gap-1 text-sm font-bold text-primary"
      >
        <ArrowRight className="size-4" /> بازگشت به فاکتورها
      </button>

      <PageHeader
        title={`فاکتور خرید #${inv.invoiceNumber}`}
        subtitle={INVOICE_STATUS_LABEL[inv.status]}
        action={
          <div className="flex items-center gap-1">
            <Chip tone={inv.status === "FINALIZED" ? "success" : "info"}>
              {INVOICE_STATUS_LABEL[inv.status]}
            </Chip>
            <RecordActions
              kind="invoice"
              id={inv.id}
              title={`فاکتور #${inv.invoiceNumber}`}
              status={inv.status}
              onDone={() => void navigate({ to: "/purchase-invoices" })}
            />
          </div>
        }
      />

      <div className="app-card divide-y p-4 sm:p-6">
        <InfoRow label="تأمین‌کننده">{inv.supplier || "—"}</InfoRow>
        <InfoRow label="تاریخ ثبت">{faDateTimeLong(inv.date)}</InfoRow>
        <InfoRow label="توضیحات">{inv.notes || "—"}</InfoRow>
        {inv.accountingRef ? <InfoRow label="شماره سند">{inv.accountingRef}</InfoRow> : null}
      </div>

      <section className="mt-4 space-y-3">
        {editable && inv.status !== "FINALIZED" ? (
          <button
            onClick={copyAll}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
          >
            <Copy className="size-4" /> کپی از مقادیر اولیه (بدون تغییر)
          </button>
        ) : null}

        {inv.items.map((it) => {
          const finalTotal = (it.finalQty ?? 0) * (it.finalUnitPrice ?? 0);
          const probTotal = it.probableQty * it.probableUnitPrice;
          const d = it.finalUnitPrice ? finalTotal - probTotal : 0;
          return (
            <div key={it.id} className="app-card space-y-3 p-4">
              <h3 className="font-extrabold">{it.productName}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">تخمینی</p>
                  <p className="num font-bold">
                    {toFa(it.probableQty)} × {money(it.probableUnitPrice, state.currency)}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-muted-foreground">نهایی</p>
                  <p className="num font-bold">
                    {it.finalQty ? `${toFa(it.finalQty)} × ${money(it.finalUnitPrice ?? 0, state.currency)}` : "ثبت نشده"}
                  </p>
                </div>
              </div>

              {d !== 0 ? (
                <div
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                    d > 0 ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary"
                  }`}
                >
                  {d > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                  <span className="num">
                    تفاوت: {d > 0 ? "+" : "−"}
                    {money(Math.abs(d), state.currency)}
                  </span>
                </div>
              ) : null}

              {editable && inv.status !== "FINALIZED" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    id={`fq-${it.id}`}
                    label="تعداد نهایی"
                    type="number"
                    value={String(it.finalQty ?? "")}
                    onChange={(v) => patchItem(it.id, { finalQty: Number(v) || 0 })}
                  />
                  <AmountField
                    id={`fp-${it.id}`}
                    label="قیمت واحد نهایی"
                    value={it.finalUnitPrice ?? 0}
                    onChange={(v) => patchItem(it.id, { finalUnitPrice: v })}
                    currency={state.currency}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="mt-4 rounded-2xl bg-accent p-5">
        <h2 className="mb-3 text-lg font-extrabold">خلاصه مالی</h2>
        <div className="divide-y divide-border/60">
          <InfoRow label="جمع قیمت تخمینی">
            <span className="num">{money(totalProbable, state.currency)}</span>
          </InfoRow>
          <InfoRow label="جمع قیمت نهایی">
            <span className="num">{money(totalFinal, state.currency)}</span>
          </InfoRow>
          <InfoRow label="تفاوت کل">
            <span className={`num ${diff > 0 ? "text-destructive" : "text-primary"}`}>
              {diff > 0 ? "+" : diff < 0 ? "−" : ""}
              {money(Math.abs(diff), state.currency)}
            </span>
          </InfoRow>
        </div>
      </section>

      {editable && inv.status !== "FINALIZED" ? (
        <button
          onClick={finalize}
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-primary-foreground"
        >
          <CheckCircle2 className="size-5" /> نهایی‌سازی فاکتور
        </button>
      ) : null}

      {can(user, "syncAccounting") && inv.status === "FINALIZED" ? (
        <div className="app-card mt-4 space-y-3 p-4">
          <h3 className="font-bold">ثبت در حسابداری</h3>
          <input
            value={accRef}
            onChange={(e) => setAccRef(e.target.value)}
            placeholder="شماره سند حسابداری"
            aria-label="شماره سند حسابداری"
            className="h-12 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => {
              if (!accRef.trim()) {
                toast.error("شماره سند را وارد کنید.");
                return;
              }
              setStatus("SYNCED_TO_ACCOUNTING", accRef);
              toast.success("فاکتور به‌عنوان ثبت‌شده در حسابداری علامت‌گذاری شد");
            }}
            className="min-h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground"
          >
            علامت‌گذاری به‌عنوان منتقل‌شده
          </button>
        </div>
      ) : null}
    </>
  );
}
