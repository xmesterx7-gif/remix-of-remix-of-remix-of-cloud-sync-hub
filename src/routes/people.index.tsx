import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit";
import { PeopleManager } from "@/components/people/PeopleManager";

export const Route = createFileRoute("/people/")({
  head: () => ({
    meta: [
      { title: "معرفی اشخاص | پنل پشتیبان تعمیرگاه" },
      {
        name: "description",
        content:
          "ساخت حساب کاربری برای هر شخص با نام کاربری، رمز عبور، پست، توضیحات، وضعیت و سازمان؛ ویرایش، غیرفعال‌سازی، آرشیو و بازگردانی.",
      },
      { property: "og:title", content: "معرفی اشخاص و ساخت حساب کاربری" },
      {
        property: "og:description",
        content: "پشتیبان برای هر شخص نام کاربری و رمز عبور می‌سازد و پست و دسترسی او را تعیین می‌کند.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <PageHeader
        title="معرفی اشخاص"
        subtitle="ساخت و مدیریت حساب اشخاص؛ ورود با نام کاربری و رمز عبور از هر موبایلی"
      />
      <PeopleManager />
    </AppShell>
  ),
});
