import { useMemo, useState } from "react";
import { toast } from "sonner";
import { KeyRound, UserPlus, Users } from "lucide-react";
import { Chip, EmptyState } from "@/components/ui-kit";
import { Field, SelectField } from "@/components/forms/fields";
import { POSITIONS,
  ROLE_LABEL, can, roleTitle, uid, useStore, type Role } from "@/lib/store";
import { faDateTime } from "@/lib/format";

const EMPTY = {
  fullName: "",
  username: "",
  password: "",
  title: "",
  phone: "",
  bio: "",
  role: "EMPLOYEE" as Role,
  customRole: "",
};

export function PeopleIntroSection() {
  const { state, setState, user, log } = useStore();
  const [form, setForm] = useState(EMPTY);
  const customRoles = state.customRoles ?? [];

  const levelOptions = useMemo(
    () => [
      ...POSITIONS.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
      ...customRoles.map((r) => ({ value: `custom:${r.name}`, label: `${r.name} (دلخواه)` })),
    ],
    [customRoles],
  );

  const recent = useMemo(() => [...state.users].slice(-6).reverse(), [state.users]);

  if (!can(user, "users"))
    return (
      <EmptyState
        icon={<Users className="size-6" />}
        title="دسترسی ندارید"
        description="بخش معرفی اشخاص فقط برای پشتیبان در دسترس است."
      />
    );

  function pickLevel(value: string) {
    if (!value.startsWith("custom:")) {
      setForm((f) => ({ ...f, role: value as Role, customRole: "" }));
      return;
    }
    const name = value.slice(7);
    const role = customRoles.find((r) => r.name === name);
    if (!role) return;
    setForm((f) => ({ ...f, role: role.baseRole, customRole: role.name }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const username = form.username.trim();
    const password = form.password.trim();
    if (!username) {
      toast.error("نام کاربری اجباری است.");
      return;
    }
    if (password.length < 4) {
      toast.error("رمز عبور باید حداقل ۴ کاراکتر باشد.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("سمت شخص را وارد کنید.");
      return;
    }
    if (state.users.some((u) => u.username.trim().toLowerCase() === username.toLowerCase())) {
      toast.error("این نام کاربری قبلاً استفاده شده است.");
      return;
    }

    const permissions = form.customRole
      ? { ...(customRoles.find((r) => r.name === form.customRole)?.permissions ?? {}) }
      : {};
    const id = uid("u");
    setState((s) => ({
      ...s,
      users: [
        ...s.users,
        {
          id,
          fullName: form.fullName.trim() || username,
          username,
          password,
          phone: form.phone.trim(),
          title: form.title.trim(),
          bio: form.bio.trim(),
          role: form.role,
          ...(form.customRole ? { customRole: form.customRole } : {}),
          isActive: true,
          isArchived: false,
          isWorker: form.role === "MECHANIC",
          permissions,
        },
      ],
    }));
    log({
      entity: "user",
      recordId: id,
      action: "معرفی شخص جدید و ساخت حساب کاربری",
      note: `${form.fullName.trim() || username} — ${form.customRole || ROLE_LABEL[form.role]}`,
    });
    setForm(EMPTY);
    toast.success("شخص معرفی شد؛ می‌تواند با همین نام کاربری و رمز عبور وارد شود.");
  }

  const levelValue = form.customRole ? `custom:${form.customRole}` : form.role;

  return (
    <>
      <form onSubmit={submit} className="app-card grid gap-4 p-4">
        <Field
          id="p-username"
          label="نام کاربری"
          required
          value={form.username}
          onChange={(v) => setForm((f) => ({ ...f, username: v }))}
          placeholder="مثال: reza"
        />
        <Field
          id="p-password"
          label="رمز عبور"
          required
          value={form.password}
          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
          placeholder="حداقل ۴ کاراکتر"
        />
        <Field
          id="p-fullname"
          label="نام و نام خانوادگی (اختیاری)"
          value={form.fullName}
          onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
        />
        <Field
          id="p-title"
          label="پست یا سمت"
          required
          value={form.title}
          onChange={(v) => setForm((f) => ({ ...f, title: v }))}
          placeholder="مثال: مسئول فروش"
        />
        <Field
          id="p-phone"
          label="شماره تماس (اختیاری)"
          type="tel"
          value={form.phone}
          onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
        />
        <div className="space-y-2">
          <label htmlFor="p-bio" className="block text-sm font-bold">
            اطلاعاتی راجع به کاربر (اختیاری)
          </label>
          <textarea
            id="p-bio"
            rows={3}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="توضیح دلخواه دربارهٔ این شخص"
            className="w-full rounded-xl border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <SelectField
          id="p-level"
          label="سطح کاربر"
          required
          value={levelValue}
          onChange={pickLevel}
          options={levelOptions}
        />

        <p className="flex items-start gap-2 rounded-xl bg-accent p-3 text-xs font-bold text-accent-foreground">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          دسترسی‌های دقیق این شخص را بعد از ساخت حساب، از بخش «تغییر دسترسی کاربران» تنظیم کنید.
        </p>

        <button
          type="submit"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
        >
          <UserPlus className="size-4" /> ثبت و ساخت حساب
        </button>
      </form>

      <h2 className="mb-3 mt-6 text-sm font-extrabold text-muted-foreground">آخرین اشخاص معرفی‌شده</h2>
      {recent.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="هنوز شخصی معرفی نشده"
          description="با فرم بالا اولین حساب کاربری را بسازید."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {recent.map((u) => (
            <li key={u.id} className="app-card p-4">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-extrabold">{u.fullName}</p>
                <Chip tone={u.role === "ADMIN" ? "success" : "neutral"}>{roleTitle(u)}</Chip>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {u.title || "بدون سمت"} — {u.username}
              </p>
              {u.bio ? <p className="mt-2 text-xs text-muted-foreground">{u.bio}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">آخرین بروزرسانی: {faDateTime(new Date())}</p>
    </>
  );
}
