import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, LogIn, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import loginBanner from "@/assets/login-banner.jpg";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ورود | سامانه مدیریت فروشگاه و تعمیرگاه دوچرخه" },
      {
        name: "description",
        content: "ورود کارکنان به سامانه مدیریت فروشگاه و تعمیرگاه دوچرخه با نام کاربری و رمز عبور.",
      },
      { property: "og:title", content: "ورود به سامانه مدیریت تعمیرگاه دوچرخه" },
      {
        property: "og:description",
        content: "مدیریت هوشمند فروشگاه و تعمیرگاه دوچرخه، فارسی و موبایل‌فرست.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user, state } = useStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: user.role === "MECHANIC" ? "/tasks" : "/dashboard" });
  }, [user, navigate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) return setError("نام کاربری یا شماره موبایل را وارد کنید.");
    if (password.length < 4) return setError("رمز عبور باید حداقل ۴ کاراکتر باشد.");
    setLoading(true);
    void login(username, password).then((ok) => {
      setLoading(false);
      if (!ok) setError("نام کاربری یا رمز عبور اشتباه است.");
      else toast.success("خوش آمدید!");
    });
  }

  return (
    <div className="safe-top safe-bottom relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-primary opacity-25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-primary opacity-20 blur-3xl"
      />
      <div className="app-card relative w-full max-w-md overflow-hidden shadow-2xl">
        <div className="relative aspect-[2/1] w-full">
          <img
            src={state.banners?.login || loginBanner}
            alt="دوچرخهٔ حرفه‌ای در تعمیرگاه با نور نارنجی"
            width={1536}
            height={768}
            className="absolute inset-0 size-full object-cover"
          />
          <div aria-hidden className="hero-veil" />
          <div className="relative flex h-full flex-col items-center justify-end gap-1.5 p-5 text-center">
            <Logo className="size-16 rounded-2xl shadow-[var(--shadow-glow)] ring-1 ring-on-hero/25" />
            <h1 className="font-display text-3xl leading-tight tracking-tight text-on-hero drop-shadow">
              دز رکاب
            </h1>
            <span className="rounded-full bg-on-hero/10 px-3 py-1 text-[11px] font-bold text-on-hero-muted ring-1 ring-on-hero/25 backdrop-blur">
              شهر دوچرخه دز رکاب
            </span>
          </div>
        </div>
        <div className="p-6 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-display text-2xl leading-9">خوش آمدید به اپلیکیشن دز رکاب</h2>
          <p className="text-sm text-muted-foreground">مدیریت هوشمند فروشگاه و تعمیرگاه</p>
        </div>




        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-bold">
              نام کاربری یا شماره موبایل
            </label>
            <div className="flex items-center gap-2 rounded-xl border bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
              <User className="size-5 shrink-0 text-muted-foreground" />
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="نام کاربری"
                autoComplete="username"
                className="h-12 w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-bold">
                رمز عبور
              </label>
              <button type="button" className="text-sm font-bold text-primary">
                فراموشی رمز عبور؟
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
              <Lock className="size-5 shrink-0 text-muted-foreground" />
              <input
                id="password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-12 w-full bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
              >
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          <label className="flex items-center justify-end gap-2 text-sm font-medium">
            مرا به خاطر بسپار
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-5 accent-[var(--primary)]"
            />
          </label>

          {error ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="grad-primary flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-extrabold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.99] disabled:opacity-60"

          >
            <LogIn className="size-5" />
            {loading ? "در حال ورود..." : "ورود به حساب"}
          </button>
        </form>




        <p className="mt-6 text-center text-sm text-muted-foreground">
          نیاز به راهنمایی دارید؟ <span className="font-bold text-primary">تماس با پشتیبانی</span>
        </p>
        </div>
      </div>
    </div>

  );
}
