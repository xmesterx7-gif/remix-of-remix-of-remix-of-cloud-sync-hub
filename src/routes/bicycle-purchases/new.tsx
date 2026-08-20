import { nowISO } from "@/lib/datetime";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit";
import { BIKE_SIZES, BIKE_TYPE_LABEL, uid, useStore, type BikeType } from "@/lib/store";
import { AmountField, Field, FormActions, OptionGroup, TextArea } from "@/components/forms/fields";
import { toFa } from "@/lib/format";


export const Route = createFileRoute("/bicycle-purchases/new")({
  head: () => ({
    meta: [
      { title: "ثبت خرید دوچرخه | مدیریت تعمیرگاه" },
      { name: "description", content: "فرم ثبت خرید دوچرخه شامل برند، سایز، رنگ، نوع و قیمت خرید." },
      { property: "og:title", content: "ثبت خرید دوچرخه جدید" },
      { property: "og:description", content: "ثبت سریع خرید دوچرخه در سامانه تعمیرگاه." },
    ],
  }),
  component: () => (
    <AppShell>
      <NewPurchase />
    </AppShell>
  ),
});

function NewPurchase() {
  const { setState, user, notify, state } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    size: "",
    brand: "",
    color: "",
    bikeType: "SPORT" as BikeType,
    price: 0,
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!form.size.trim()) err['size'] = "سایز دوچرخه اجباری است.";
    if (!form.brand.trim()) err['brand'] = "برند اجباری است.";
    if (!form.color.trim()) err['color'] = "رنگ اجباری است.";
    if (form.price <= 0) err['price'] = "قیمت خرید را وارد کنید.";
    setErrors(err);
    if (Object.keys(err).length || !user) return;

    setSaving(true);
    setState((s) => ({
      ...s,
      purchases: [
        {
          id: uid("b"),
          size: form.size,
          brand: form.brand,
          color: form.color,
          bikeType: form.bikeType,
          purchasePrice: form.price,
          description: form.description,
          createdBy: user.id,
          status: "PENDING",
          createdAt: nowISO(),
        },
        ...s.purchases,
      ],
    }));
    notify({
      userRole: ["ADMIN", "STORE_MANAGER"],
      title: "خرید دوچرخه جدید",
      body: "خرید دوچرخه جدید ثبت شد و نیاز به بررسی دارد.",
      url: "/bicycle-purchases",
      type: "purchase",
      priority: "NORMAL",
    });
    toast.success("خرید دوچرخه ثبت شد و برای بررسی ارسال گردید.");
    void navigate({ to: "/bicycle-purchases" });
  }

  return (
    <>
      <PageHeader title="ثبت خرید دوچرخه" subtitle="فیلدهای ستاره‌دار اجباری هستند" />
      <form onSubmit={submit} className="app-card space-y-4 p-4 sm:p-6" noValidate>
        <Field
          id="brand"
          label="برند"
          required
          value={form.brand}
          onChange={(v) => setForm({ ...form, brand: v })}
          error={errors['brand']}
          placeholder="مثلاً Giant Talon 2"
        />
        <OptionGroup
          label="سایز دوچرخه"
          required
          value={form.size}
          onChange={(v) => setForm({ ...form, size: v })}
          error={errors['size']}
          options={BIKE_SIZES.map((s) => ({ value: s, label: toFa(s) }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">

          <Field
            id="color"
            label="رنگ"
            required
            value={form.color}
            onChange={(v) => setForm({ ...form, color: v })}
            error={errors['color']}
            placeholder="آبی"
          />
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-bold">نوع دوچرخه</span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(BIKE_TYPE_LABEL) as BikeType[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setForm({ ...form, bikeType: t })}
                aria-pressed={form.bikeType === t}
                className={`min-h-12 rounded-xl text-sm font-bold ${
                  form.bikeType === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {BIKE_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <AmountField
          id="price"
          label="قیمت خرید"
          required
          value={form.price}
          onChange={(v) => setForm({ ...form, price: v })}
          error={errors['price']}
          currency={state.currency}
        />

        <TextArea
          id="description"
          label="توضیحات"
          value={form.description}
          onChange={(v) => setForm({ ...form, description: v })}
          placeholder="اختیاری"
        />

        <FormActions saving={saving} onCancel={() => navigate({ to: "/bicycle-purchases" })} />
      </form>
    </>
  );
}
