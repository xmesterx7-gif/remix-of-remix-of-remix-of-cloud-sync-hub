import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit";
import { AuditHistory } from "@/components/admin/AuditHistory";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "تاریخچه و بازگردانی | مدیریت تعمیرگاه دوچرخه" },
      {
        name: "description",
        content:
          "تاریخچهٔ تغییرناپذیر همهٔ ثبت‌ها، ویرایش‌ها، تأییدها و بایگانی‌ها همراه با بازیابی رکوردها و بازگردانی وضعیت به مرحلهٔ قبل.",
      },
      { property: "og:title", content: "تاریخچهٔ تغییرات و بازگردانی رکوردها" },
      {
        property: "og:description",
        content: "مشاهدهٔ کاربر، زمان تهران و مقدار قبل و بعد هر تغییر؛ بازیابی رکوردهای بایگانی‌شده.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <PageHeader
        title="تاریخچه و بازگردانی"
        subtitle="سابقهٔ تغییرناپذیر تغییرات، بازیابی رکوردهای بایگانی‌شده و بازگردانی وضعیت"
      />
      <AuditHistory />
    </AppShell>
  ),
});