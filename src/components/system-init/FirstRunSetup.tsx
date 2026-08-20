import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Database, Loader2, Settings, Shield, User } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { OwnerSetupForm } from "@/components/system-init/OwnerSetupForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSystemInit } from "@/lib/system-init";




const steps = [
  {
    icon: User,
    label: "ایجاد حساب صاحب سیستم (OWNER)",
    description: "تنها کاربر اصلی با دسترسی مدیریت کامل سامانه",
  },
  {
    icon: Shield,
    label: "تعریف نقش‌ها و دسترسی‌ها",
    description: "مشخص کردن سطح دسترسی هر نقش در سیستم",
  },
  {
    icon: Database,
    label: "پیکربندی پایگاه داده",
    description: "آماده‌سازی جداول و تنظیمات اولیه",
  },
  {
    icon: Settings,
    label: "شروع به کار برنامه",
    description: "ورود به سامانه و استفاده از امکانات",
  },
];

/**
 * First-run setup screen shown when the system is NOT_INITIALIZED.
 *
 * OWNER creation is available ONLY here. There is no public registration
 * path: the login screen has no sign-up entry and this screen unmounts /
 * falls back to the intro step as soon as the system is initialized.
 *
 * This screen creates the OWNER auth account, profile, and first organization
 * record. It does not create membership, roles, or permissions yet.
 */
export function FirstRunSetup() {
  const { needsInitialization, runCheck } = useSystemInit();
  const navigate = useNavigate();
  const [step, setStep] = useState<"intro" | "owner" | "owner-created">("intro");
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // Never keep the OWNER step open outside the NOT_INITIALIZED state.
  useEffect(() => {
    if (!needsInitialization) setStep("intro");
  }, [needsInitialization]);

  /**
   * Setup is done: the temporary sign-up session is closed so the OWNER
   * signs in through the normal login page with username + password.
   */
  const goToLogin = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await supabase.auth.signOut();
      await navigate({ to: "/" });
      await runCheck();
    } finally {
      setFinishing(false);
    }
  };

  if (!needsInitialization) return null;




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

      <Card className="app-card relative w-full max-w-lg shadow-2xl">
        <CardHeader className="items-center gap-4 text-center">
          <Logo className="size-20 rounded-2xl shadow-[var(--shadow-glow)] ring-1 ring-on-hero/25" />
          <div>
            <CardTitle className="font-display text-3xl">دز رکاب</CardTitle>
            <CardDescription className="mt-1 text-base">
              {step === "intro" ? "راه‌اندازی اولیه سامانه" : "مرحله ۱: حساب صاحب سیستم"}
            </CardDescription>
          </div>
        </CardHeader>

        {step === "owner" ? (
          <OwnerSetupForm
            onBack={() => setStep("intro")}
            onOwnerCreated={(userId) => {
              setOwnerUserId(userId);
              setStep("owner-created");
            }}
          />
        ) : step === "owner-created" ? (
          <>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <CheckCircle2 className="size-8 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  حساب صاحب سیستم با موفقیت ساخته شد.
                </p>
                <p className="text-xs text-muted-foreground">
                  راه‌اندازی سامانه کامل شد. اکنون با نام کاربری و گذرواژه خود
                  وارد شوید.
                </p>
                {ownerUserId ? (
                  <p className="font-mono text-[11px] break-all text-muted-foreground" dir="ltr">
                    {ownerUserId}
                  </p>
                ) : null}
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button
                className="w-full"
                size="lg"
                disabled={finishing}
                onClick={() => void goToLogin()}
              >
                {finishing ? <Loader2 className="size-5 animate-spin" /> : null}
                رفتن به صفحه ورود
              </Button>
                <p className="text-xs text-muted-foreground">
                  ثبت‌نام عمومی وجود ندارد؛ کاربران بعدی توسط صاحب سیستم ساخته می‌شوند.
                </p>

            </CardFooter>
          </>
        ) : (
          <>
            <CardContent className="space-y-6">
              <div className="rounded-xl bg-primary-soft/50 p-4 text-center">
                <p className="text-sm font-semibold text-foreground">
                  سیستم هنوز راه‌اندازی نشده است.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  مراحل زیر باید تکمیل شوند تا سامانه قابل استفاده باشد.
                </p>
              </div>

              <ol className="space-y-3">
                {steps.map((step, index) => (
                  <li
                    key={step.label}
                    className="flex items-start gap-3 rounded-xl border bg-card/50 p-3"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <step.icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>

            <CardFooter className="flex-col gap-3">
              <Button className="w-full" size="lg" onClick={() => setStep("owner")}>
                شروع راه‌اندازی
              </Button>
              <p className="text-xs text-muted-foreground">
                در این مرحله هیچ داده‌ای ذخیره نمی‌شود.
              </p>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );

}
