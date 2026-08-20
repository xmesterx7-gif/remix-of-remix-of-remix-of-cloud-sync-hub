import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Plus, LogOut, Loader2 } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Logo } from "@/components/brand/Logo";
import { can, isForUser, ROLE_LABEL, useStore, type Role } from "@/lib/store";
import { cn } from "@/lib/utils";
import loginBanner from "@/assets/login-banner.jpg";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import icHome from "@/assets/icons/home.png";
import icPurchases from "@/assets/icons/purchases.png";
import icInventory from "@/assets/icons/inventory.png";
import icExpenses from "@/assets/icons/expenses.png";
import icTasks from "@/assets/icons/tasks.png";
import icMessages from "@/assets/icons/messages.png";
import icNotifications from "@/assets/icons/notifications.png";
import icInvoices from "@/assets/icons/invoices.png";
import icReports from "@/assets/icons/reports.png";
import icEarnings from "@/assets/icons/earnings.png";
import icExports from "@/assets/icons/exports.png";
import icShield from "@/assets/icons/shield.png";
import icUsers from "@/assets/icons/users.png";
import icSettings from "@/assets/icons/settings.png";

type NavItem = { to: string; label: string; img: string; key: string };

function NavIcon({ src, className }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      width={24}
      height={24}
      className={cn("size-6 shrink-0 object-contain", className)}
    />
  );
}

const ALL_NAV: NavItem[] = [
  { to: "/dashboard", label: "خانه", img: icHome, key: "dashboard" },
  { to: "/bicycle-purchases", label: "خریدها", img: icPurchases, key: "purchases" },
  { to: "/inventory", label: "دوچرخه‌ها", img: icInventory, key: "inventory" },
  { to: "/expenses", label: "هزینه‌ها", img: icExpenses, key: "expenses" },
  { to: "/tasks", label: "وظایف", img: icTasks, key: "tasks" },
  { to: "/messages", label: "پیام‌ها", img: icMessages, key: "messages" },
];

const DESKTOP_EXTRA: NavItem[] = [
  { to: "/notifications", label: "اعلان‌ها", img: icNotifications, key: "notifications" },
  { to: "/purchase-invoices", label: "فاکتورهای خرید", img: icInvoices, key: "invoices" },
  { to: "/reports", label: "گزارش و تحلیل", img: icReports, key: "reports" },
  { to: "/daily-reports", label: "گزارش روزانه کارکنان", img: icReports, key: "reports" },
  { to: "/earnings", label: "دستمزد و پاداش", img: icEarnings, key: "earnings" },
  { to: "/exports", label: "خروجی حسابداری", img: icExports, key: "exports" },
  { to: "/admin", label: "پنل پشتیبان", img: icShield, key: "users" },
  { to: "/users", label: "مدیریت کاربران", img: icUsers, key: "users" },
  { to: "/permissions", label: "تغییر دسترسی کاربران", img: icShield, key: "users" },
  { to: "/account", label: "تنظیمات کاربری", img: icSettings, key: "account" },
  { to: "/settings", label: "تنظیمات", img: icSettings, key: "settings" },
];


function navFor(user: { role: Role; permissions?: Record<string, boolean> }): NavItem[] {
  if (user.role === "MECHANIC")
    return [
      { to: "/tasks", label: "وظایف من", img: icTasks, key: "tasks" },
      { to: "/earnings", label: "دستمزد من", img: icEarnings, key: "earnings" },
      { to: "/messages", label: "پیام‌ها", img: icMessages, key: "messages" },
    ].filter((n) => can(user as never, n.key));
  return ALL_NAV.filter((n) => can(user as never, n.key));
}



export function AppShell({ children }: { children: ReactNode }) {
  const { user, state, logout, loading } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [fabOpen, setFabOpen] = useState(false);
  const [expenseMenu, setExpenseMenu] = useState(false);

  // The signed-in person only becomes known once the first cloud load lands;
  // until then this is a loading screen, never a "please sign in" screen.
  if (!user && loading) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm font-bold">در حال بارگذاری اطلاعات…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="space-y-4">
          <p className="text-muted-foreground">برای ادامه ابتدا وارد حساب خود شوید.</p>
          <Link
            to="/"
            className="inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground"
          >
            ورود به حساب
          </Link>
        </div>
      </div>
    );
  }



  const mobileNav = navFor(user);
  const sideNav = [
    ...navFor(user),
    ...DESKTOP_EXTRA.filter((n) => n.key === "account" || can(user, n.key)),
  ].filter((item, i, list) => list.findIndex((x) => x.to === item.to) === i);

  const unread = state.notifications.filter(
    (n) => !n.isRead && isForUser(n, user),
  ).length;

  const showFab = user.role !== "MECHANIC";

  const fabActions: { label: string; onClick: () => void }[] = [];
  if (user.role !== "MECHANIC")
    fabActions.push({ label: "ثبت خرید دوچرخه", onClick: () => go("/bicycle-purchases/new") });
  if (can(user, "invoices"))
    fabActions.push({ label: "ثبت پیش‌فاکتور خرید", onClick: () => go("/purchase-invoices/new") });
  if (can(user, "approve"))
    fabActions.push({ label: "ثبت وظیفه جدید", onClick: () => go("/tasks?new=1") });

  function go(to: string) {
    setFabOpen(false);
    setExpenseMenu(false);
    void navigate({ to });
  }

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="no-print safe-top sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto border-l bg-sidebar p-4 lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-2 py-3">
          <Logo className="size-10 shadow-[var(--shadow-glow)]" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg text-primary">مدیریت هوشمند</span>
            <span className="text-[11px] font-bold text-muted-foreground">شهر دوچرخه دز رکاب</span>
          </span>
        </div>

        <nav className="mt-4 flex-1 space-y-1">
          {sideNav.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <NavIcon src={item.img} className={active ? "brightness-0 invert" : ""} />
                <span className="truncate">{item.label}</span>
                {item.key === "notifications" && unread > 0 ? (
                  <span className="ms-auto rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">
                    {unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => {
            logout();
            void navigate({ to: "/" });
          }}
          className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-5" /> خروج از حساب
        </button>
      </aside>

      <div className="flex min-h-dvh w-full min-w-0 flex-col">
        {/* Header */}
        <header className="no-print safe-top safe-x sticky top-0 z-30 overflow-hidden border-b shadow-[var(--shadow-hero)]">
          <img src={state.banners?.app || state.banners?.login || loginBanner} alt="" aria-hidden className="hero-media" />
          <div className="hero-veil" />
          <div className="relative mx-auto grid w-full max-w-5xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:gap-3">
            <NotificationBell user={user} />

            <div className="flex min-w-0 flex-col items-center justify-center text-center">
              <span className="flex max-w-full items-center gap-2 truncate font-display text-base tracking-tight text-on-hero sm:text-lg">
                <Logo className="size-7 rounded-lg lg:hidden" />
                مدیریت هوشمند
              </span>
              <span className="truncate text-[11px] font-bold text-on-hero-muted">
                شهر دوچرخه دز رکاب
              </span>
            </div>

            <Link to="/account" aria-label="تنظیمات کاربری" className="shrink-0">
              <Avatar className="size-10 border-2 border-on-hero/50 backdrop-blur">
                <AvatarFallback className="bg-on-hero/15 text-sm font-bold text-on-hero">
                  {user.fullName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>


        <main className="safe-x mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 pb-32 pt-4 sm:pt-5 lg:pb-12">{children}</main>

        {/* FAB */}
        {showFab ? (
          <button
            onClick={() => setFabOpen(true)}
            aria-label="ثبت مورد جدید"
            className="no-print fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] start-4 z-40 grid size-14 place-items-center sm:size-16 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-float)] transition-transform active:scale-95 lg:bottom-8"
          >
            <Plus className="size-8" />
          </button>
        ) : null}

        <Sheet
          open={fabOpen}
          onOpenChange={(o) => {
            setFabOpen(o);
            if (!o) setExpenseMenu(false);
          }}
        >
          <SheetContent side="bottom" className="safe-bottom rounded-t-3xl">
            <SheetHeader className="text-start">
              <SheetTitle>{expenseMenu ? "دسته هزینه را انتخاب کنید" : "ثبت مورد جدید"}</SheetTitle>
            </SheetHeader>
            <div className="space-y-2 p-4">
              {expenseMenu ? (
                <>
                  {[
                    ["MISCELLANEOUS", "هزینه"],
                    ["SALARY", "حقوق"],
                    ["BONUS", "پاداش"],
                    ["PENALTY", "جریمه"],
                    ...(can(user, "personalWithdrawal")
                      ? [["PERSONAL_WITHDRAWAL", "برداشت شخصی"]]
                      : []),
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => go(`/expenses/new?category=${value}`)}
                      className="w-full rounded-xl bg-secondary px-4 py-4 text-start text-sm font-bold hover:bg-accent"
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => setExpenseMenu(false)}
                    className="w-full rounded-xl px-4 py-3 text-sm font-bold text-muted-foreground"
                  >
                    بازگشت
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setExpenseMenu(true)}
                    className="w-full rounded-xl bg-primary px-4 py-4 text-start text-sm font-bold text-primary-foreground"
                  >
                    ثبت هزینه
                  </button>
                  {fabActions.map((a) => (
                    <button
                      key={a.label}
                      onClick={a.onClick}
                      className="w-full rounded-xl bg-secondary px-4 py-4 text-start text-sm font-bold hover:bg-accent"
                    >
                      {a.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Bottom nav (mobile) */}
        <nav className="no-print safe-bottom safe-x fixed inset-x-0 bottom-0 z-30 border-t bg-card lg:hidden">
          <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 sm:px-2">
            {mobileNav.map((item) => {
              const active = path === item.to || path.startsWith(item.to + "/");
              return (
                <li key={item.to} className="flex-1">
                  <Link
                    to={item.to}
                    className={cn(
                      "flex min-h-16 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[10px] font-bold leading-tight sm:px-1 sm:text-[11px]",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <span className="relative">
                      <NavIcon src={item.img} className={active ? "" : "opacity-60 grayscale"} />
                      {item.key === "notifications" && unread > 0 ? (
                        <span className="absolute -end-1 -top-1 size-2 rounded-full bg-destructive" />
                      ) : null}
                    </span>
                    <span className="w-full truncate text-center">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
      {ROLE_LABEL[role]}
    </span>
  );
}
