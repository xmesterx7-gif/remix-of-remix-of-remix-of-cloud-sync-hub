import { useEffect, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useSystemInit } from "@/lib/system-init";

import { FirstRunSetup } from "./FirstRunSetup";

/**
 * Renders the application only when the system is INITIALIZED.
 *
 * - CHECKING_INITIALIZATION: full-screen loading state
 * - NOT_INITIALIZED: first-run setup screen
 * - INITIALIZATION_FAILED: error state with retry
 * - INITIALIZED: children (the existing app)
 */
export function SystemInitGate({ children }: { children: ReactNode }) {
  const { status, error, runCheck } = useSystemInit();

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  if (status === "CHECKING_INITIALIZATION") {
    return (
      <div className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <Logo className="size-16 animate-pulse rounded-2xl" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          در حال بررسی وضعیت سامانه…
        </div>
      </div>
    );
  }

  if (status === "NOT_INITIALIZED") {
    return <FirstRunSetup />;
  }

  if (status === "INITIALIZATION_FAILED") {
    return (
      <div className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-8" />
        </div>
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl">خطا در بررسی سامانه</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "امکان بررسی وضعیت راه‌اندازی سامانه وجود ندارد."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void runCheck()}>تلاش دوباره</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            بارگذاری مجدد
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
