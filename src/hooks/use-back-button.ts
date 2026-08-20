import { useEffect, useRef } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

/** Pages that behave as the app "home": pressing back there asks to exit. */
const HOME_PATHS = ["/", "/dashboard", "/tasks"];

function isHome(pathname: string) {
  return HOME_PATHS.includes(pathname.replace(/\/+$/, "") || "/");
}

/**
 * Makes the Android hardware back button behave like the in-app back button:
 * it walks one step back in the app, and only leaves the app after the user
 * confirms with a second press.
 */
export function useBackButton() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const armedRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let removeNative: (() => void) | null = null;

    function askExit(exit: () => void) {
      const now = Date.now();
      if (now - armedRef.current < 2500) {
        armedRef.current = 0;
        exit();
        return;
      }
      armedRef.current = now;
      toast("برای خروج از برنامه، دوباره دکمه بازگشت را بزنید", {
        description: "یک بار دیگر بازگشت = خروج",
        duration: 2400,
      });
    }

    // --- Native (Capacitor / Android) --------------------------------------
    void (async () => {
      try {
        const mod = await import("@capacitor/app");
        const { Capacitor } = await import("@capacitor/core");
        if (disposed || !Capacitor.isNativePlatform()) return;
        const handle = await mod.App.addListener("backButton", () => {
          if (isHome(pathRef.current)) {
            askExit(() => void mod.App.exitApp());
          } else {
            router.history.back();
          }
        });
        if (disposed) void handle.remove();
        else removeNative = () => void handle.remove();
      } catch {
        /* plugin unavailable (web build) */
      }
    })();

    // --- Web / PWA fallback -------------------------------------------------
    if (typeof window !== "undefined") {
      window.history.pushState({ __exitGuard: true }, "");
      const onPop = () => {
        if (!isHome(pathRef.current)) return;
        window.history.pushState({ __exitGuard: true }, "");
        askExit(() => {
          window.history.go(-2);
        });
      };
      window.addEventListener("popstate", onPop);
      return () => {
        disposed = true;
        removeNative?.();
        window.removeEventListener("popstate", onPop);
      };
    }

    return () => {
      disposed = true;
      removeNative?.();
    };
  }, [router]);
}
