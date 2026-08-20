import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, Download, FileJson, FileSpreadsheet, Filter, Printer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, PageHeader } from "@/components/ui-kit";
import { can, useStore } from "@/lib/store";
import { faDate, toFa } from "@/lib/format";

export const Route = createFileRoute("/exports")({
  head: () => ({
    meta: [
      { title: "خروجی حسابداری | مدیریت تعمیرگاه" },
      {
        name: "description",
        content: "تهیه خروجی CSV، Excel و JSON از خریدها، هزینه‌ها، دستمزدها و فاکتورهای نهایی.",
      },
      { property: "og:title", content: "خروجی‌های حسابداری تعمیرگاه" },
      { property: "og:description", content: "انتقال داده‌های مالی به نرم‌افزار حسابداری اصلی." },
    ],
  }),
  component: () => (
    <AppShell>
      <ExportsPage />
    </AppShell>
  ),
});

type Row = {
  id: string;
  recordType: string;
  typeLabel: string;
  tone: "success" | "danger" | "neutral";
  date: string;
  amount: number;
  ref: string;
};

function ExportsPage() {
  const { state, user } = useStore();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [types, setTypes] = useState({ purchases: true, expenses: true, wages: false, invoices: true });
  const [selected, setSelected] = useState<string[]>([]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (types.purchases)
      state.purchases.forEach((p, i) =>
        out.push({
          id: p.id,
          recordType: "bicycle_purchase",
          typeLabel: "فروش دوچرخه",
          tone: "success",
          date: p.createdAt,
          amount: p.purchasePrice,
          ref: p.accountingRef ?? `ACC-1402-${90 + i}`,
        }),
      );
    if (types.expenses)
      state.expenses.forEach((e, i) =>
        out.push({
          id: e.id,
          recordType: "expense",
          typeLabel: "هزینه قطعات",
          tone: "danger",
          date: e.date,
          amount: e.amount,
          ref: e.accountingRef ?? `ACC-1402-${80 + i}`,
        }),
      );
    if (types.wages)
      state.tasks
        .filter((t) => t.status === "APPROVED")
        .forEach((t, i) =>
          out.push({
            id: t.id,
            recordType: "task_wage",
            typeLabel: "دستمزد تعمیرات",
            tone: "neutral",
            date: t.createdAt,
            amount: t.finalWage ?? t.wage,
            ref: t.accountingRef ?? `ACC-1402-${70 + i}`,
          }),
        );
    if (types.invoices)
      state.invoices
        .filter((inv) => inv.status === "FINALIZED" || inv.status === "SYNCED_TO_ACCOUNTING")
        .forEach((inv, i) =>
          out.push({
            id: inv.id,
            recordType: "purchase_invoice_final",
            typeLabel: "فاکتور نهایی",
            tone: "success",
            date: inv.date,
            amount: inv.items.reduce(
              (s, it) => s + (it.finalQty ?? it.probableQty) * (it.finalUnitPrice ?? it.probableUnitPrice),
              0,
            ),
            ref: inv.accountingRef ?? `ACC-1402-${60 + i}`,
          }),
        );
    return out
      .filter((r) => (from ? new Date(r.date) >= new Date(from) : true))
      .filter((r) => (to ? new Date(r.date) <= new Date(to) : true));
  }, [state, types, from, to]);

  if (!can(user, "exports"))
    return (
      <EmptyState
        icon={<FileSpreadsheet className="size-6" />}
        title="دسترسی ندارید"
        description="خروجی حسابداری فقط برای مدیر اصلی و مدیر فروشگاه در دسترس است."
      />
    );

  const chosen = rows.filter((r) => selected.includes(r.id));
  const payload = (chosen.length ? chosen : rows).map((r) => ({
    record_type: r.recordType,
    record_id: r.id,
    jalali_date: faDate(r.date),
    iso_date: new Date(r.date).toISOString(),
    amount: r.amount,
    accounting_ref: r.ref,
  }));

  function download(name: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("فایل خروجی دانلود شد");
  }

  function exportCsv() {
    const head = Object.keys(payload[0] ?? { record_type: "" }).join(",");
    const body = payload.map((r) => Object.values(r).join(",")).join("\n");
    download(`export-${faDate(new Date())}.csv`, "\uFEFF" + head + "\n" + body, "text/csv;charset=utf-8");
  }

  return (
    <>
      <PageHeader
        title="خروجی‌های حسابداری"
        subtitle="تهیه و انتقال فایل‌های گزارش مالی برای سیستم حسابداری"
      />

      <section className="app-card mb-4 p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-extrabold">
          <Calendar className="size-5 text-primary" /> بازه زمانی (شمسی)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="from" className="block text-sm font-bold">
              از تاریخ
            </label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-12 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="to" className="block text-sm font-bold">
              تا تاریخ
            </label>
            <input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-12 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </section>

      <section className="app-card mb-4 p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-extrabold">
          <Filter className="size-5 text-primary" /> نوع داده
        </h2>
        {(
          [
            ["purchases", "خرید دوچرخه (فروش)"],
            ["expenses", "هزینه‌های تعمیرگاه"],
            ["wages", "وظایف و دستمزد"],
            ["invoices", "فاکتورهای خرید نهایی"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 py-2.5 text-sm font-bold">
            <input
              type="checkbox"
              checked={types[key]}
              onChange={(e) => setTypes({ ...types, [key]: e.target.checked })}
              className="size-5 accent-[var(--primary)]"
            />
            {label}
          </label>
        ))}
      </section>

      <section className="app-card mb-4 space-y-3 p-4 sm:p-6">
        <button
          onClick={() =>
            download(
              `export-${faDate(new Date())}.xls`,
              "\uFEFF" +
                `<table><tr>${Object.keys(payload[0] ?? {})
                  .map((k) => `<th>${k}</th>`)
                  .join("")}</tr>${payload
                  .map((r) => `<tr>${Object.values(r).map((v) => `<td>${v}</td>`).join("")}</tr>`)
                  .join("")}</table>`,
              "application/vnd.ms-excel",
            )
          }
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-primary-foreground"
        >
          <Download className="size-5" /> دانلود Excel
        </button>
        <button
          onClick={exportCsv}
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-accent-foreground"
        >
          <FileSpreadsheet className="size-5" /> دانلود CSV
        </button>
        <button
          onClick={() =>
            download(
              `export-${faDate(new Date())}.json`,
              JSON.stringify(payload, null, 2),
              "application/json",
            )
          }
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl border bg-card font-bold"
        >
          <FileJson className="size-5" /> دانلود JSON
        </button>
        <button
          onClick={() => window.print()}
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl border bg-card font-bold"
        >
          <Printer className="size-5" /> پرینت / PDF
        </button>
      </section>

      <section className="app-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4">
          <h2 className="text-lg font-extrabold">رکوردهای آماده انتقال</h2>
          <button
            onClick={() =>
              setSelected(selected.length === rows.length ? [] : rows.map((r) => r.id))
            }
            className="rounded-xl border px-3 py-2 text-xs font-bold"
          >
            علامت‌گذاری همه
          </button>
        </div>
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<FileSpreadsheet className="size-6" />}
              title="رکوردی در این بازه نیست"
              description="بازه تاریخ یا نوع داده را تغییر دهید."
            />
          </div>
        ) : (
          <div className="scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-foreground text-background">
                <tr>
                  <th className="p-3 text-start font-bold">انتخاب</th>
                  <th className="p-3 text-start font-bold">شناسه سند</th>
                  <th className="p-3 text-start font-bold">تاریخ</th>
                  <th className="p-3 text-start font-bold">نوع عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        aria-label={`انتخاب ${r.ref}`}
                        checked={selected.includes(r.id)}
                        onChange={(e) =>
                          setSelected((s) =>
                            e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id),
                          )
                        }
                        className="size-5 accent-[var(--primary)]"
                      />
                    </td>
                    <td className="num p-3 font-bold">{r.ref}</td>
                    <td className="num p-3">{faDate(r.date)}</td>
                    <td className="p-3">
                      <Chip tone={r.tone}>{r.typeLabel}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t p-4 text-xs text-muted-foreground">
          نمایش {toFa(rows.length)} رکورد · {toFa(selected.length)} مورد انتخاب شده
        </p>
      </section>
    </>
  );
}
