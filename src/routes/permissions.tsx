import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PermissionsManager } from "@/components/people/PermissionsManager";
export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "تغییر دسترسی کاربران | مدیریت تعمیرگاه دوچرخه" },
      {
        name: "description",
        content:
          "پشتیبان می‌تواند دسترسی هر شخص به مدیریت فروشگاه، فروش، وظایف، دستمزدها، آلارم‌ها، چت‌ها، گزارش‌ها و تنظیمات را فعال یا غیرفعال کند.",
      },
      { property: "og:title", content: "تغییر دسترسی کاربران تعمیرگاه دوچرخه" },
      {
        property: "og:description",
        content: "کنترل دقیق دسترسی هر پرسنل توسط پشتیبان، با ثبت لحظه‌ای تاریخ و ساعت شمسی.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <PermissionsManager />
    </AppShell>
  ),
});

