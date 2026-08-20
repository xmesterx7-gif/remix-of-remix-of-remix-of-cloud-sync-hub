import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  Radio,
  ShieldCheck,
  WifiOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatJalaliDateTime } from "@/lib/datetime";
import { useStore } from "@/lib/store";

type Health = "unknown" | "checking" | "ok" | "failed";

const HEALTH_LABEL: Record<Health, string> = {
  unknown: "بررسی نشده",
  checking: "در حال بررسی…",
  ok: "سالم",
  failed: "خطا",
};

function HealthPill({ state }: { state: Health }) {
  const tone =
    state === "ok"
      ? "bg-primary/10 text-primary"
      : state === "failed"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  const Icon = state === "ok" ? CheckCircle2 : state === "failed" ? XCircle : Loader2;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${tone}`}
    >
      <Icon className={`size-4 ${state === "checking" ? "animate-spin" : ""}`} />
      {HEALTH_LABEL[state]}
    </span>
  );
}

function HealthRow({
  icon: Icon,
  title,
  hint,
  state,
}: {
  icon: typeof Database;
  title: string;
  hint: string;
  state: Health;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-primary">
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{title}</div>
          <div className="truncate text-[11px] text-muted-foreground">{hint}</div>
        </div>
      </div>
      <HealthPill state={state} />
    </div>
  );
}

/**
 * OWNER-only «اتصال ابری و همگام‌سازی» panel.
 *
 * The connected Lovable Cloud project is used by default. The owner can review
 * or override the backend URL and publishable key; both are stored in
 * `app_settings` and are only accepted after a *real* connection test
 * (database read + auth health + realtime handshake). Service role keys and
 * database passwords are never read, stored, or displayed here.
 *
 * Live sync itself keeps using the existing realtime layer (`subscribeAll` via
 * the store): reconnect, deduplication and resync behaviour is untouched — the
 * buttons below only trigger that same machinery, with no reload and no polling.
 */
export function CloudConnectionSettings() {
  const { syncStatus, resync } = useStore();

  const defaults = {
    url: (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? "",
    key: (import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string | undefined) ?? "",
  };

  const [isOwner, setIsOwner] = useState(false);
  const [url, setUrl] = useState(defaults.url);
  const [key, setKey] = useState(defaults.key);
  const [showKey, setShowKey] = useState(false);
  const [db, setDb] = useState<Health>("unknown");
  const [auth, setAuth] = useState<Health>("unknown");
  const [realtime, setRealtime] = useState<Health>("unknown");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) return;
      const { data: owner } = await supabase.rpc("is_org_owner", { _user_id: session.user.id });
      setIsOwner(owner === true);

      const { data: settings } = await supabase
        .from("app_settings")
        .select("backend_url, backend_publishable_key, backend_checked_at")
        .maybeSingle();
      if (settings?.backend_url) setUrl(settings.backend_url);
      if (settings?.backend_publishable_key) setKey(settings.backend_publishable_key);
      setLastSync(settings?.backend_checked_at ?? null);
    })();
  }, []);

  /** Overall banner state: connection health + live sync state of the app. */
  const overall = useMemo(() => {
    if (error) {
      return { label: "خطا در اتصال", tone: "bg-destructive/10 text-destructive", Icon: AlertTriangle, spin: false };
    }
    if (busy) {
      return { label: "در حال اتصال…", tone: "bg-muted text-muted-foreground", Icon: Loader2, spin: true };
    }
    if (syncStatus === "live") {
      return { label: "متصل و همگام", tone: "bg-primary/10 text-primary", Icon: CheckCircle2, spin: false };
    }
    if (syncStatus === "connecting") {
      return { label: "در حال اتصال…", tone: "bg-muted text-muted-foreground", Icon: Loader2, spin: true };
    }
    if (syncStatus === "reconnecting") {
      return { label: "در حال اتصال مجدد…", tone: "bg-amber-500/10 text-amber-600", Icon: RefreshCw, spin: true };
    }
    return { label: "آفلاین", tone: "bg-muted text-muted-foreground", Icon: WifiOff, spin: false };
  }, [busy, error, syncStatus]);

  /** Real connection test: database read + auth health + realtime handshake. */
  const test = useCallback(async (testUrl: string, testKey: string) => {
    setError(null);
    setDb("checking");
    setAuth("checking");
    setRealtime("checking");

    const client = createClient(testUrl, testKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (headers.get("Authorization") === `Bearer ${testKey}`) headers.delete("Authorization");
          headers.set("apikey", testKey);
          return fetch(input, { ...init, headers });
        },
      },
    });

    let dbOk = false;
    try {
      const { error: dbError } = await client
        .from("system_initialization")
        .select("is_initialized")
        .maybeSingle();
      dbOk = !dbError || dbError.code === "PGRST116";
    } catch {
      dbOk = false;
    }
    setDb(dbOk ? "ok" : "failed");

    let authOk = false;
    try {
      const res = await fetch(`${testUrl.replace(/\/+$/, "")}/auth/v1/health`, {
        headers: { apikey: testKey },
      });
      authOk = res.ok;
    } catch {
      authOk = false;
    }
    setAuth(authOk ? "ok" : "failed");

    const realtimeOk = await new Promise<boolean>((resolve) => {
      const channel = client.channel(`connection-test-${Date.now()}`);
      const timer = setTimeout(() => {
        void client.removeChannel(channel);
        resolve(false);
      }, 8000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          void client.removeChannel(channel);
          resolve(status === "SUBSCRIBED");
        }
      });
    });
    setRealtime(realtimeOk ? "ok" : "failed");

    const ok = dbOk && authOk && realtimeOk;
    if (!ok) {
      const failed = [!dbOk && "پایگاه داده", !authOk && "احراز هویت", !realtimeOk && "همگام‌سازی آنی"]
        .filter(Boolean)
        .join("، ");
      setError(`اتصال ناموفق: ${failed}`);
    }
    return ok;
  }, []);

  function validate() {
    const nextUrl = url.trim().replace(/\/+$/, "");
    const nextKey = key.trim();
    if (!/^https?:\/\/.+/.test(nextUrl) || !nextKey) {
      setError("نشانی بک‌اند و کلید عمومی را کامل وارد کنید.");
      toast.error("نشانی بک‌اند و کلید عمومی را کامل وارد کنید.");
      return null;
    }
    return { nextUrl, nextKey };
  }

  async function saveAndConnect() {
    if (busy) return;
    const values = validate();
    if (!values) return;
    setBusy(true);
    try {
      const ok = await test(values.nextUrl, values.nextKey);
      if (!ok) {
        toast.error("اتصال برقرار نشد؛ نشانی یا کلید عمومی درست نیست.");
        return;
      }
      const checkedAt = new Date().toISOString();
      const { error: saveError } = await supabase
        .from("app_settings")
        .update({
          backend_url: values.nextUrl,
          backend_publishable_key: values.nextKey,
          backend_checked_at: checkedAt,
        })
        .eq("id", true);
      if (saveError) {
        setError(`ذخیرهٔ تنظیمات انجام نشد: ${saveError.message}`);
        toast.error(`ذخیرهٔ تنظیمات انجام نشد: ${saveError.message}`);
        return;
      }
      setUrl(values.nextUrl);
      setLastSync(checkedAt);
      // Use the existing realtime layer: pull fresh shared data right away.
      resync();
      toast.success("اتصال با موفقیت برقرار و برای همهٔ کاربران ذخیره شد.");
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    if (busy) return;
    const values = validate();
    if (!values) return;
    setBusy(true);
    try {
      const ok = await test(values.nextUrl, values.nextKey);
      if (ok) {
        const checkedAt = new Date().toISOString();
        await supabase.from("app_settings").update({ backend_checked_at: checkedAt }).eq("id", true);
        setLastSync(checkedAt);
        toast.success("اتصال سالم است.");
      } else {
        toast.error("اتصال برقرار نیست.");
      }
    } finally {
      setBusy(false);
    }
  }

  /**
   * Reconnect through the existing sync layer: the shared socket already
   * rebuilds itself (with backoff, dedup and a full resync) when the app comes
   * back online, so we simply re-trigger that path — no reload, no polling.
   */
  function reconnect() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("online"));
    resync();
    setError(null);
    toast.success("درخواست اتصال مجدد ارسال شد.");
  }

  function resyncNow() {
    resync();
    setLastSync(new Date().toISOString());
    toast.success("همگام‌سازی مجدد انجام شد.");
  }

  if (!isOwner) return null;

  return (
    <section className="app-card mb-4 p-4 sm:p-6" dir="rtl">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-extrabold">
          <Cloud className="size-5 text-primary" /> اتصال ابری و همگام‌سازی
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${overall.tone}`}
        >
          <overall.Icon className={`size-4 ${overall.spin ? "animate-spin" : ""}`} />
          {overall.label}
        </span>
      </div>
      <p className="mb-4 text-xs leading-6 text-muted-foreground">
        این بخش فقط برای پشتیبان (مالک سامانه) در دسترس است. با ثبت نشانی بک‌اند و کلید عمومی،
        برنامه از همان اتصال برای همهٔ کاربران استفاده می‌کند و همگام‌سازی کاربران و دستگاه‌ها
        به‌صورت آنی و بدون بارگذاری مجدد انجام می‌شود. کلید سرویس، رمز پایگاه داده و هر اطلاعات
        محرمانهٔ دیگر هرگز در این صفحه نگهداری یا نمایش داده نمی‌شود.
      </p>

      <div className="grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold">نشانی بک‌اند (Supabase URL)</span>
          <Input
            dir="ltr"
            inputMode="url"
            autoComplete="off"
            placeholder="https://xxxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold">کلید عمومی (Publishable / Anon Key)</span>
          <div className="relative">
            <Input
              dir="ltr"
              autoComplete="off"
              type={showKey ? "text" : "password"}
              placeholder="sb_publishable_… یا anon key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="pl-10"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? "پنهان کردن کلید" : "نمایش کلید"}
              className="absolute inset-y-0 left-0 grid w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground">
            فقط کلید عمومی را وارد کنید؛ کلید سرویس (Service Role) را هرگز اینجا قرار ندهید.
          </span>
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button onClick={saveAndConnect} disabled={busy} className="w-full font-bold">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
          ذخیره و اتصال
        </Button>
        <Button
          variant="outline"
          onClick={runTest}
          disabled={busy}
          className="w-full font-bold"
        >
          <ShieldCheck className="size-4" />
          تست اتصال
        </Button>
      </div>

      {error ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-bold leading-6 text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2">
        <HealthRow
          icon={Database}
          title="پایگاه داده"
          hint="خواندن داده‌های مشترک"
          state={db}
        />
        <HealthRow icon={KeyRound} title="احراز هویت" hint="ورود و نشست کاربران" state={auth} />
        <HealthRow
          icon={Radio}
          title="همگام‌سازی آنی (Realtime)"
          hint={
            syncStatus === "live"
              ? "کانال زندهٔ برنامه فعال است"
              : syncStatus === "reconnecting"
                ? "در حال اتصال مجدد کانال زنده"
                : syncStatus === "offline"
                  ? "کانال زنده آفلاین است"
                  : "در حال برقراری کانال زنده"
          }
          state={realtime}
        />
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-primary">
              <RefreshCw className="size-4.5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">آخرین همگام‌سازی موفق</div>
              <div className="truncate text-[11px] text-muted-foreground">
                بدون بارگذاری مجدد و بدون فراخوانی دوره‌ای
              </div>
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
            {lastSync ? formatJalaliDateTime(lastSync) : "—"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={reconnect} disabled={busy} className="w-full font-bold">
          <PlugZap className="size-4" />
          اتصال مجدد
        </Button>
        <Button variant="outline" onClick={resyncNow} disabled={busy} className="w-full font-bold">
          <RefreshCw className="size-4" />
          همگام‌سازی مجدد
        </Button>
      </div>
    </section>
  );
}
