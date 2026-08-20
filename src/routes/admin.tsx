import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Archive,
  BarChart3,
  Bell,
  ClipboardList,
  History,
  MessageCircle,
  Settings,
  ShieldCheck,
  Users,
  UserPlus,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, PageHeader, StatCard } from "@/components/ui-kit";
import { ENTITY_LABEL, can, roleTitle, useStore } from "@/lib/store";
import { toFa, faDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "پنل پشتیبان | مدیریت تعمیرگاه دوچرخه" },
      {
        name: "description",
        content:
          "مرکز مدیریت کاربران، نقش‌ها، دسترسی‌ها، وظایف، دستمزدها، آلارم‌ها، گروه‌های گفتگو و تاریخچه فعالیت‌ها.",
      },
      { property: "og:title", content: "پنل پشتیبان تعمیرگاه دوچرخه" },
      {
        property: "og:description",
        content: "کنترل کامل کاربران، دسترسی‌ها، دستمزدها و گزارش‌های تعمیرگاه در یک صفحه.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <AdminPage />
    </AppShell>
  ),
});

const SECTIONS: {
  to: string;
  key: string;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    to: "/users",
    key: "users",
    label: "کاربران، نقش‌ها و دسترسی‌ها",
    description: "افزودن، ویرایش، غیرفعال‌سازی و آرشیو افراد؛ تعریف نقش دلخواه",
    icon: ShieldCheck,
  },
  {
    to: "/people",
    key: "users",
    label: "معرفی اشخاص",
    description: "ساخت نام کاربری و رمز عبور، ثبت سمت، شماره تماس، توضیحات و سطح کاربر",
    icon: UserPlus,
  },
  {
    to: "/permissions",
    key: "users",
    label: "تغییر دسترسی کاربران",
    description: "دیدن و تغییر دسترسی هر شخص؛ هر دسترسی تا تغییر بعدی پشتیبان پایدار می‌ماند",
    icon: ShieldCheck,
  },
  {
    to: "/tasks",
    key: "tasks",
    label: "وظایف کارمندان",
    description: "ساخت، ویرایش، آرشیو و پیگیری وضعیت وظایف",
    icon: ClipboardList,
  },
  {
    to: "/earnings",
    key: "earnings",
    label: "دستمزد، پاداش و جریمه",
    description: "تأیید یا رد دستمزد، ثبت پاداش و جریمه و خالص دریافتی هر کارمند",
    icon: Wallet,
  },
  {
    to: "/notifications",
    key: "notifications",
    label: "آلارم‌ها و اعلان‌ها",
    description: "ارسال اعلان و پیگیری آلارم‌های تحویل‌شده",
    icon: Bell,
  },
  {
    to: "/messages",
    key: "messages",
    label: "گروه‌های گفتگو",
    description: "گروه‌های تیمی و گفتگوی خصوصی با پرسنل",
    icon: MessageCircle,
  },
  {
    to: "/reports",
    key: "reports",
    label: "گزارش‌ها و تاریخچه فعالیت",
    description: "تحلیل عملکرد و سابقهٔ همهٔ تغییرات",
    icon: BarChart3,
  },
  {
    to: "/audit",
    key: "users",
    label: "تاریخچه و بازگردانی",
    description: "سابقهٔ تغییرناپذیر تغییرات، بازیابی بایگانی و بازگردانی وضعیت به مرحلهٔ قبل",
    icon: History,
  },
  {
    to: "/settings",
    key: "settings",
    label: "تنظیمات عمومی",
    description: "واحد پول، بازهٔ آلارم، پوستهٔ برنامه و پشتیبان‌گیری",
    icon: Settings,
  },
];

function AdminPage() {
  const { state, user } = useStore();

  const stats = useMemo(() => {
    const active = state.users.filter((u) => u.isActive && !u.isArchived);
    const archived = state.users.filter((u) => u.isArchived);
    const pendingWages = state.tasks.filter((t) => t.status === "SUBMITTED").length;
    const openTasks = state.tasks.filter(
      (t) => t.status === "PENDING" || t.status === "IN_PROGRESS",
    ).length;
    return { active, archived, pendingWages, openTasks };
  }, [state.users, state.tasks]);

  const recent = useMemo(
    () => [...(state.activity ?? [])].slice(-8).reverse(),
    [state.activity],
  );

  if (!can(user, "users"))
    return (
      <EmptyState
        icon={<ShieldCheck className="size-6" />}
        title="دسترسی ندارید"
        description="پنل پشتیبان فقط برای پشتیبان و افراد دارای دسترسی مدیریت کاربران باز است."
      />
    );

  const sections = SECTIONS.filter((s) => can(user, s.key));

  return (
    <>
      <PageHeader title="پنل پشتیبان" subtitle="مدیریت کامل تیم، دسترسی‌ها و عملکرد تعمیرگاه" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Users className="size-5" />}
          label="پرسنل فعال"
          value={toFa(stats.active.length)}
          tone="success"
          to="/users"
        />
        <StatCard
          icon={<Archive className="size-5" />}
          label="آرشیو شده"
          value={toFa(stats.archived.length)}
          tone="info"
          to="/users"
        />
        <StatCard
          icon={<ClipboardList className="size-5" />}
          label="وظایف در جریان"
          value={toFa(stats.openTasks)}
          tone="warning"
          to="/tasks"
        />
        <StatCard
          icon={<Wallet className="size-5" />}
          label="دستمزد در انتظار تأیید"
          value={toFa(stats.pendingWages)}
          tone="danger"
          to="/earnings"
        />
      </div>

      <h2 className="mt-6 mb-3 text-base font-extrabold">بخش‌های مدیریتی</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.to}>
            <Link to={s.to} className="app-card flex items-center gap-3 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <s.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{s.label}</span>
                <span className="block text-xs leading-5 text-muted-foreground">{s.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-6 mb-3 text-base font-extrabold">پرسنل و نقش‌ها</h2>
      <ul className="app-card divide-y">
        {stats.active.map((u) => (
          <li key={u.id} className="flex items-center gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-extrabold">{u.fullName}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {u.title || u.username}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
              {roleTitle(u)}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-6 mb-3 text-base font-extrabold">آخرین فعالیت‌ها</h2>
      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز فعالیتی ثبت نشده است.</p>
      ) : (
        <ul className="app-card divide-y">
          {recent.map((a) => (
            <li key={a.id} className="p-4">
              <p className="text-sm font-bold">
                {ENTITY_LABEL[a.entity]} — {a.action}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {state.users.find((u) => u.id === a.userId)?.fullName ?? "کاربر حذف‌شده"} ·{" "}
                {faDateTime(a.createdAt)}
              </p>
              {a.note ? <p className="mt-1 text-xs text-muted-foreground">{a.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
