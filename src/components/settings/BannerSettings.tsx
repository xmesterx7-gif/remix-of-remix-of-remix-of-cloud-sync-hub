import { useRef, useState } from "react";
import { Copy, Image as ImageIcon, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";

import { compressImage } from "@/lib/images";
import { useStore } from "@/lib/store";
import loginBanner from "@/assets/login-banner.jpg";

type Slot = "login" | "app";

const LABEL: Record<Slot, string> = {
  login: "بنر صفحهٔ ورود",
  app: "بنر بالای صفحات داخل برنامه",
};

/** Lets the main admin replace both banner pictures of the app. */
export function BannerSettings() {
  const { state, setState } = useStore();
  const banners = state.banners ?? { login: "", app: "" };
  const [busy, setBusy] = useState<Slot | null>(null);
  const inputs = {
    login: useRef<HTMLInputElement>(null),
    app: useRef<HTMLInputElement>(null),
  };

  function update(slot: Slot, value: string) {
    setState((s) => ({
      ...s,
      banners: { ...(s.banners ?? { login: "", app: "" }), [slot]: value },
    }));
  }

  async function pick(slot: Slot, file?: File | null) {
    if (!file) return;
    setBusy(slot);
    try {
      const url = await compressImage(file, 1600, 0.8);
      update(slot, url);
      toast.success(`${LABEL[slot]} تغییر کرد`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تغییر تصویر ممکن نشد.");
    } finally {
      setBusy(null);
      if (inputs[slot].current) inputs[slot].current.value = "";
    }
  }

  return (
    <section className="app-card mb-4 p-4 sm:p-6">
      <h2 className="mb-1 flex items-center gap-2 font-extrabold">
        <ImageIcon className="size-5 text-primary" /> تصاویر بنر برنامه
      </h2>
      <p className="mb-4 text-xs leading-6 text-muted-foreground">
        هر دو بنر (صفحهٔ ورود و بالای صفحات داخل برنامه) را می‌توانید با عکس دلخواه خود عوض کنید؛
        تصویر برای همهٔ کاربران روی همهٔ دستگاه‌ها ذخیره می‌شود.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {(["login", "app"] as Slot[]).map((slot) => {
          const current = banners[slot] || (slot === "app" ? banners.login : "") || loginBanner;
          return (
            <div key={slot} className="space-y-2">
              <span className="block text-sm font-bold">{LABEL[slot]}</span>
              <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl border bg-muted">
                <img
                  src={current}
                  alt={LABEL[slot]}
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
              <input
                ref={inputs[slot]}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void pick(slot, e.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === slot}
                  onClick={() => inputs[slot].current?.click()}
                  className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
                >
                  <Upload className="size-4" />
                  {busy === slot ? "در حال آماده‌سازی..." : "انتخاب عکس"}
                </button>
                {slot === "app" ? (
                  <button
                    type="button"
                    onClick={() => {
                      update("app", banners.login || "");
                      toast.success("بنر داخل برنامه مانند بنر ورود شد");
                    }}
                    className="flex items-center gap-1 rounded-full border px-4 py-2 text-xs font-bold"
                  >
                    <Copy className="size-4" /> مانند بنر ورود
                  </button>
                ) : null}
                {banners[slot] ? (
                  <button
                    type="button"
                    onClick={() => {
                      update(slot, "");
                      toast.success("تصویر پیش‌فرض بازگردانده شد");
                    }}
                    className="flex items-center gap-1 rounded-full border px-4 py-2 text-xs font-bold"
                  >
                    <RotateCcw className="size-4" /> تصویر پیش‌فرض
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
