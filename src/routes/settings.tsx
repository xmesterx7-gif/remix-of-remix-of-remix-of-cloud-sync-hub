import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlarmClock,
  Bell,
  Coins,
  LogOut,
  Moon,
  Palette,
  ShieldCheck,

  Settings as SettingsIcon,
  Sun,
  TableProperties,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { PeopleIntroSection } from "@/components/people/PeopleIntroSection";
import { PermissionsManager } from "@/components/people/PermissionsManager";
import { BannerSettings } from "@/components/settings/BannerSettings";
import { CloudConnectionSettings } from "@/components/settings/CloudConnectionSettings";
import {
  ALARM_EVENT_KEYS,
  ALARM_EVENT_LABEL,
  DEFAULT_ALARM_EVENTS,
  LEVEL_LABEL,
  ROLE_LABEL,
  buildVibratePattern,
  can,
  playAlarmSound,
  useStore,
  type AlarmSettings,
  type NotifyLevel,
  type Role,
} from "@/lib/store";
import { toFa } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "تنظیمات سامانه | مدیریت تعمیرگاه" },
      { name: "description", content: "تنظیم تم روز و شب، بازهٔ آلارم، واحد پول و خروجی حسابداری." },
      { property: "og:title", content: "تنظیمات سامانه تعمیرگاه دوچرخه" },
      { property: "og:description", content: "پیکربندی تم، آلارم‌ها، واحد پول و خروجی حسابداری." },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});

function SettingsPage() {
  const { state, setState, user, logout, setTheme, notify } = useStore();
  const navigate = useNavigate();
  const [push, setPush] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [alarmMsg, setAlarmMsg] = useState({
    userIds: [] as string[],
    title: "",
    body: "",
    urgent: false,
    pulses: 3,
    duration: 500,
  });
  const [mapping, setMapping] = useState({ date: "تاریخ", amount: "مبلغ", ref: "شماره سند" });

  if (!user) return null;

  const isAdmin = can(user, "settings");
  const alarms = state.alarms;
  const updateAlarms = (patch: Partial<AlarmSettings>) =>
    setState((s) => ({ ...s, alarms: { ...s.alarms, ...patch } }));


  return (
    <>
      <PageHeader title="تنظیمات" subtitle={`${user.fullName} · ${ROLE_LABEL[user.role]}`} />

      <section className="app-card mb-4 p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-extrabold">
          <Moon className="size-5 text-primary" /> نمایش و تم
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["light", "حالت روز", Sun],
              ["dark", "حالت شب", Moon],
              ["vivid", "طرح ویژه", Palette],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => {
                setTheme(value);
                toast.success(`${label} فعال شد`);
              }}
              aria-pressed={state.theme === value}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold ${
                state.theme === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <Icon className="size-5" /> {label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          «طرح ویژه» بر اساس الگوی نارنجی ارسالی شما ساخته شده است: کارت‌های سفید، گوشه‌های نرم و
          تأکید نارنجی.
        </p>

      </section>

      {isAdmin ? <BannerSettings /> : null}

      {isAdmin ? <CloudConnectionSettings /> : null}

      {can(user, "users") ? (
        <section className="app-card mb-4 p-4 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 font-extrabold">
            <ShieldCheck className="size-5 text-primary" /> دسترسی کاربران
          </h2>
          <p className="mb-4 text-xs leading-6 text-muted-foreground">
            روی نام هر کاربر بزنید و دسترسی‌هایش را کم یا زیاد کنید؛ تغییرات پس از ذخیره برای همیشه
            پایدار می‌ماند.
          </p>
          <PermissionsManager compact />
        </section>
      ) : null}

      {can(user, "users") ? (
        <section className="mb-4">
          <h2 className="mb-3 flex items-center gap-2 font-extrabold">
            <UserPlus className="size-5 text-primary" /> معرفی اشخاص
          </h2>
          <PeopleIntroSection />
        </section>
      ) : null}

      <section className="app-card mb-4 p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-extrabold">
          <Bell className="size-5 text-primary" /> اعلان‌ها
        </h2>
        <label className="flex items-center justify-between gap-3 py-3">
          <span className="text-sm font-bold">دریافت نوتیفیکیشن مرورگر (Push)</span>
          <Switch
            checked={push}
            onCheckedChange={async (v) => {
              if (v && typeof Notification !== "undefined") {
                const perm = await Notification.requestPermission();
                if (perm !== "granted") {
                  toast.error("اجازه نوتیفیکیشن داده نشد؛ فقط اعلان داخل برنامه فعال است.");
                  return;
                }
              }
              setPush(v);
              toast.success(v ? "نوتیفیکیشن مرورگر فعال شد" : "نوتیفیکیشن مرورگر غیرفعال شد");
            }}
          />
        </label>
        <label className="flex items-center justify-between gap-3 border-t py-3">
          <span className="text-sm font-bold">اعلان رویدادهای مهم داخل برنامه</span>
          <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
        </label>
      </section>

      {isAdmin ? (
        <section className="app-card mb-4 p-4 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 font-extrabold">
            <AlarmClock className="size-5 text-primary" /> بازهٔ آلارم کاربران
          </h2>
          <p className="mb-4 text-xs leading-6 text-muted-foreground">
            اعلان‌های ثبت‌شده خارج از این بازه جمع می‌شوند و در ابتدای بازه یکجا با صدا و ویبره برای
            کاربران هدف ارسال می‌شوند. اعلان‌های فوری بلافاصله ارسال می‌شوند.
          </p>
          <label className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm font-bold">فعال بودن بازهٔ آلارم</span>
            <Switch
              checked={alarms.enabled}
              onCheckedChange={(v) => updateAlarms({ enabled: v })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 border-t py-3">
            <div className="space-y-2">
              <label htmlFor="alarm-start" className="block text-sm font-bold">
                از ساعت
              </label>
              <select
                id="alarm-start"
                value={alarms.startHour}
                onChange={(e) => updateAlarms({ startHour: Number(e.target.value) })}
                className="h-12 w-full rounded-xl border bg-card px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {toFa(String(h).padStart(2, "0"))}:۰۰
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="alarm-end" className="block text-sm font-bold">
                تا ساعت
              </label>
              <select
                id="alarm-end"
                value={alarms.endHour}
                onChange={(e) => updateAlarms({ endHour: Number(e.target.value) })}
                className="h-12 w-full rounded-xl border bg-card px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {toFa(String(h).padStart(2, "0"))}:۰۰
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="border-t py-3">
            <span className="mb-2 block text-sm font-bold">نقش‌های مشمول بازهٔ آلارم</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => {
                const active = alarms.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      updateAlarms({
                        roles: active ? alarms.roles.filter((x) => x !== r) : [...alarms.roles, r],
                      })
                    }
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 border-t py-3">
            <span className="text-sm font-bold">ویبره هنگام دریافت آلارم</span>
            <Switch checked={alarms.vibrate} onCheckedChange={(v) => updateAlarms({ vibrate: v })} />
          </label>
          <div className="grid grid-cols-2 gap-3 border-t py-3">
            <div className="space-y-2">
              <label htmlFor="alarm-pulses" className="block text-sm font-bold">
                تعداد ویبره هر آلارم
              </label>
              <select
                id="alarm-pulses"
                value={alarms.vibratePulses}
                onChange={(e) => updateAlarms({ vibratePulses: Number(e.target.value) })}
                className="h-12 w-full rounded-xl border bg-card px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {toFa(n)} بار
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="alarm-duration" className="block text-sm font-bold">
                شدت / طول هر ویبره
              </label>
              <select
                id="alarm-duration"
                value={alarms.vibrateDuration}
                onChange={(e) => updateAlarms({ vibrateDuration: Number(e.target.value) })}
                className="h-12 w-full rounded-xl border bg-card px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={250}>سبک</option>
                <option value={500}>متوسط</option>
                <option value={900}>سنگین</option>
                <option value={1500}>خیلی سنگین</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const pattern = buildVibratePattern(alarms.vibratePulses, alarms.vibrateDuration);
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate?.(pattern);
                toast.success("ویبره آزمایشی اجرا شد");
              } else {
                toast.error("این دستگاه از ویبره پشتیبانی نمی‌کند.");
              }
            }}
            className="mb-1 h-12 w-full rounded-xl bg-secondary text-sm font-bold"
          >
            تست ویبره
          </button>
          <label className="flex items-center justify-between gap-3 border-t py-3">
            <span className="text-sm font-bold">صدای آلارم</span>
            <Switch checked={alarms.sound} onCheckedChange={(v) => updateAlarms({ sound: v })} />
          </label>
          <button
            type="button"
            onClick={() => {
              if (playAlarmSound("IMPORTANT")) toast.success("صدای آزمایشی پخش شد");
              else toast.error("پخش صدا ممکن نشد؛ یک‌بار روی صفحه ضربه بزنید و دوباره امتحان کنید.");
            }}
            className="h-12 w-full rounded-xl bg-secondary text-sm font-bold"
          >
            تست صدا
          </button>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="app-card mb-4 p-4 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 font-extrabold">
            <Bell className="size-5 text-primary" /> قوانین اعلان برای هر رویداد
          </h2>
          <p className="mb-4 text-xs leading-6 text-muted-foreground">
            برای هر رویداد مشخص کنید اعلان فعال باشد، با چه درجهٔ اهمیتی ارسال شود و صدا یا ویبره
            داشته باشد. اعلان‌های «فوری» بدون توجه به بازهٔ زمانی بلافاصله ارسال می‌شوند.
          </p>
          <div className="space-y-3">
            {ALARM_EVENT_KEYS.map((key) => {
              const cfg = alarms.events?.[key] ?? DEFAULT_ALARM_EVENTS[key];
              const patch = (p: Partial<typeof cfg>) =>
                updateAlarms({
                  events: { ...DEFAULT_ALARM_EVENTS, ...alarms.events, [key]: { ...cfg, ...p } },
                });
              return (
                <div key={key} className="rounded-xl border p-3">
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">{ALARM_EVENT_LABEL[key]}</span>
                    <Switch checked={cfg.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
                  </label>
                  {cfg.enabled ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(["NORMAL", "IMPORTANT", "URGENT"] as NotifyLevel[]).map((lv) => (
                          <button
                            key={lv}
                            type="button"
                            aria-pressed={cfg.level === lv}
                            onClick={() => patch({ level: lv })}
                            className={`h-9 rounded-lg px-3 text-xs font-bold ${
                              cfg.level === lv
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-foreground"
                            }`}
                          >
                            {LEVEL_LABEL[lv]}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold">
                          <Switch checked={cfg.sound} onCheckedChange={(v) => patch({ sound: v })} />
                          صدا
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold">
                          <Switch
                            checked={cfg.vibrate}
                            onCheckedChange={(v) => patch({ vibrate: v })}
                          />
                          ویبره
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="app-card mb-4 p-4 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 font-extrabold">
            <AlarmClock className="size-5 text-primary" /> ارسال آلارم دستی
          </h2>
          <p className="mb-4 text-xs leading-6 text-muted-foreground">
            یک پیام با ویبره‌ی دلخواه برای کاربران انتخاب‌شده بفرستید. آلارم فوری بلافاصله و آلارم
            عادی در ابتدای بازهٔ مجاز ارسال می‌شود.
          </p>

          <span className="mb-2 block text-sm font-bold">گیرندگان</span>
          <div className="mb-3 flex flex-wrap gap-2">
            {state.users
              .filter((u) => u.isActive && u.id !== user.id)
              .map((u) => {
                const active = alarmMsg.userIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setAlarmMsg((m) => ({
                        ...m,
                        userIds: active
                          ? m.userIds.filter((x) => x !== u.id)
                          : [...m.userIds, u.id],
                      }))
                    }
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {u.fullName}
                  </button>
                );
              })}
          </div>
          {state.users.filter((u) => u.isActive && u.id !== user.id).length === 0 ? (
            <p className="mb-3 text-xs font-bold text-muted-foreground">
              هنوز کاربری ساخته نشده است.
            </p>
          ) : null}

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="alarm-title" className="block text-sm font-bold">
                عنوان آلارم
              </label>
              <input
                id="alarm-title"
                value={alarmMsg.title}
                onChange={(e) => setAlarmMsg((m) => ({ ...m, title: e.target.value }))}
                className="h-12 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="alarm-body" className="block text-sm font-bold">
                متن پیام
              </label>
              <textarea
                id="alarm-body"
                rows={3}
                value={alarmMsg.body}
                onChange={(e) => setAlarmMsg((m) => ({ ...m, body: e.target.value }))}
                className="w-full rounded-xl border bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="msg-pulses" className="block text-sm font-bold">
                  تعداد ویبره
                </label>
                <select
                  id="msg-pulses"
                  value={alarmMsg.pulses}
                  onChange={(e) => setAlarmMsg((m) => ({ ...m, pulses: Number(e.target.value) }))}
                  className="h-12 w-full rounded-xl border bg-card px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {toFa(n)} بار
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="msg-duration" className="block text-sm font-bold">
                  شدت ویبره
                </label>
                <select
                  id="msg-duration"
                  value={alarmMsg.duration}
                  onChange={(e) => setAlarmMsg((m) => ({ ...m, duration: Number(e.target.value) }))}
                  className="h-12 w-full rounded-xl border bg-card px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={250}>سبک</option>
                  <option value={500}>متوسط</option>
                  <option value={900}>سنگین</option>
                  <option value={1500}>خیلی سنگین</option>
                </select>
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm font-bold">ارسال فوری (بدون رعایت بازهٔ آلارم)</span>
              <Switch
                checked={alarmMsg.urgent}
                onCheckedChange={(v) => setAlarmMsg((m) => ({ ...m, urgent: v }))}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                if (!alarmMsg.userIds.length) {
                  toast.error("حداقل یک گیرنده انتخاب کنید.");
                  return;
                }
                if (!alarmMsg.title.trim() || !alarmMsg.body.trim()) {
                  toast.error("عنوان و متن پیام را وارد کنید.");
                  return;
                }
                notify({
                  userRole: [],
                  userIds: alarmMsg.userIds,
                  title: alarmMsg.title.trim(),
                  body: alarmMsg.body.trim(),
                  url: "/notifications",
                  type: "task",
                  priority: alarmMsg.urgent ? "URGENT" : "NORMAL",
                  vibratePattern: buildVibratePattern(alarmMsg.pulses, alarmMsg.duration),
                });
                setAlarmMsg((m) => ({ ...m, title: "", body: "", userIds: [] }));
                toast.success("آلارم ثبت شد");
              }}
              className="h-14 w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground"
            >
              ارسال آلارم
            </button>
          </div>
        </section>
      ) : null}

      {isAdmin ? (
        <>
          <section className="app-card mb-4 p-4 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-extrabold">
              <Coins className="size-5 text-primary" /> واحد پول
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(["TOMAN", "RIAL"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setState((s) => ({ ...s, currency: c }));
                    toast.success(`واحد پول به ${c === "TOMAN" ? "تومان" : "ریال"} تغییر کرد`);
                  }}
                  aria-pressed={state.currency === c}
                  className={`min-h-12 rounded-xl font-bold ${
                    state.currency === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {c === "TOMAN" ? "تومان" : "ریال"}
                </button>
              ))}
            </div>
          </section>

          <section className="app-card mb-4 p-4 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-extrabold">
              <TableProperties className="size-5 text-primary" /> نگاشت ستون‌های خروجی حسابداری
            </h2>
            <div className="space-y-3">
              {(
                [
                  ["date", "نام ستون تاریخ"],
                  ["amount", "نام ستون مبلغ"],
                  ["ref", "نام ستون شماره سند"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <label htmlFor={key} className="block text-sm font-bold">
                    {label}
                  </label>
                  <input
                    id={key}
                    value={mapping[key]}
                    onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                    className="h-12 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              <button
                onClick={() => toast.success("نگاشت ستون‌ها ذخیره شد")}
                className="min-h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground"
              >
                ذخیره نگاشت
              </button>
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          icon={<SettingsIcon className="size-6" />}
          title="تنظیمات سیستمی محدود است"
          description="تنظیمات واحد پول و حسابداری فقط برای مدیر اصلی در دسترس است."
        />
      )}

      <button
        onClick={() => {
          logout();
          void navigate({ to: "/" });
        }}
        className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 font-bold text-destructive"
      >
        <LogOut className="size-5" /> خروج از حساب
      </button>
    </>
  );
}
