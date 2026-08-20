import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  Pencil,
  Power,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { Field, SelectField, TextArea } from "@/components/forms/fields";
import { Chip, EmptyState, FilterChips } from "@/components/ui-kit";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useOrganizations } from "@/lib/people-orgs";
import {
  POSITIONS,
  ROLE_LABEL,
  can,
  roleTitle,
  uid,
  useStore,
  type Role,
  type User,
} from "@/lib/store";

type Filter = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ACTIVE", label: "فعال" },
  { value: "INACTIVE", label: "غیرفعال" },
  { value: "ARCHIVED", label: "آرشیو" },
  { value: "ALL", label: "همه" },
];

const NEW_POST = "__new__";

const EMPTY_FORM = {
  fullName: "",
  username: "",
  password: "",
  role: "EMPLOYEE" as Role,
  customRole: "",
  newPostName: "",
  bio: "",
  status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "ARCHIVED",
  organizationId: "",
};

export function PeopleManager() {
  const { state, setState, user, log } = useStore();
  const { orgs, membership, assign } = useOrganizations();
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const customRoles = state.customRoles ?? [];

  const postOptions = useMemo(
    () => [
      ...POSITIONS.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
      ...customRoles.map((r) => ({ value: `custom:${r.name}`, label: `${r.name} (سفارشی)` })),
      { value: NEW_POST, label: "ساخت پست سفارشی جدید…" },
    ],
    [customRoles],
  );

  const people = useMemo(
    () =>
      state.users
        .filter((u) =>
          filter === "ALL"
            ? true
            : filter === "ARCHIVED"
              ? u.isArchived
              : filter === "INACTIVE"
                ? !u.isArchived && !u.isActive
                : !u.isArchived && u.isActive,
        )
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "fa")),
    [state.users, filter],
  );

  if (!can(user, "users"))
    return (
      <EmptyState
        icon={<Users className="size-6" />}
        title="دسترسی ندارید"
        description="مدیریت اشخاص فقط برای پشتیبان (OWNER) در دسترس است."
      />
    );

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, organizationId: orgs[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(u: User) {
    setEditId(u.id);
    setForm({
      fullName: u.fullName,
      username: u.username,
      password: "",
      role: u.role,
      customRole: u.customRole ?? "",
      newPostName: "",
      bio: u.bio ?? "",
      status: u.isArchived ? "ARCHIVED" : u.isActive ? "ACTIVE" : "INACTIVE",
      organizationId: membership[u.id] ?? orgs[0]?.id ?? "",
    });
    setOpen(true);
  }

  function pickPost(value: string) {
    if (value === NEW_POST) {
      setForm((f) => ({ ...f, customRole: NEW_POST }));
      return;
    }
    if (!value.startsWith("custom:")) {
      setForm((f) => ({ ...f, role: value as Role, customRole: "", newPostName: "" }));
      return;
    }
    const name = value.slice(7);
    const role = customRoles.find((r) => r.name === name);
    if (!role) return;
    setForm((f) => ({ ...f, role: role.baseRole, customRole: role.name, newPostName: "" }));
  }

  /** Persists the person; manual permissions are never overwritten by the post. */
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const username = form.username.trim().toLowerCase();
    const fullName = form.fullName.trim();
    const password = form.password.trim();
    const creatingPost = form.customRole === NEW_POST;
    const postName = creatingPost ? form.newPostName.trim() : form.customRole;

    if (!fullName) return void toast.error("نام کامل اجباری است.");
    if (!username) return void toast.error("نام کاربری اجباری است.");
    if (state.users.some((u) => u.username.trim().toLowerCase() === username && u.id !== editId))
      return void toast.error("این نام کاربری قبلاً استفاده شده است.");
    if (!editId && password.length < 4)
      return void toast.error("رمز عبور باید حداقل ۴ کاراکتر باشد.");
    if (editId && password && password.length < 4)
      return void toast.error("رمز عبور جدید باید حداقل ۴ کاراکتر باشد.");
    if (creatingPost && !postName) return void toast.error("نام پست سفارشی را وارد کنید.");

    const existing = editId ? state.users.find((u) => u.id === editId) : undefined;
    // A custom post only adds its access map on top of the manual permissions.
    const postPermissions = postName
      ? (customRoles.find((r) => r.name === postName)?.permissions ?? {})
      : {};
    const permissions = { ...postPermissions, ...(existing?.permissions ?? {}) };

    const id = editId ?? uid("u");
    const person: User = {
      ...(existing ?? ({} as User)),
      id,
      fullName,
      username,
      phone: existing?.phone ?? "",
      title: postName || ROLE_LABEL[form.role],
      bio: form.bio.trim(),
      role: form.role,
      ...(postName ? { customRole: postName } : { customRole: "" }),
      isActive: form.status === "ACTIVE",
      isArchived: form.status === "ARCHIVED",
      isWorker: form.role === "MECHANIC",
      permissions,
      // Sent once to the protected server function, never kept in the store.
      ...(password ? { password } : {}),
    };

    setState((s) => ({
      ...s,
      customRoles:
        creatingPost && !customRoles.some((r) => r.name === postName)
          ? [...customRoles, { name: postName, baseRole: form.role, permissions: {} }]
          : customRoles,
      users: editId ? s.users.map((u) => (u.id === editId ? person : u)) : [...s.users, person],
    }));

    log({
      entity: "user",
      recordId: id,
      action: editId ? "ویرایش شخص" : "معرفی شخص جدید و ساخت حساب کاربری",
      note: `${fullName} — ${postName || ROLE_LABEL[form.role]}`,
    });

    if (editId && form.organizationId) {
      void assign(id, form.organizationId).then((err) => {
        if (err) toast.error(`ثبت سازمان انجام نشد: ${err}`);
      });
    }

    setOpen(false);
    setForm(EMPTY_FORM);
    toast.success(
      editId
        ? "اطلاعات شخص به‌روزرسانی شد."
        : "شخص ساخته شد؛ می‌تواند با همین نام کاربری و رمز عبور وارد شود.",
    );
  }

  function patch(u: User, changes: Partial<User>, action: string) {
    setState((s) => ({
      ...s,
      users: s.users.map((x) => (x.id === u.id ? { ...x, ...changes } : x)),
    }));
    log({ entity: "user", recordId: u.id, action, note: u.fullName });
  }

  const postValue = form.customRole
    ? form.customRole === NEW_POST
      ? NEW_POST
      : `custom:${form.customRole}`
    : form.role;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openNew}
          className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
        >
          <UserPlus className="size-4" /> افزودن شخص
        </button>
        <Link
          to="/permissions"
          className="flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold"
        >
          <ShieldCheck className="size-4" /> مدیریت دسترسی‌ها
        </Link>
      </div>

      <FilterChips value={filter} onChange={setFilter} options={FILTERS} />

      {people.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="شخصی در این وضعیت نیست"
          description="با دکمهٔ «افزودن شخص» یک حساب کاربری جدید بسازید."
        />
      ) : (
        <ul className="mt-4 grid gap-3">
          {people.map((u) => (
            <li key={u.id} className="app-card p-4">
              <div className="flex items-start gap-2">
                <Link
                  to="/people/$id"
                  params={{ id: u.id }}
                  className="min-w-0 flex-1"
                  aria-label={`جزئیات ${u.fullName}`}
                >
                  <p className="flex items-center gap-1 truncate font-extrabold">
                    {u.fullName}
                    <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.username} — {u.title || roleTitle(u)}
                  </p>
                </Link>
                <Chip tone={u.isArchived ? "neutral" : u.isActive ? "success" : "warning"}>
                  {u.isArchived ? "آرشیو" : u.isActive ? "فعال" : "غیرفعال"}
                </Chip>
              </div>

              {u.bio ? <p className="mt-2 text-xs text-muted-foreground">{u.bio}</p> : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(u)}
                  className="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold"
                >
                  <Pencil className="size-4" /> ویرایش
                </button>
                {!u.isArchived ? (
                  <button
                    type="button"
                    onClick={() =>
                      patch(
                        u,
                        { isActive: !u.isActive },
                        u.isActive ? "غیرفعال‌سازی شخص" : "فعال‌سازی شخص",
                      )
                    }
                    className="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold"
                  >
                    <Power className="size-4" /> {u.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    patch(
                      u,
                      u.isArchived
                        ? { isArchived: false, isActive: true }
                        : { isArchived: true, isActive: false },
                      u.isArchived ? "بازگردانی شخص از آرشیو" : "آرشیو شخص",
                    )
                  }
                  className="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold"
                >
                  {u.isArchived ? (
                    <>
                      <ArchiveRestore className="size-4" /> بازگردانی
                    </>
                  ) : (
                    <>
                      <Archive className="size-4" /> آرشیو
                    </>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editId ? "ویرایش شخص" : "افزودن شخص"}</SheetTitle>
          </SheetHeader>

          <form onSubmit={submit} className="grid gap-4 p-4">
            <Field
              id="pm-fullname"
              label="نام کامل"
              required
              value={form.fullName}
              onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
            />
            <Field
              id="pm-username"
              label="نام کاربری"
              required
              value={form.username}
              onChange={(v) => setForm((f) => ({ ...f, username: v }))}
              placeholder="مثال: reza"
            />
            <Field
              id="pm-password"
              label={editId ? "رمز عبور جدید (اختیاری)" : "رمز عبور"}
              required={!editId}
              type="password"
              value={form.password}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
              placeholder="حداقل ۴ کاراکتر"
            />
            <SelectField
              id="pm-post"
              label="پست"
              required
              value={postValue}
              onChange={pickPost}
              options={postOptions}
            />
            {form.customRole === NEW_POST ? (
              <>
                <Field
                  id="pm-newpost"
                  label="نام پست سفارشی"
                  required
                  value={form.newPostName}
                  onChange={(v) => setForm((f) => ({ ...f, newPostName: v }))}
                  placeholder="مثال: سرپرست انبار"
                />
                <SelectField
                  id="pm-basepost"
                  label="پست پایه برای دسترسی‌ها"
                  value={form.role}
                  onChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
                  options={POSITIONS.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                />
              </>
            ) : null}
            <TextArea
              id="pm-bio"
              label="توضیحات"
              value={form.bio}
              onChange={(v) => setForm((f) => ({ ...f, bio: v }))}
              placeholder="توضیح دلخواه دربارهٔ این شخص"
            />
            <SelectField
              id="pm-status"
              label="وضعیت"
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v as typeof f.status }))}
              options={[
                { value: "ACTIVE", label: "فعال" },
                { value: "INACTIVE", label: "غیرفعال" },
                { value: "ARCHIVED", label: "آرشیو" },
              ]}
            />
            <SelectField
              id="pm-org"
              label="سازمان"
              value={form.organizationId}
              onChange={(v) => setForm((f) => ({ ...f, organizationId: v }))}
              options={
                orgs.length
                  ? orgs.map((o) => ({ value: o.id, label: o.name }))
                  : [{ value: "", label: "سازمانی ثبت نشده است" }]
              }
            />

            <p className="rounded-xl bg-accent p-3 text-xs font-bold text-accent-foreground">
              رمز عبور فقط برای ساخت حساب ورود به سرور فرستاده می‌شود و در برنامه ذخیره نمی‌ماند.
              دسترسی‌های دستی را از بخش «دسترسی‌ها» اضافه کنید؛ آن‌ها به پست اضافه می‌شوند.
            </p>

            <button
              type="submit"
              className="h-12 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
            >
              {editId ? "ذخیره تغییرات" : "ثبت و ساخت حساب"}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
