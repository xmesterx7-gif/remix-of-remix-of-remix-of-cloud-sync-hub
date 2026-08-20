import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Banknote,
  Bell,
  CheckCheck,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShoppingCart,
  WifiOff,
  Wrench,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { isForUser, useStore, type AppNotification, type User } from "@/lib/store";
import { relativeTime, toFa } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof ShoppingCart> = {
  purchase: ShoppingCart,
  invoice: ShoppingCart,
  expense: Banknote,
  task: Wrench,
  accounting: CheckCheck,
  message: MessageCircle,
};

/**
 * Header notification centre: unread badge, live panel and read tracking.
 * Only notifications the signed-in person is allowed to see are listed, and
 * queued alarms stay hidden until their delivery window opens.
 */
export function NotificationBell({ user }: { user: User }) {
  const { state, setState, loading, syncStatus, resync } = useStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Ticking clock: a queued alarm shows up the moment its window opens,
  // without waiting for the next unrelated re-render.
  const now = useNow(15_000);
  const visible = useMemo(() => {
    const seen = new Set<string>();
    return state.notifications.filter((n) => {
      if (seen.has(n.id)) return false; // never list the same alarm twice
      if (!isForUser(n, user)) return false;
      if (new Date(n.deliverAt).getTime() > now.getTime()) return false;
      seen.add(n.id);
      return true;
    });
  }, [state.notifications, user, now]);
  const unread = visible.filter((n) => !n.isRead).length;
  const recent = visible.slice(0, 12);

  const offline = syncStatus === "offline";
  const reconnecting = syncStatus === "reconnecting";

  function markOne(id: string) {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    }));
  }

  function markAll() {
    if (!unread) return;
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        isForUser(n, user) && !n.isRead ? { ...n, isRead: true } : n,
      ),
    }));
  }

  function openItem(n: AppNotification) {
    if (!n.isRead) markOne(n.id);
    setOpen(false);
    if (n.url) void navigate({ to: n.url }).catch(() => navigate({ to: "/notifications" }));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `اعلان‌ها، ${unread} خوانده‌نشده` : "اعلان‌ها"}
          className="relative grid size-11 min-h-11 place-items-center rounded-full border border-on-hero/25 bg-on-hero/10 backdrop-blur transition-colors hover:bg-on-hero/20"
        >
          <Bell className="size-5 text-on-hero" />
          {unread > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-extrabold leading-5 text-destructive-foreground">
              {toFa(unread > 99 ? 99 : unread)}
            </span>
          ) : null}
          {offline || reconnecting ? (
            <span className="absolute -bottom-0.5 -start-0.5 grid size-4 place-items-center rounded-full bg-card text-muted-foreground">
              {reconnecting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <WifiOff className="size-3" />
              )}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={10}
        dir="rtl"
        className="safe-bottom w-[min(22rem,calc(100vw-1.5rem))] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-extrabold">اعلان‌ها</h2>
          {unread > 0 ? (
            <button
              onClick={markAll}
              className="flex min-h-9 items-center gap-1 rounded-full bg-accent px-3 text-xs font-bold text-accent-foreground"
            >
              <CheckCheck className="size-4" /> خواندن همه
            </button>
          ) : null}
        </div>

        {offline || reconnecting ? (
          <div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-4 py-2 text-xs font-bold text-muted-foreground">
            <span>{reconnecting ? "در حال اتصال دوباره…" : "اتصال برقرار نیست"}</span>
            <button
              onClick={resync}
              className="flex min-h-8 items-center gap-1 rounded-full bg-secondary px-3 text-xs font-bold"
            >
              <RefreshCw className="size-3.5" /> تلاش دوباره
            </button>
          </div>
        ) : null}

        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
          {loading ? (
            <ul className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </li>
              ))}
            </ul>
          ) : recent.length === 0 ? (
            <div className="grid place-items-center gap-2 px-6 py-10 text-center">
              <Bell className="size-6 text-muted-foreground" />
              <p className="text-sm font-bold">اعلانی وجود ندارد</p>
              <p className="text-xs leading-6 text-muted-foreground">
                رویدادهای مرتبط با نقش شما اینجا نمایش داده می‌شود.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => openItem(n)}
                      className={cn(
                        "flex w-full min-h-16 items-start gap-3 p-4 text-start transition-colors hover:bg-accent/60",
                        !n.isRead && "bg-primary-soft/40",
                      )}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold">{n.title}</span>
                          {!n.isRead ? (
                            <span className="size-2 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </span>
                        <span className="mt-1 block break-words text-xs leading-6 text-muted-foreground line-clamp-3">
                          {n.body}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {relativeTime(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          onClick={() => {
            setOpen(false);
            void navigate({ to: "/notifications" });
          }}
          className="w-full border-t px-4 py-3 text-center text-sm font-bold text-primary"
        >
          مشاهده همه اعلان‌ها
        </button>
      </PopoverContent>
    </Popover>
  );
}
