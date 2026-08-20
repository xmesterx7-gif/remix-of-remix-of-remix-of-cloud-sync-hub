import { nowISO } from "@/lib/datetime";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit";
import { AmountField, DateField, Field, FormActions, SelectField, TextArea } from "@/components/forms/fields";
import { EXPENSE_LABEL, can, uid, useStore, type ExpenseCategory } from "@/lib/store";

type Search = { category?: ExpenseCategory };

export const Route = createFileRoute("/expenses/new")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    category: (search["category"] as ExpenseCategory) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "ثبت هزینه | مدیریت تعمیرگاه" },
      { name: "description", content: "فرم ثبت هزینه با دسته‌بندی، مبلغ، تاریخ شمسی و توضیحات." },
      { property: "og:title", content: "ثبت هزینه جدید" },
      { property: "og:description", content: "ثبت سریع هزینه‌های فروشگاه و تعمیرگاه دوچرخه." },
    ],
  }),
  component: () => (
    <AppShell>
      <NewExpense />
    </AppShell>
  ),
});

function NewExpense() {
  const { category } = useSearch({ from: "/expenses/new" });
  const { state, setState, user, notify } = useStore();
  const navigate = useNavigate();
  const [cat, setCat] = useState<ExpenseCategory>(category ?? "MISCELLANEOUS");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(nowISO().slice(0, 10));
  const [description, setDescription] = useState("");
  const [relatedUserId, setRelatedUserId] = useState("");
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const allowedCats = (Object.keys(EXPENSE_LABEL) as ExpenseCategory[]).filter(
    (c) => c !== "PERSONAL_WITHDRAWAL" || can(user, "personalWithdrawal"),
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return; // guards against a double tap sending the expense twice
    setError("");
    setNameError("");
    if (cat === "MISCELLANEOUS" && !name.trim()) {
      setNameError("نام هزینه را وارد کنید.");
      return;
    }
    if (amount <= 0) {
      setError("مبلغ هزینه را وارد کنید.");
      return;
    }
    if (!user) return;
    setSaving(true);
    setState((s) => ({
      ...s,
      expenses: [
        {
          id: uid("e"),
          category: cat,
          amount,
          date: new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`).toISOString(),
          description,
          ...(cat === "MISCELLANEOUS" && name.trim() ? { name: name.trim() } : {}),
          ...(relatedUserId ? { relatedUserId } : {}),
          createdBy: user.id,
          status: "PENDING",
        },
        ...s.expenses,
      ],
    }));
    notify({
      userRole: ["SALARY", "BONUS", "PENALTY"].includes(cat)
        ? ["ADMIN", "STORE_MANAGER"]
        : ["ADMIN"],
      title: "هزینه جدید ثبت شد",
      body: `${cat === "MISCELLANEOUS" && name.trim() ? name.trim() : EXPENSE_LABEL[cat]} به مبلغ ثبت‌شده نیاز به بررسی دارد.`,
      url: "/expenses",
      type: "expense",
      priority: "NORMAL",
    });
    toast.success("هزینه با موفقیت ثبت شد");
    void navigate({ to: "/expenses", search: { range: "ALL" } });
  }

  return (
    <>
      <PageHeader title="ثبت هزینه" subtitle="اطلاعات هزینه را وارد کنید" />
      <form onSubmit={submit} className="app-card space-y-4 p-4 sm:p-6" noValidate>
        <SelectField
          id="category"
          label="دسته هزینه"
          required
          value={cat}
          onChange={(v) => setCat(v as ExpenseCategory)}
          options={allowedCats.map((c) => ({ value: c, label: EXPENSE_LABEL[c] }))}
        />
        {cat === "MISCELLANEOUS" ? (
          <Field
            id="expense-name"
            label="نام هزینه"
            required
            value={name}
            onChange={setName}
            error={nameError || undefined}
            placeholder="مثلاً خرید لوازم مصرفی"
          />
        ) : null}
        <AmountField
          id="amount"
          label="مبلغ"
          required
          value={amount}
          onChange={setAmount}
          error={error || undefined}
          currency={state.currency}
        />
        <DateField id="date" label="تاریخ" value={date} onChange={setDate} />
        <SelectField
          id="relatedUser"
          label="کاربر مرتبط (اختیاری)"
          value={relatedUserId}
          onChange={setRelatedUserId}
          options={[
            { value: "", label: "بدون کاربر" },
            ...state.users.map((u) => ({ value: u.id, label: u.fullName })),
          ]}
        />

        <TextArea
          id="description"
          label="توضیحات"
          value={description}
          onChange={setDescription}
          placeholder="اختیاری"
        />
        <FormActions saving={saving} onCancel={() => navigate({ to: "/expenses", search: { range: "ALL" } })} submitLabel="ثبت هزینه" />
      </form>
    </>
  );
}
