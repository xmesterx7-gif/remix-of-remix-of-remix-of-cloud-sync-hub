import { nowISO } from "@/lib/datetime";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit";
import { AmountField, DateField, Field, FormActions, TextArea } from "@/components/forms/fields";
import { uid, useStore, type InvoiceItem } from "@/lib/store";
import { money } from "@/lib/format";

export const Route = createFileRoute("/purchase-invoices/new")({
  head: () => ({
    meta: [
      { title: "ایجاد پیش‌فاکتور خرید | مدیریت تعمیرگاه" },
      { name: "description", content: "ثبت پیش‌فاکتور خرید با چند آیتم، تعداد و قیمت احتمالی." },
      { property: "og:title", content: "ایجاد پیش‌فاکتور خرید" },
      { property: "og:description", content: "ثبت اقلام خرید پیش از خرید واقعی." },
    ],
  }),
  component: () => (
    <AppShell>
      <NewInvoice />
    </AppShell>
  ),
});

function NewInvoice() {
  const { state, setState, user, notify } = useStore();
  const navigate = useNavigate();
  const [number, setNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`);
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(nowISO().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: uid("it"), productName: "", probableQty: 1, probableUnitPrice: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const total = items.reduce((s, i) => s + i.probableQty * i.probableUnitPrice, 0);

  function patchItem(id: string, p: Partial<InvoiceItem>) {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return; // one tap, one invoice
    if (!user) return;
    if (!number.trim() || items.some((i) => !i.productName.trim() || i.probableUnitPrice <= 0)) {
      toast.error("شماره فاکتور و اطلاعات همه آیتم‌ها را کامل کنید.");
      return;
    }
    setSaving(true);
    setState((s) => ({
      ...s,
      invoices: [
        {
          id: uid("i"),
          invoiceNumber: number,
          supplier,
          date: new Date(date).toISOString(),
          status: "PRE_INVOICE",
          notes,
          createdBy: user.id,
          items,
        },
        ...s.invoices,
      ],
    }));
    notify({
      userRole: ["ADMIN", "STORE_MANAGER"],
      title: "پیش‌فاکتور خرید جدید",
      body: "پیش‌فاکتور خرید جدید ثبت شد.",
      url: "/purchase-invoices",
      type: "invoice",
      priority: "NORMAL",
    });
    toast.success("پیش‌فاکتور ثبت شد");
    void navigate({ to: "/purchase-invoices" });
  }

  return (
    <>
      <PageHeader title="ایجاد پیش‌فاکتور خرید" subtitle="اقلام و قیمت‌های احتمالی را وارد کنید" />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="app-card space-y-4 p-4 sm:p-6">
          <Field id="number" label="شماره پیش‌فاکتور" required value={number} onChange={setNumber} />
          <Field
            id="supplier"
            label="تأمین‌کننده"
            value={supplier}
            onChange={setSupplier}
            placeholder="اختیاری"
          />
          <DateField id="date" label="تاریخ" value={date} onChange={setDate} />
          <TextArea id="notes" label="توضیحات" value={notes} onChange={setNotes} />
        </div>

        <div className="app-card space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">اقلام فاکتور</h2>
            <button
              type="button"
              onClick={() =>
                setItems((l) => [...l, { id: uid("it"), productName: "", probableQty: 1, probableUnitPrice: 0 }])
              }
              className="flex items-center gap-1 rounded-full bg-accent px-3 py-2 text-sm font-bold text-accent-foreground"
            >
              <Plus className="size-4" /> افزودن آیتم
            </button>
          </div>

          {items.map((item, idx) => (
            <div key={item.id} className="space-y-3 rounded-2xl bg-secondary p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground">آیتم {idx + 1}</span>
                {items.length > 1 ? (
                  <button
                    type="button"
                    aria-label="حذف آیتم"
                    onClick={() => setItems((l) => l.filter((i) => i.id !== item.id))}
                    className="grid size-9 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
              <Field
                id={`name-${item.id}`}
                label="نام محصول"
                required
                value={item.productName}
                onChange={(v) => patchItem(item.id, { productName: v })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  id={`qty-${item.id}`}
                  label="تعداد احتمالی"
                  required
                  type="number"
                  value={String(item.probableQty)}
                  onChange={(v) => patchItem(item.id, { probableQty: Number(v) || 0 })}
                />
                <AmountField
                  id={`price-${item.id}`}
                  label="قیمت واحد احتمالی"
                  required
                  value={item.probableUnitPrice}
                  onChange={(v) => patchItem(item.id, { probableUnitPrice: v })}
                  currency={state.currency}
                />
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between border-t pt-4">
            <span className="font-bold">جمع کل احتمالی</span>
            <span className="num text-xl font-extrabold text-primary">
              {money(total, state.currency)}
            </span>
          </div>
        </div>

        <FormActions
          saving={saving}
          onCancel={() => navigate({ to: "/purchase-invoices" })}
          submitLabel="ثبت پیش‌فاکتور"
        />
      </form>
    </>
  );
}
