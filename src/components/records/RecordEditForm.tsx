/**
 * فرم «اصلاح» رکوردها برای حساب پشتیبان.
 *
 * پشتیبان در تمام مراحل — حتی رکوردهای نهایی‌شده یا ثبت‌شده در حسابداری —
 * می‌تواند همهٔ فیلدهای مجاز را اصلاح کند. ذخیره از همان مسیر موجود
 * (`setState` → `pushChanges`) انجام می‌شود و تغییر با `log()` در تاریخچه ثبت
 * می‌گردد.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { AmountField, DateField, Field, SelectField, TextArea } from "@/components/forms/fields";
import { nowISO } from "@/lib/datetime";
import {
  BIKE_TYPE_LABEL,
  EXPENSE_LABEL,
  EXPENSE_ORDER,
  INVOICE_STATUS_LABEL,
  PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  uid,
  useStore,
  type ActivityEntry,
  type BicyclePurchase,
  type BikeType,
  type ChatMessage,
  type Expense,
  type ExpenseCategory,
  type InvoiceStatus,
  type Priority,
  type PurchaseInvoice,
  type State,
  type Task,
  type TaskStatus,
} from "@/lib/store";

import type { RecordKind } from "./RecordActions";

const ENTITY: Record<RecordKind, ActivityEntry["entity"]> = {
  expense: "expense",
  purchase: "user",
  task: "task",
  invoice: "user",
  message: "message",
  dailyReport: "user",
};

const dateOnly = (v: string) => (v ? v.slice(0, 10) : "");

const PURCHASE_STATUS: BicyclePurchase["status"][] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SYNCED_TO_ACCOUNTING",
];

const PURCHASE_STATUS_LABEL: Record<BicyclePurchase["status"], string> = {
  PENDING: "در انتظار تأیید",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  SYNCED_TO_ACCOUNTING: "ثبت در حسابداری",
};

export function RecordEditForm({
  kind,
  id,
  note,
  onClose,
}: {
  kind: RecordKind;
  id: string;
  note: string;
  onClose: () => void;
}) {
  const { state, setState, log } = useStore();

  const original = useMemo(() => {
    switch (kind) {
      case "expense":
        return state.expenses.find((x) => x.id === id) ?? null;
      case "purchase":
        return state.purchases.find((x) => x.id === id) ?? null;
      case "task":
        return state.tasks.find((x) => x.id === id) ?? null;
      case "invoice":
        return state.invoices.find((x) => x.id === id) ?? null;
      case "message":
        return state.messages.find((x) => x.id === id) ?? null;
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id, state.expenses, state.purchases, state.tasks, state.invoices, state.messages]);

  const [draft, setDraft] = useState<Record<string, unknown>>(() => ({ ...(original ?? {}) }));

  if (!original) {
    return <p className="p-4 text-sm text-muted-foreground">این ثبت دیگر در دسترس نیست.</p>;
  }

  const set = (patch: Record<string, unknown>) => setDraft((d) => ({ ...d, ...patch }));
  const str = (k: string) => String((draft[k] as string | undefined) ?? "");
  const numv = (k: string) => Number((draft[k] as number | undefined) ?? 0);

  function commit(next: unknown) {
    setState((s: State): State => {
      switch (kind) {
        case "expense":
          return {
            ...s,
            expenses: s.expenses.map((x) => (x.id === id ? (next as Expense) : x)),
          };
        case "purchase":
          return {
            ...s,
            purchases: s.purchases.map((x) => (x.id === id ? (next as BicyclePurchase) : x)),
          };
        case "task":
          return { ...s, tasks: s.tasks.map((x) => (x.id === id ? (next as Task) : x)) };
        case "invoice":
          return {
            ...s,
            invoices: s.invoices.map((x) => (x.id === id ? (next as PurchaseInvoice) : x)),
          };
        case "message":
          return {
            ...s,
            messages: s.messages.map((x) => (x.id === id ? (next as ChatMessage) : x)),
          };
        default:
          return s;
      }
    });
    log({
      entity: ENTITY[kind],
      recordId: id,
      action: "اصلاح ثبت توسط پشتیبان",
      before: original,
      after: next,
      note,
    });
    toast.success("تغییرات ذخیره شد.");
    onClose();
  }

  /**
   * فیلدهای اختیاری با مقدار خالی باید حذف شوند (نه `undefined` شوند)
   * تا با تنظیم سخت‌گیرانهٔ TypeScript سازگار بماند.
   */
  function withOptional<T extends object>(
    base: T,
    optional: Record<string, string | number | undefined>,
  ): T {
    const out = { ...base } as Record<string, unknown>;
    for (const [key, value] of Object.entries(optional)) {
      if (value === undefined || value === "" || value === 0) delete out[key];
      else out[key] = value;
    }
    return out as T;
  }

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    if (kind === "expense") {
      const o = original as Expense;
      if (numv("amount") <= 0) {
        toast.error("مبلغ باید بزرگ‌تر از صفر باشد.");
        return;
      }
      commit(
        withOptional<Expense>(
          {
            ...o,
            category: str("category") as ExpenseCategory,
            name: str("name"),
            amount: numv("amount"),
            date: str("date") || o.date,
            description: str("description"),
            status: (str("status") || o.status) as Expense["status"],
          },
          { relatedUserId: str("relatedUserId"), reviewNote: str("reviewNote") },
        ),
      );
      return;
    }
    if (kind === "purchase") {
      const o = original as BicyclePurchase;
      if (!str("brand").trim()) {
        toast.error("برند اجباری است.");
        return;
      }
      commit(
        withOptional<BicyclePurchase>(
          {
            ...o,
            brand: str("brand"),
            color: str("color"),
            size: str("size"),
            bikeType: (str("bikeType") || o.bikeType) as BikeType,
            purchasePrice: numv("purchasePrice"),
            description: str("description"),
            status: (str("status") || o.status) as BicyclePurchase["status"],
          },
          { reviewNote: str("reviewNote") },
        ),
      );
      return;
    }
    if (kind === "task") {
      const o = original as Task;
      if (!str("title").trim()) {
        toast.error("عنوان وظیفه اجباری است.");
        return;
      }
      commit(
        withOptional<Task>(
          {
            ...o,
            title: str("title"),
            description: str("description"),
            workerId: str("workerId"),
            priority: (str("priority") || o.priority) as Priority,
            wage: numv("wage"),
            status: (str("status") || o.status) as TaskStatus,
            updatedAt: nowISO(),
          },
          {
            dueDate: str("dueDate") ? new Date(str("dueDate")).toISOString() : "",
            finalWage: numv("finalWage"),
            wageNote: str("wageNote"),
            completedNote: str("completedNote"),
            rejectReason: str("rejectReason"),
          },
        ),
      );
      return;
    }
    if (kind === "invoice") {
      const o = original as PurchaseInvoice;
      commit({
        ...o,
        invoiceNumber: str("invoiceNumber"),
        supplier: str("supplier"),
        date: str("date") || o.date,
        notes: str("notes"),
        status: (str("status") || o.status) as InvoiceStatus,
        items: (draft['items'] as PurchaseInvoice["items"]) ?? o.items,
      } satisfies PurchaseInvoice);
      return;
    }
    if (kind === "message") {
      const o = original as ChatMessage;
      commit({ ...o, text: str("text"), editedAt: nowISO() } satisfies ChatMessage);
    }
  }


  const items = (draft['items'] as PurchaseInvoice["items"]) ?? [];
  const people = state.users.filter((u) => !u.isArchived);

  return (
    <form onSubmit={submit} className="space-y-4 p-4" noValidate>
      {kind === "expense" ? (
        <>
          <SelectField
            id="rec-category"
            label="نوع هزینه"
            value={str("category")}
            onChange={(v) => set({ category: v })}
            options={EXPENSE_ORDER.map((c) => ({ value: c, label: EXPENSE_LABEL[c] }))}
          />
          <Field id="rec-name" label="عنوان" value={str("name")} onChange={(v) => set({ name: v })} />
          <AmountField
            id="rec-amount"
            label="مبلغ"
            value={numv("amount")}
            onChange={(v) => set({ amount: v })}
            currency={state.currency}
          />
          <DateField
            id="rec-date"
            label="تاریخ"
            value={dateOnly(str("date"))}
            onChange={(v) => set({ date: v })}
          />
          <SelectField
            id="rec-related"
            label="مربوط به کارمند"
            value={str("relatedUserId")}
            onChange={(v) => set({ relatedUserId: v })}
            options={[{ value: "", label: "—" }, ...people.map((u) => ({ value: u.id, label: u.fullName }))]}
          />
          <TextArea
            id="rec-desc"
            label="توضیحات"
            value={str("description")}
            onChange={(v) => set({ description: v })}
          />
          <SelectField
            id="rec-status"
            label="وضعیت"
            value={str("status")}
            onChange={(v) => set({ status: v })}
            options={PURCHASE_STATUS.map((s) => ({ value: s, label: PURCHASE_STATUS_LABEL[s] }))}
          />
          <TextArea
            id="rec-review"
            label="یادداشت بررسی"
            value={str("reviewNote")}
            onChange={(v) => set({ reviewNote: v })}
          />
        </>
      ) : null}

      {kind === "purchase" ? (
        <>
          <Field id="rec-brand" label="برند" value={str("brand")} onChange={(v) => set({ brand: v })} />
          <Field id="rec-color" label="رنگ" value={str("color")} onChange={(v) => set({ color: v })} />
          <Field id="rec-size" label="سایز" value={str("size")} onChange={(v) => set({ size: v })} />
          <SelectField
            id="rec-biketype"
            label="نوع دوچرخه"
            value={str("bikeType")}
            onChange={(v) => set({ bikeType: v })}
            options={(Object.keys(BIKE_TYPE_LABEL) as BikeType[]).map((b) => ({
              value: b,
              label: BIKE_TYPE_LABEL[b],
            }))}
          />
          <AmountField
            id="rec-price"
            label="قیمت خرید"
            value={numv("purchasePrice")}
            onChange={(v) => set({ purchasePrice: v })}
            currency={state.currency}
          />
          <TextArea
            id="rec-desc"
            label="توضیحات"
            value={str("description")}
            onChange={(v) => set({ description: v })}
          />
          <SelectField
            id="rec-status"
            label="وضعیت"
            value={str("status")}
            onChange={(v) => set({ status: v })}
            options={PURCHASE_STATUS.map((s) => ({ value: s, label: PURCHASE_STATUS_LABEL[s] }))}
          />
          <TextArea
            id="rec-review"
            label="یادداشت بررسی"
            value={str("reviewNote")}
            onChange={(v) => set({ reviewNote: v })}
          />
        </>
      ) : null}

      {kind === "task" ? (
        <>
          <Field id="rec-title" label="عنوان وظیفه" value={str("title")} onChange={(v) => set({ title: v })} />
          <TextArea
            id="rec-desc"
            label="توضیحات"
            value={str("description")}
            onChange={(v) => set({ description: v })}
          />
          <SelectField
            id="rec-worker"
            label="تعمیرکار"
            value={str("workerId")}
            onChange={(v) => set({ workerId: v })}
            options={[
              { value: "", label: "بدون تخصیص" },
              ...people.map((u) => ({ value: u.id, label: u.fullName })),
            ]}
          />
          <SelectField
            id="rec-priority"
            label="اولویت"
            value={str("priority")}
            onChange={(v) => set({ priority: v })}
            options={(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => ({
              value: p,
              label: PRIORITY_LABEL[p],
            }))}
          />
          <DateField
            id="rec-due"
            label="تاریخ سررسید"
            value={dateOnly(str("dueDate"))}
            onChange={(v) => set({ dueDate: v })}
          />
          <AmountField
            id="rec-wage"
            label="دستمزد"
            value={numv("wage")}
            onChange={(v) => set({ wage: v })}
            currency={state.currency}
          />
          <AmountField
            id="rec-finalwage"
            label="دستمزد نهایی"
            value={numv("finalWage")}
            onChange={(v) => set({ finalWage: v })}
            currency={state.currency}
          />
          <SelectField
            id="rec-status"
            label="وضعیت"
            value={str("status")}
            onChange={(v) => set({ status: v })}
            options={(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((s) => ({
              value: s,
              label: TASK_STATUS_LABEL[s],
            }))}
          />
          <TextArea
            id="rec-wagenote"
            label="یادداشت دستمزد"
            value={str("wageNote")}
            onChange={(v) => set({ wageNote: v })}
          />
          <TextArea
            id="rec-cnote"
            label="گزارش انجام کار"
            value={str("completedNote")}
            onChange={(v) => set({ completedNote: v })}
          />
          <TextArea
            id="rec-reject"
            label="دلیل رد"
            value={str("rejectReason")}
            onChange={(v) => set({ rejectReason: v })}
          />
        </>
      ) : null}

      {kind === "invoice" ? (
        <>
          <Field
            id="rec-invnum"
            label="شماره فاکتور"
            value={str("invoiceNumber")}
            onChange={(v) => set({ invoiceNumber: v })}
          />
          <Field
            id="rec-supplier"
            label="تأمین‌کننده"
            value={str("supplier")}
            onChange={(v) => set({ supplier: v })}
          />
          <DateField
            id="rec-date"
            label="تاریخ"
            value={dateOnly(str("date"))}
            onChange={(v) => set({ date: v })}
          />
          <SelectField
            id="rec-status"
            label="وضعیت"
            value={str("status")}
            onChange={(v) => set({ status: v })}
            options={(Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[]).map((s) => ({
              value: s,
              label: INVOICE_STATUS_LABEL[s],
            }))}
          />
          <TextArea id="rec-notes" label="یادداشت" value={str("notes")} onChange={(v) => set({ notes: v })} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold">اقلام فاکتور</span>
              <button
                type="button"
                onClick={() =>
                  set({
                    items: [
                      ...items,
                      {
                        id: uid("ii"),
                        productName: "",
                        probableQty: 1,
                        probableUnitPrice: 0,
                      },
                    ],
                  })
                }
                className="flex items-center gap-1 rounded-full bg-accent px-3 py-2 text-xs font-bold text-accent-foreground"
              >
                <Plus className="size-4" /> افزودن قلم
              </button>
            </div>
            {items.map((it, index) => (
              <div key={it.id} className="space-y-3 rounded-2xl border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">قلم {index + 1}</span>
                  <button
                    type="button"
                    aria-label="حذف قلم"
                    onClick={() => set({ items: items.filter((x) => x.id !== it.id) })}
                    className="text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <Field
                  id={`rec-item-name-${it.id}`}
                  label="نام کالا"
                  value={it.productName}
                  onChange={(v) =>
                    set({ items: items.map((x) => (x.id === it.id ? { ...x, productName: v } : x)) })
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    id={`rec-item-pq-${it.id}`}
                    label="تعداد احتمالی"
                    type="number"
                    value={String(it.probableQty)}
                    onChange={(v) =>
                      set({
                        items: items.map((x) =>
                          x.id === it.id ? { ...x, probableQty: Number(v) || 0 } : x,
                        ),
                      })
                    }
                  />
                  <AmountField
                    id={`rec-item-pp-${it.id}`}
                    label="قیمت واحد احتمالی"
                    value={it.probableUnitPrice}
                    currency={state.currency}
                    onChange={(v) =>
                      set({
                        items: items.map((x) => (x.id === it.id ? { ...x, probableUnitPrice: v } : x)),
                      })
                    }
                  />
                  <Field
                    id={`rec-item-fq-${it.id}`}
                    label="تعداد نهایی"
                    type="number"
                    value={it.finalQty == null ? "" : String(it.finalQty)}
                    onChange={(v) =>
                      set({
                        items: items.map((x) =>
                          x.id === it.id
                            ? { ...x, finalQty: v === "" ? undefined : Number(v) || 0 }
                            : x,
                        ),
                      })
                    }
                  />
                  <AmountField
                    id={`rec-item-fp-${it.id}`}
                    label="قیمت واحد نهایی"
                    value={it.finalUnitPrice ?? 0}
                    currency={state.currency}
                    onChange={(v) =>
                      set({
                        items: items.map((x) => (x.id === it.id ? { ...x, finalUnitPrice: v } : x)),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {kind === "message" ? (
        <TextArea id="rec-text" label="متن پیام" value={str("text")} onChange={(v) => set({ text: v })} />
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          className="min-h-13 flex-1 rounded-xl bg-primary py-3.5 font-extrabold text-primary-foreground"
        >
          ذخیره تغییرات
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-13 rounded-xl border px-5 font-bold"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}
