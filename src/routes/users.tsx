import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Pencil, Plus, RotateCcw, ShieldCheck, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, FilterChips, PageHeader } from "@/components/ui-kit";
import { Field, SelectField } from "@/components/forms/fields";
import {
  CAN,
  PERMISSION_KEYS,
  PERMISSION_LABEL,
  POSITIONS,
  ROLE_LABEL,
  can,
  roleTitle,
  uid,
  useStore,
  type CustomRole,
  type Role,
} from "@/lib/store";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "مدیریت کاربران و نقش‌ها | مدیریت تعمیرگاه" },
      {
        name: "description",
        content: "افزودن، ویرایش، غیرفعال‌سازی و آرشیو کاربران همراه با تعریف نقش‌ها و دسترسی‌های دلخواه.",
      },
      { property: "og:title", content: "مدیریت کاربران و دسترسی‌های تعمیرگاه دوچرخه" },
      {
        property: "og:description",
        content: "کنترل کامل نقش‌ها، دسترسی‌ها و وضعیت هر کاربر توسط پشتیبان.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <UsersPage />
    </AppShell>
  ),
});

type Filter = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ACTIVE", label: "فعال" },
  { value: "INACTIVE", label: "غیرفعال" },
  { value: "ARCHIVED", label: "آرشیو" },
  { value: "ALL", label: "همه" },
];

/** Toggle row used for both user overrides and custom role definitions. */
function PermissionToggle({
  label,
  allowed,
  onToggle,
  onReset,
}: {
  label: string;
  allowed: boolean;
  onToggle: () => void;
  onReset?: (() => void) | undefined;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold">{label}</span>
      <div className="flex shrink-0 items-center gap-2">
        {onReset ? (
          <button type="button" onClick={onReset} className="text-xs font-bold text-muted-foreground underline">
            پیش‌فرض نقش
          </button>
        ) : null}
        <button
          type="button"
          role="switch"
          aria-checked={allowed}
          aria-label={label}
          onClick={onToggle}
          className={`h-7 w-12 rounded-full p-1 transition-colors ${allowed ? "bg-primary" : "bg-muted"}`}
        >
          <span
            className={`block size-5 rounded-full bg-card transition-transform ${
              allowed ? "-translate-x-5" : ""
            }`}
          />
        </button>
      </div>
    </li>
  );
}

function UsersPage() {
  const { state, setState, user, log } = useStore();
  const [open, setOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    phone: "",
    password: "",
    role: "EMPLOYEE" as Role,
    customRole: "",
    title: "",
    bio: "",
    permissions: {} as Record<string, boolean>,
  });

  const customRoles = state.customRoles ?? [];

  const visible = useMemo(
    () =>
      state.users.filter((u) =>
        filter === "ALL"
          ? true
          : filter === "ARCHIVED"
            ? u.isArchived
            : filter === "INACTIVE"
              ? !u.isArchived && !u.isActive
              : !u.isArchived && u.isActive,
      ),
    [state.users, filter],
  );

  if (!can(user, "users"))
    return (
      <EmptyState
        icon={<Users className="size-6" />}
        title="دسترسی ندارید"
        description="این بخش فقط برای مدیر اصلی در دسترس است."
      />
    );

  function openNew() {
    setEditId(null);
    setForm({
      fullName: "",
      username: "",
      phone: "",
      password: "",
      role: "EMPLOYEE",
      customRole: "",
      title: "",
      bio: "",
      permissions: {},
    });
    setOpen(true);
  }

  function openEdit(id: string) {
    const u = state.users.find((x) => x.id === id)!;
    setEditId(id);
    setForm({
      fullName: u.fullName,
      username: u.username,
      phone: u.phone,
      password: "",
      role: u.role,
      customRole: u.customRole ?? "",
      title: u.title,
      bio: u.bio ?? "",
      permissions: { ...(u.permissions ?? {}) },
    });
    setOpen(true);
  }

  /** Applies a custom role: its access map is copied onto the person and stays until changed. */
  function pickRole(value: string) {
    if (!value.startsWith("custom:")) {
      setForm((f) => ({ ...f, role: value as Role, customRole: "" }));
      return;
    }
    const name = value.slice(7);
    const role = customRoles.find((r) => r.name === name);
    if (!role) return;
    setForm((f) => ({
      ...f,
      role: role.baseRole,
      customRole: role.name,
      permissions: { ...role.permissions },
    }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.username.trim()) {
      toast.error("نام و نام کاربری اجباری هستند.");
      return;
    }
    const username = form.username.trim();
    const duplicate = state.users.some(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== editId,
    );
    if (duplicate) {
      toast.error("این نام کاربری قبلاً استفاده شده است.");
      return;
    }
    if (!editId && form.password.trim().length < 4) {
      toast.error("رمز عبور باید حداقل ۴ کاراکتر باشد.");
      return;
    }
    if (editId && form.password.trim() && form.password.trim().length < 4) {
      toast.error("رمز عبور جدید باید حداقل ۴ کاراکتر باشد.");
      return;
    }
    const newId = uid("u");
    setState((s) => ({
      ...s,
      users: editId
        ? s.users.map((u) =>
            u.id === editId
              ? {
                  ...u,
                  fullName: form.fullName.trim(),
                  username,
                  phone: form.phone.trim(),
                  title: form.title.trim(),
                  bio: form.bio.trim(),
                  role: form.role,
                  ...(form.customRole.trim() ? { customRole: form.customRole.trim() } : {}),

                  isWorker: form.role === "MECHANIC",
                  permissions: { ...form.permissions },
                  ...(form.password.trim() ? { password: form.password.trim() } : {}),
                }
              : u,
          )
        : [
            ...s.users,
            {
              id: newId,
              fullName: form.fullName.trim(),
              username,
              phone: form.phone.trim(),
              password: form.password.trim(),
              title: form.title.trim(),
              bio: form.bio.trim(),
              role: form.role,
              ...(form.customRole.trim() ? { customRole: form.customRole.trim() } : {}),
              isActive: true,
              isArchived: false,
              isWorker: form.role === "MECHANIC",
              permissions: { ...form.permissions },
            },
          ],
    }));
    log({
      entity: "user",
      recordId: editId ?? newId,
      action: editId ? "ویرایش کاربر و دسترسی‌ها" : "ساخت کاربر جدید",
      note: `${form.fullName.trim()} — ${form.customRole.trim() || ROLE_LABEL[form.role]}`,
    });

    setOpen(false);
    toast.success(editId ? "کاربر ویرایش شد" : "کاربر جدید افزوده شد");
  }

  const roleOptions = [
    ...POSITIONS.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
    ...customRoles.map((r) => ({ value: `custom:${r.name}`, label: `${r.name} (دلخواه)` })),
  ];

  return (
    <>
      <PageHeader
        title="مدیریت کاربران"
        subtitle="کاربران، نقش‌ها و دسترسی‌های پرسنل تعمیرگاه"
        action={
          <button
            onClick={openNew}
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" /> افزودن کاربر
          </button>
        }
      />

      <button
        onClick={() => setRolesOpen(true)}
        className="app-card mb-4 flex w-full items-center gap-3 p-4 text-start"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">نقش‌ها و دسترسی‌ها</span>
          <span className="block text-xs text-muted-foreground">
            تعریف نقش دلخواه با دسترسی مشخص و اختصاص آن به افراد
          </span>
        </span>
        <Chip tone="neutral">{customRoles.length ? `${customRoles.length} نقش دلخواه` : "پیش‌فرض"}</Chip>
      </button>

      <div className="mb-4">
        <FilterChips value={filter} onChange={setFilter} options={FILTERS} />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="کاربری در این وضعیت نیست"
          description="وضعیت دیگری را انتخاب کنید یا کاربر جدیدی بسازید."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((u) => (
            <li
              key={u.id}
              className={`app-card overflow-hidden border-e-4 p-4 ${
                u.isArchived ? "border-e-muted" : u.isActive ? "border-e-primary" : "border-e-destructive"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-accent font-bold text-accent-foreground">
                    {u.fullName.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate font-extrabold ${
                      !u.isActive || u.isArchived ? "line-through opacity-70" : ""
                    }`}
                  >
                    {u.fullName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{u.title || u.username}</p>
                </div>
                <Chip tone={u.role === "ADMIN" ? "success" : "neutral"}>{roleTitle(u)}</Chip>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span
                  className={`flex items-center gap-1.5 text-sm font-bold ${
                    u.isArchived
                      ? "text-muted-foreground"
                      : u.isActive
                        ? "text-primary"
                        : "text-destructive"
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      u.isArchived ? "bg-muted-foreground" : u.isActive ? "bg-primary" : "bg-destructive"
                    }`}
                  />
                  {u.isArchived ? "آرشیو شده" : u.isActive ? "فعال" : "غیرفعال"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(u.id)}
                    aria-label={`ویرایش ${u.fullName}`}
                    className="grid size-10 place-items-center rounded-lg hover:bg-accent"
                  >
                    <Pencil className="size-5" />
                  </button>
                  {u.isActive ? (
                    <button
                      onClick={() => setDeleteId(u.id)}
                      disabled={u.id === user?.id}
                      aria-label={`غیرفعال‌سازی ${u.fullName}`}
                      className="grid size-10 place-items-center rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-40"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setState((s) => ({
                          ...s,
                          users: s.users.map((x) =>
                            x.id === u.id ? { ...x, isActive: true, isArchived: false } : x,
                          ),
                        }));
                        toast.success("کاربر فعال شد");
                      }}
                      aria-label={`فعال‌سازی ${u.fullName}`}
                      className="grid size-10 place-items-center rounded-lg text-primary hover:bg-accent"
                    >
                      <RotateCcw className="size-5" />
                    </button>
                  )}
                  {u.isArchived ? (
                    <button
                      onClick={() => {
                        setState((s) => ({
                          ...s,
                          users: s.users.map((x) => (x.id === u.id ? { ...x, isArchived: false } : x)),
                        }));
                        log({ entity: "user", recordId: u.id, action: "بازگردانی از آرشیو" });
                        toast.success("کاربر از آرشیو خارج شد");
                      }}
                      aria-label={`بازگردانی ${u.fullName}`}
                      className="grid size-10 place-items-center rounded-lg text-primary hover:bg-accent"
                    >
                      <ArchiveRestore className="size-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setArchiveId(u.id)}
                      disabled={u.id === user?.id}
                      aria-label={`آرشیو ${u.fullName}`}
                      className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-40"
                    >
                      <Archive className="size-5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="safe-bottom max-h-[92vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="text-start">
            <SheetTitle>{editId ? "ویرایش کاربر" : "افزودن کاربر جدید"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="space-y-4 p-4" noValidate>
            <Field
              id="fullName"
              label="نام و نام خانوادگی"
              required
              value={form.fullName}
              onChange={(v) => setForm({ ...form, fullName: v })}
            />
            <Field
              id="username"
              label="نام کاربری"
              required
              value={form.username}
              onChange={(v) => setForm({ ...form, username: v })}
            />
            <Field
              id="phone"
              label="شماره موبایل"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              placeholder="09XXXXXXXXX"
            />
            <Field
              id="title"
              label="سمت"
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
              placeholder="مثلاً مکانیک ارشد"
            />
            <div className="space-y-2">
              <label htmlFor="bio" className="block text-sm font-bold">
                اطلاعاتی راجع به کاربر (اختیاری)
              </label>
              <textarea
                id="bio"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full rounded-xl border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <SelectField
              id="role"
              label="نقش"
              required
              value={form.customRole ? `custom:${form.customRole}` : form.role}
              onChange={pickRole}
              options={roleOptions}
            />
            <Field
              id="password"
              label={editId ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}
              required={!editId}
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder={editId ? "برای تغییر رمز، وارد کنید" : "حداقل ۴ کاراکتر"}
            />

            <div className="rounded-2xl border p-4">
              <p className="text-sm font-extrabold">دسترسی‌های این شخص</p>
              <p className="mt-1 text-xs text-muted-foreground">
                دسترسی‌ها از روی نقش تعیین می‌شوند. هر دسترسی که اینجا تغییر دهید، تا زمانی که خودتان
                آن را عوض کنید برای این شخص فعال می‌ماند.
              </p>
              <ul className="mt-3 space-y-2">
                {PERMISSION_KEYS.map((key) => {
                  const override = form.permissions[key];
                  const allowed =
                    typeof override === "boolean" ? override : CAN[key]?.includes(form.role) ?? false;
                  return (
                    <PermissionToggle
                      key={key}
                      label={PERMISSION_LABEL[key] ?? key}

                      allowed={allowed}
                      onToggle={() =>
                        setForm({ ...form, permissions: { ...form.permissions, [key]: !allowed } })
                      }
                      onReset={
                        typeof override === "boolean"
                          ? () => {
                              const next = { ...form.permissions };
                              delete next[key];
                              setForm({ ...form, permissions: next });
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </ul>
            </div>

            <button
              type="submit"
              className="min-h-13 w-full rounded-xl bg-primary py-3.5 font-extrabold text-primary-foreground"
            >
              ذخیره
            </button>
          </form>
        </SheetContent>
      </Sheet>

      <RolesSheet open={rolesOpen} onOpenChange={setRolesOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>غیرفعال‌سازی کاربر</AlertDialogTitle>
            <AlertDialogDescription>
              کاربر غیرفعال می‌شود و امکان ورود نخواهد داشت. این کار قابل بازگشت است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setState((s) => ({
                  ...s,
                  users: s.users.map((u) => (u.id === deleteId ? { ...u, isActive: false } : u)),
                }));
                if (deleteId) log({ entity: "user", recordId: deleteId, action: "غیرفعال‌سازی کاربر" });
                setDeleteId(null);
                toast.success("کاربر غیرفعال شد");
              }}
            >
              غیرفعال کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!archiveId} onOpenChange={(o) => !o && setArchiveId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>آرشیو کاربر</AlertDialogTitle>
            <AlertDialogDescription>
              کاربر آرشیو می‌شود، از فهرست‌های روزمره حذف می‌شود و امکان ورود ندارد؛ اما سابقهٔ
              وظایف، دستمزدها و ثبت‌های او حفظ می‌شود. هر زمان بخواهید می‌توانید او را بازگردانید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setState((s) => ({
                  ...s,
                  users: s.users.map((u) =>
                    u.id === archiveId ? { ...u, isArchived: true, isActive: false } : u,
                  ),
                }));
                if (archiveId) log({ entity: "user", recordId: archiveId, action: "آرشیو کاربر" });
                setArchiveId(null);
                toast.success("کاربر آرشیو شد");
              }}
            >
              آرشیو کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Definition of the admin's own roles, each with a fixed access map. */
function RolesSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, setState, log } = useStore();
  const customRoles = state.customRoles ?? [];
  const [draft, setDraft] = useState<CustomRole>({
    name: "",
    baseRole: "EMPLOYEE",
    permissions: {},
  });

  function saveRole(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      toast.error("نام نقش را وارد کنید.");
      return;
    }
    setState((s) => {
      const rest = (s.customRoles ?? []).filter((r) => r.name !== name);
      return { ...s, customRoles: [...rest, { ...draft, name }] };
    });
    log({ entity: "user", recordId: name, action: "تعریف یا ویرایش نقش دلخواه", note: name });
    setDraft({ name: "", baseRole: "EMPLOYEE", permissions: {} });
    toast.success("نقش ذخیره شد");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="safe-bottom max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-start">
          <SheetTitle>نقش‌ها و دسترسی‌ها</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <p className="text-xs leading-6 text-muted-foreground">
            نقش‌های پیش‌فرض سامانه: {(Object.keys(ROLE_LABEL) as Role[]).map((r) => ROLE_LABEL[r]).join("، ")}.
            می‌توانید نقش دلخواه خودتان را با دسترسی مشخص بسازید و آن را به هر شخص بدهید؛ آن دسترسی تا
            زمانی که خودتان تغییرش دهید فعال می‌ماند.
          </p>

          {customRoles.length ? (
            <ul className="app-card divide-y">
              {customRoles.map((r) => (
                <li key={r.name} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      پایه: {ROLE_LABEL[r.baseRole]} ·{" "}
                      {Object.values(r.permissions).filter(Boolean).length} دسترسی فعال
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...r, permissions: { ...r.permissions } })}
                    className="rounded-lg px-3 py-2 text-xs font-bold text-primary hover:bg-accent"
                  >
                    ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setState((s) => ({
                        ...s,
                        customRoles: (s.customRoles ?? []).filter((x) => x.name !== r.name),
                      }));
                      toast.success("نقش حذف شد");
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <form onSubmit={saveRole} className="space-y-4 rounded-2xl border p-4" noValidate>
            <p className="text-sm font-extrabold">نقش دلخواه جدید</p>
            <Field
              id="role-name"
              label="نام نقش"
              required
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
              placeholder="مثلاً سرپرست تعمیرگاه"
            />
            <SelectField
              id="role-base"
              label="نقش پایه (برای قوانین امنیتی)"
              required
              value={draft.baseRole}
              onChange={(v) => setDraft({ ...draft, baseRole: v as Role })}
              options={(Object.keys(ROLE_LABEL) as Role[]).map((r) => ({
                value: r,
                label: ROLE_LABEL[r],
              }))}
            />
            <ul className="space-y-2">
              {PERMISSION_KEYS.map((key) => {
                const allowed = draft.permissions[key] ?? CAN[key]?.includes(draft.baseRole) ?? false;
                return (
                  <PermissionToggle
                    key={key}
                    label={PERMISSION_LABEL[key] ?? key}
                    allowed={allowed}
                    onToggle={() =>
                      setDraft({ ...draft, permissions: { ...draft.permissions, [key]: !allowed } })
                    }
                  />
                );
              })}
            </ul>
            <button
              type="submit"
              className="min-h-13 w-full rounded-xl bg-primary py-3.5 font-extrabold text-primary-foreground"
            >
              ذخیره نقش
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
