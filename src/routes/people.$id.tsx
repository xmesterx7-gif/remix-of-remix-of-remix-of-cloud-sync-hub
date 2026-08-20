import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ShieldCheck, Users } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, PageHeader } from "@/components/ui-kit";
import {
  CAN,
  PERMISSION_GROUPS,
  PERMISSION_LABEL,
  ROLE_LABEL,
  can,
  roleTitle,
  useStore,
} from "@/lib/store";

export const Route = createFileRoute("/people/$id")({
  head: () => ({
    meta: [
      { title: "پروندهٔ شخص | معرفی اشخاص" },
      {
        name: "description",
        content: "نمایش پست پایه، وضعیت، سازمان و تمام دسترسی‌های نهایی یک شخص در سامانه.",
      },
      { property: "og:title", content: "پروندهٔ شخص و دسترسی‌های نهایی" },
      {
        property: "og:description",
        content: "پست پایه به‌همراه دسترسی‌های دستی افزوده‌شده، در یک نگاه.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PersonPage,
});

function PersonPage() {
  const { id } = useParams({ from: "/people/$id" });
  const { state, user } = useStore();
  const person = state.users.find((u) => u.id === id) ?? null;

  if (!can(user, "users"))
    return (
      <AppShell>
        <EmptyState
          icon={<Users className="size-6" />}
          title="دسترسی ندارید"
          description="پروندهٔ اشخاص فقط برای پشتیبان (OWNER) در دسترس است."
        />
      </AppShell>
    );

  if (!person)
    return (
      <AppShell>
        <EmptyState
          icon={<Users className="size-6" />}
          title="شخص پیدا نشد"
          description="این شخص حذف شده یا هنوز همگام‌سازی نشده است."
        />
      </AppShell>
    );

  const isAdmin = person.role === "ADMIN";

  return (
    <AppShell>
      <PageHeader title={person.fullName} subtitle={`${person.username} — ${roleTitle(person)}`} />

      <section className="app-card grid gap-2 p-4 text-sm">
        <Row label="پست پایه" value={ROLE_LABEL[person.role]} />
        {person.customRole ? <Row label="پست سفارشی" value={person.customRole} /> : null}
        <Row label="عنوان شغلی" value={person.title || "—"} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">وضعیت</span>
          <Chip tone={person.isArchived ? "neutral" : person.isActive ? "success" : "warning"}>
            {person.isArchived ? "آرشیو" : person.isActive ? "فعال" : "غیرفعال"}
          </Chip>
        </div>
        {person.bio ? <Row label="توضیحات" value={person.bio} /> : null}
      </section>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold">دسترسی‌های نهایی</h2>
        <Link
          to="/permissions"
          className="flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold"
        >
          <ShieldCheck className="size-4" /> تغییر دسترسی‌ها
        </Link>
      </div>

      {isAdmin ? (
        <p className="app-card mt-3 p-4 text-sm font-bold">
          این شخص پشتیبان است و همیشه بالاترین سطح دسترسی را دارد.
        </p>
      ) : null}

      <div className="mt-3 space-y-4">
        {PERMISSION_GROUPS.map((group) => (
          <section key={group.title} className="app-card p-4">
            <h3 className="mb-1 font-extrabold">{group.title}</h3>
            <ul className="divide-y">
              {group.keys.map((key) => {
                const manual = person.permissions?.[key];
                const fromPost = (CAN[key] ?? []).includes(person.role);
                const allowed = can(person, key);
                return (
                  <li key={key} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 text-sm font-bold">
                      {PERMISSION_LABEL[key] ?? key}
                      <span className="ms-2 text-[10px] font-bold text-muted-foreground">
                        {typeof manual === "boolean"
                          ? "دستی (افزوده به پست)"
                          : fromPost
                            ? "از پست"
                            : "بدون دسترسی پست"}
                      </span>
                    </span>
                    <Chip tone={allowed ? "success" : "neutral"}>
                      {allowed ? "فعال" : "غیرفعال"}
                    </Chip>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-end font-bold">{value}</span>
    </div>
  );
}
