import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { History, RotateCcw, ShieldCheck, Undo2 } from "lucide-react";
import { EmptyState, ErrorState, FilterChips, ListSkeleton } from "@/components/ui-kit";
import { faDateTime } from "@/lib/format";
import {
  INVOICE_STATUS_LABEL,
  TASK_STATUS_LABEL,
  can,
  useStore,
  type State,
} from "@/lib/store";
import {
  OPERATION_LABEL,
  TABLE_LABEL,
  fetchArchived,
  fetchAuditHistory,
  previousStage,
  restoreArchived,
  type ArchivedRow,
  type AuditRow,
} from "@/lib/audit";

type Tab = "history" | "archive" | "reverse";

const STATUS_LABEL: Record<string, string> = {
  ...TASK_STATUS_LABEL,
  ...INVOICE_STATUS_LABEL,
};

const statusLabel = (s: string | null | undefined) => (s ? (STATUS_LABEL[s] ?? s) : "—");

/** Field-level differences between the before/after snapshots of one change. */
function changedFields(row: AuditRow) {
  const before = row.before ?? {};
  const after = row.after ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (k) => k !== "updated_at" && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
  return keys.slice(0, 6).map((k) => ({
    key: k,
    from: before[k],
    to: after[k],
  }));
}

const short = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  const text = typeof v === "object" ? JSON.stringify(v) : String(v);
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
};

type Reversible = {
  table: keyof typeof TABLE_LABEL;
  id: string;
  title: string;
  status: string;
  target: string;
};

function reversibleRecords(state: State): Reversible[] {
  const out: Reversible[] = [];
  const push = (table: string, id: string, title: string, status: string) => {
    const target = previousStage(table, status);
    if (target) out.push({ table, id, title, status, target });
  };
  for (const p of state.purchases)
    push("bicycle_purchases", p.id, `${p.brand} ${p.color}`.trim(), p.status);
  for (const e of state.expenses)
    push("expenses", e.id, e.name?.trim() || e.category, e.status);
  for (const t of state.tasks) push("tasks", t.id, t.title, t.status);
  for (const i of state.invoices)
    push("purchase_invoices", i.id, `${i.invoiceNumber} — ${i.supplier}`, i.status);
  return out;
}

export function AuditHistory() {
  const { state, setState, user, log } = useStore();
  const [tab, setTab] = useState<Tab>("history");
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [archived, setArchived] = useState<ArchivedRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowed = can(user, "users");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [history, archive] = await Promise.all([fetchAuditHistory({ limit: 150 }), fetchArchived()]);
      setRows(history);
      setArchived(archive);
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت تاریخچه ناموفق بود.");
    }
  }, []);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  const reversible = useMemo(() => reversibleRecords(state), [state]);
  const nameOf = useCallback(
    (id: string | null) =>
      (id && state.users.find((u) => u.id === id)?.fullName) || "کاربر نامشخص",
    [state.users],
  );

  if (!allowed)
    return (
      <EmptyState
        icon={<ShieldCheck className="size-6" />}
        title="دسترسی ندارید"
        description="تاریخچهٔ تغییرات و بازگردانی رکوردها فقط برای پشتیبان و مدیران باز است."
      />
    );

  async function restore(row: ArchivedRow) {
    if (!window.confirm(`«${row.title}» از بایگانی بازگردانی شود؟`)) return;
    try {
      await restoreArchived(row.table, row.id);
      log({
        entity: "user",
        recordId: row.id,
        action: "بازیابی رکورد بایگانی‌شده",
        note: `${TABLE_LABEL[row.table] ?? row.table} — ${row.title}`,
      });
      toast.success("رکورد بازیابی شد.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "بازیابی ناموفق بود.");
    }
  }

  function reverse(item: Reversible) {
    if (
      !window.confirm(
        `«${item.title}» از «${statusLabel(item.status)}» به «${statusLabel(item.target)}» بازگردانده شود؟`,
      )
    )
      return;
    setState((s) => {
      const apply = <T extends { id: string; status: string }>(list: T[]) =>
        list.map((r) => (r.id === item.id ? { ...r, status: item.target } : r)) as T[];
      if (item.table === "bicycle_purchases")
        return { ...s, purchases: apply(s.purchases as never) as never };
      if (item.table === "expenses") return { ...s, expenses: apply(s.expenses as never) as never };
      if (item.table === "tasks") return { ...s, tasks: apply(s.tasks as never) as never };
      return { ...s, invoices: apply(s.invoices as never) as never };
    });
    log({
      entity: "user",
      recordId: item.id,
      action: "بازگردانی وضعیت به مرحلهٔ قبل",
      note: `${TABLE_LABEL[item.table] ?? item.table} — ${item.title}: ${statusLabel(item.status)} ← ${statusLabel(item.target)}`,
    });
    toast.success("وضعیت به مرحلهٔ قبل بازگشت.");
    void load();
  }

  return (
    <>
      <FilterChips<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "history", label: "تاریخچهٔ تغییرات" },
          { value: "archive", label: "بایگانی و بازیابی" },
          { value: "reverse", label: "بازگردانی مرحله" },
        ]}
      />

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {tab === "history" ? (
        rows === null ? (
          <ListSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<History className="size-6" />}
            title="تاریخچه‌ای ثبت نشده"
            description="هر ایجاد، ویرایش، تأیید یا بایگانی از این پس اینجا ثبت می‌شود."
          />
        ) : (
          <ul className="app-card mt-3 divide-y">
            {rows.map((r) => (
              <li key={r.id} className="p-4">
                <p className="text-sm font-extrabold">
                  {TABLE_LABEL[r.tableName] ?? r.tableName} — {OPERATION_LABEL[r.operation] ?? r.operation}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nameOf(r.actorId)} · {faDateTime(r.createdAt)}
                </p>
                {changedFields(r).length ? (
                  <ul className="mt-2 space-y-1">
                    {changedFields(r).map((c) => (
                      <li key={c.key} className="text-xs text-muted-foreground">
                        <span className="font-bold">{c.key}</span>: {short(c.from)} ← {short(c.to)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "archive" ? (
        archived === null ? (
          <ListSkeleton rows={3} />
        ) : archived.length === 0 ? (
          <EmptyState
            icon={<RotateCcw className="size-6" />}
            title="بایگانی خالی است"
            description="رکوردهای حذف‌شده بایگانی می‌شوند و هرگز برای همیشه پاک نمی‌شوند."
          />
        ) : (
          <ul className="app-card mt-3 divide-y">
            {archived.map((row) => (
              <li key={`${row.table}-${row.id}`} className="flex items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{row.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {TABLE_LABEL[row.table] ?? row.table} · {nameOf(row.deletedBy)} ·{" "}
                    {faDateTime(row.deletedAt)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void restore(row)}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                >
                  <RotateCcw className="size-4" /> بازیابی
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "reverse" ? (
        reversible.length === 0 ? (
          <EmptyState
            icon={<Undo2 className="size-6" />}
            title="رکورد قابل بازگردانی نیست"
            description="فقط رکوردهایی که از مرحلهٔ اول عبور کرده‌اند قابل بازگردانی هستند."
          />
        ) : (
          <ul className="app-card mt-3 divide-y">
            {reversible.map((item) => (
              <li key={`${item.table}-${item.id}`} className="flex items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {TABLE_LABEL[item.table] ?? item.table} · {statusLabel(item.status)} ←{" "}
                    {statusLabel(item.target)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => reverse(item)}
                  className="flex shrink-0 items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold"
                >
                  <Undo2 className="size-4" /> مرحلهٔ قبل
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </>
  );
}