import { useEffect, useRef, useState } from "react";

/**
 * Keeps the chat surface exactly as tall as the *visible* viewport.
 * On Android/iOS the software keyboard shrinks `visualViewport`, so we
 * recompute the height (and re-pin the scroll to the newest message)
 * whenever the keyboard opens, closes or the page is resized.
 */
export function useChatViewport(onResize?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const cb = useRef(onResize);
  cb.current = onResize;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;

    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const viewportHeight = vv ? vv.height : window.innerHeight;
      const keyboardOpen = vv ? window.innerHeight - vv.height > 120 : false;
      // Leave room for the mobile bottom nav only while the keyboard is closed.
      const reserved = keyboardOpen ? 8 : window.innerWidth < 1024 ? 76 : 24;
      const next = Math.max(240, viewportHeight - top - reserved);
      setHeight(next);
      requestAnimationFrame(() => cb.current?.());
    };

    measure();
    const t = window.setTimeout(measure, 250);
    vv?.addEventListener("resize", measure);
    vv?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.clearTimeout(t);
      vv?.removeEventListener("resize", measure);
      vv?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return { ref, height };
}
