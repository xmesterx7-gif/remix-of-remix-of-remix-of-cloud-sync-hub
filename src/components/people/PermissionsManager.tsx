import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save, ShieldCheck } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { useNow } from "@/hooks/use-now";
import { faFullMoment } from "@/lib/format";
import {
  CAN,
  PERMISSION_GROUPS,
  PERMISSION_LABEL,
  can,
  roleTitle,
  useStore,
  type User,
} from "@/lib/store";

function Toggle({
  label,
  allowed,
  isOverride,
  onToggle,
  onReset,
}: {
  label: string;
  allowed: boolean;
  isOverride: boolean;
  onToggle: () => void;
  onReset: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0 text-sm font-bold">
        {label}
        {isOverride ? (
          <span className="ms-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
            تعیین‌شده توسط پشتیبان
          </span>
        ) : null}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {isOverride ? (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-bold text-muted-foreground underline"
          >
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

export function PermissionsManager({ compact = false }: { compact?: boolean }) {
  const { state, setState, user, log } = useStore();
  const now = useNow(1000);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean>>({});

  const people = useMemo(
    () => state.users.filter((u) => !u.isArchived).sort((a, b) => a.fullName.localeCompare(b.fullName, "fa")),
    [state.users],
  );

  if (!can(user, "users"))
    return (
      <EmptyState
        icon={<ShieldCheck className="size-6" />}
        title="دسترسی ندارید"
        description="بخش تغییر دسترسی کاربران فقط برای پشتیبان باز است."
      />
    );

  const selected = people.find((u) => u.id === selectedId) ?? null;

  function select(u: User) {
    setSelectedId(u.id);
    setDraft({ ...(u.permissions ?? {}) });
  }

  function roleDefault(u: User, key: string) {
    return CAN[key]?.includes(u.role) ?? false;
  }

  function save() {
    if (!selected) return;
    const changed = Object.keys({ ...(selected.permissions ?? {}), ...draft }).filter(
      (k) => (selected.permissions ?? {})[k] !== draft[k],
    );
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === selected.id ? { ...u, permissions: { ...draft } } : u)),
    }));
    log({
      entity: "user",
      recordId: selected.id,
      action: "تغییر دسترسی‌ها توسط پشتیبان",
      note: `${selected.fullName} — ${
        changed.length
          ? changed.map((k) => `${PERMISSION_LABEL[k] ?? k}: ${draft[k] ? "فعال" : "غیرفعال"}`).join("، ")
          : "بدون تغییر"
      }`,
    });
    toast.success("دسترسی‌ها ذخیره شد و تا تغییر بعدی پشتیبان پایدار می‌ماند.");
  }

  return (
    <>
      {compact ? null : (
        <PageHeader
          title="تغییر دسترسی کاربران"
          subtitle="پشتیبان بالاترین دسترسی را دارد و می‌تواند دسترسی هر شخص را فعال یا غیرفعال کند"
        />
      )}

      <p className="mb-4 text-xs font-bold text-muted-foreground">اکنون: {faFullMoment(now)}</p>

      <h2 className="mb-2 text-base font-extrabold">
        {compact ? "روی هر کاربر بزنید تا دسترسی‌هایش را تغییر دهید" : "انتخاب شخص"}
      </h2>

      <ul className="app-card mb-5 divide-y">
        {people.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => select(u)}
              className={`flex w-full items-center gap-3 p-4 text-start ${
                selectedId === u.id ? "bg-accent/60" : ""
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{u.fullName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {u.title || u.username}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                {roleTitle(u)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {!selected ? (
        <p className="text-sm text-muted-foreground">برای دیدن و تغییر دسترسی‌ها یک شخص را انتخاب کنید.</p>
      ) : selected.role === "ADMIN" ? (
        <div className="app-card p-4 text-sm font-bold">
          {selected.fullName} پشتیبان است و همیشه بالاترین دسترسی را دارد؛ دسترسی‌های پشتیبان قابل محدودسازی
          نیست.
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-extrabold">دسترسی‌های {selected.fullName}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraft({})}
                className="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold"
              >
                <RotateCcw className="size-4" /> بازگشت به پیش‌فرض نقش
              </button>
              <button
                type="button"
                onClick={save}
                className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                <Save className="size-4" /> ذخیره
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {PERMISSION_GROUPS.map((group) => (
              <section key={group.title} className="app-card p-4">
                <h3 className="mb-1 font-extrabold">{group.title}</h3>
                <ul className="divide-y">
                  {group.keys.map((key) => {
                    const override = draft[key];
                    const allowed =
                      typeof override === "boolean" ? override : roleDefault(selected, key);
                    return (
                      <Toggle
                        key={key}
                        label={PERMISSION_LABEL[key] ?? key}
                        allowed={allowed}
                        isOverride={typeof override === "boolean"}
                        onToggle={() => setDraft({ ...draft, [key]: !allowed })}
                        onReset={() => {
                          const next = { ...draft };
                          delete next[key];
                          setDraft(next);
                        }}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
