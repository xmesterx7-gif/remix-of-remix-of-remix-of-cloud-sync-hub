import { nowISO } from "@/lib/datetime";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bike, Palette, Ruler, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, FilterChips, ListSkeleton, PageHeader } from "@/components/ui-kit";
import { AmountField, Field, SelectField, TextArea } from "@/components/forms/fields";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  BIKE_TYPE_LABEL,
  BIKE_SIZES,
  TASK_STATUS_LABEL,
  can,
  uid,
  useStore,
  type BicyclePurchase,
  type BikeType,
} from "@/lib/store";
import { faDateTime, money, toFa } from "@/lib/format";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "دوچرخه‌ها | مدیریت تعمیرگاه" },
      {
        name: "description",
        content:
          "مشاهده همه دوچرخه‌های خریداری‌شده به تفکیک سایز و دسته‌بندی و ارسال هر دوچرخه برای تعمیر.",
      },
      { property: "og:title", content: "دوچرخه‌ها" },
      {
        property: "og:description",
        content: "تعداد، سایز و دسته‌بندی دوچرخه‌ها و ارجاع آن‌ها به تعمیرکار.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <InventoryPage />
    </AppShell>
  ),
});

function InventoryPage() {
  const { state, setState, user, notify, loading } = useStore();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"ALL" | BikeType>("ALL");
  const [size, setSize] = useState<"ALL" | string>("ALL");
  const [repairFor, setRepairFor] = useState<BicyclePurchase | null>(null);
  const [form, setForm] = useState({ workerId: "", title: "", description: "", wage: 0 });

  const isManager = can(user, "approve");
  const workers = state.users.filter((u) => u.isActive && (u.isWorker || u.role === "MECHANIC"));

  /** Only bikes that are actually owned by the shop (approved purchases). */
  const bikes = useMemo(
    () =>
      state.purchases.filter(
        (p) => p.status === "APPROVED" || p.status === "SYNCED_TO_ACCOUNTING",
      ),
    [state.purchases],
  );

  const list = useMemo(
    () =>
      bikes
        .filter((b) => type === "ALL" || b.bikeType === type)
        .filter((b) => size === "ALL" || b.size === size)
        .filter((b) => (q ? (b.brand + b.color + b.size).includes(q.trim()) : true)),
    [bikes, type, size, q],
  );

  const bySize = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bikes) map.set(b.size, (map.get(b.size) ?? 0) + 1);
    return [...BIKE_SIZES].filter((s) => map.has(s)).map((s) => [s, map.get(s)!] as const);
  }, [bikes]);

  const byType = useMemo(
    () =>
      (Object.keys(BIKE_TYPE_LABEL) as BikeType[]).map(
        (t) => [t, bikes.filter((b) => b.bikeType === t).length] as const,
      ),
    [bikes],
  );

  function taskOf(bike: BicyclePurchase) {
    return bike.repairTaskId ? state.tasks.find((t) => t.id === bike.repairTaskId) : undefined;
  }

  function openRepair(bike: BicyclePurchase) {
    setForm({
      workerId: workers[0]?.id ?? "",
      title: `تعمیر دوچرخه ${bike.brand} سایز ${bike.size}`,
      description: `رنگ: ${bike.color} · دسته: ${BIKE_TYPE_LABEL[bike.bikeType]}`,
      wage: 0,
    });
    setRepairFor(bike);
  }

  function sendToRepair(e: React.FormEvent) {
    e.preventDefault();
    const bike = repairFor;
    if (!bike || !user) return;
    if (!form.workerId) {
      toast.error("یک تعمیرکار انتخاب کنید.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("عنوان کار را وارد کنید.");
      return;
    }
    if (form.wage <= 0) {
      toast.error("دستمزد را وارد کنید.");
      return;
    }
    const taskId = uid("t");
    setState((s) => ({
      ...s,
      tasks: [
        {
          id: taskId,
          workerId: form.workerId,
          bikeId: bike.id,
          title: form.title.trim(),
          description: form.description.trim(),
          priority: "MEDIUM",
          wage: form.wage,
          status: "PENDING",
          createdBy: user.id,
          createdAt: nowISO(),
        },
        ...s.tasks,
      ],
      purchases: s.purchases.map((p) => (p.id === bike.id ? { ...p, repairTaskId: taskId } : p)),
    }));
    notify({
      userRole: ["MECHANIC"],
      userIds: [form.workerId],
      title: "دوچرخه برای تعمیر ارسال شد",
      body: `${bike.brand} سایز ${bike.size} – ${form.title.trim()}`,
      url: "/tasks",
      type: "task",
      event: "NEW_TASK",
    });
    setRepairFor(null);
    toast.success("دوچرخه برای تعمیرکار ارسال شد");
  }

  if (!user) return null;

  return (
    <>
      <PageHeader
        title="دوچرخه‌ها"
        subtitle={`${toFa(bikes.length)} دوچرخه موجود`}
      />

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="app-card p-4">
          <p className="text-xs text-muted-foreground">کل دوچرخه‌ها</p>
          <p className="num mt-1 text-2xl font-extrabold text-primary">{toFa(bikes.length)}</p>
        </div>
        {byType.map(([t, count]) => (
          <div key={t} className="app-card p-4">
            <p className="text-xs text-muted-foreground">{BIKE_TYPE_LABEL[t]}</p>
            <p className="num mt-1 text-2xl font-extrabold">{toFa(count)}</p>
          </div>
        ))}
      </section>

      {bySize.length ? (
        <section className="app-card mb-4 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
            <Ruler className="size-4 text-primary" /> تعداد بر اساس سایز
          </h2>
          <div className="flex flex-wrap gap-2">
            {bySize.map(([s, count]) => (
              <Chip key={s} tone="info">
                سایز {toFa(s)}: {toFa(count)} عدد
              </Chip>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mb-3 flex items-center gap-2 rounded-2xl border bg-card px-4 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو بر اساس برند، رنگ یا سایز..."
          aria-label="جستجوی دوچرخه"
          className="h-12 w-full bg-transparent text-sm outline-none"
        />
      </div>

      <FilterChips
        value={type}
        onChange={setType}
        options={[
          { value: "ALL", label: "همه دسته‌ها" },
          ...(Object.keys(BIKE_TYPE_LABEL) as BikeType[]).map((t) => ({
            value: t,
            label: BIKE_TYPE_LABEL[t],
          })),
        ]}
      />
      <div className="mt-2">
        <FilterChips
          value={size}
          onChange={setSize}
          options={[
            { value: "ALL", label: "همه سایزها" },
            ...BIKE_SIZES.map((s) => ({ value: s as string, label: `سایز ${toFa(s)}` })),
          ]}
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <ListSkeleton />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Bike className="size-6" />}
            title="دوچرخه‌ای ثبت نشده است"
            description="فقط خریدهای تأییدشده در این فهرست نمایش داده می‌شوند."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((b) => {
              const task = taskOf(b);
              const inRepair =
                task && task.status !== "APPROVED" && task.status !== "CANCELLED";
              return (
                <li key={b.id} className="app-card overflow-hidden">
                  <div className="flex items-center justify-between gap-2 bg-secondary px-4 py-3">
                    <Chip tone="primary">سایز {toFa(b.size)}</Chip>
                    <span className="text-xs font-bold text-muted-foreground">
                      {BIKE_TYPE_LABEL[b.bikeType]}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-extrabold">{b.brand}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Palette className="size-4" /> رنگ: {b.color} · ثبت: {faDateTime(b.createdAt)}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                      <span className="num text-sm font-extrabold">
                        {money(b.purchasePrice, state.currency)}
                      </span>
                      {task ? (
                        <Chip tone={inRepair ? "warning" : "success"}>
                          <Wrench className="size-3.5" /> {TASK_STATUS_LABEL[task.status]}
                        </Chip>
                      ) : null}
                    </div>
                    {isManager ? (
                      <button
                        onClick={() => openRepair(b)}
                        disabled={!!inRepair}
                        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-50"
                      >
                        <Wrench className="size-4" />
                        {inRepair ? "در حال تعمیر" : "ارسال برای تعمیر"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Sheet open={!!repairFor} onOpenChange={(o) => !o && setRepairFor(null)}>
        <SheetContent side="bottom" className="safe-bottom max-h-[90vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="text-start">
            <SheetTitle>ارسال دوچرخه برای تعمیر</SheetTitle>
          </SheetHeader>
          <form onSubmit={sendToRepair} className="space-y-4 p-4">
            <SelectField
              id="repair-worker"
              label="تعمیرکار"
              required
              value={form.workerId}
              onChange={(v) => setForm((f) => ({ ...f, workerId: v }))}
              options={workers.map((w) => ({ value: w.id, label: `${w.fullName} – ${w.title}` }))}
            />
            <Field
              id="repair-title"
              label="عنوان کار"
              required
              value={form.title}
              onChange={(v) => setForm((f) => ({ ...f, title: v }))}
            />
            <TextArea
              id="repair-desc"
              label="توضیحات"
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            />
            <AmountField
              id="repair-wage"
              label="دستمزد"
              required
              currency={state.currency}
              value={form.wage}
              onChange={(v) => setForm((f) => ({ ...f, wage: v }))}
            />
            <button
              type="submit"
              className="h-14 w-full rounded-xl bg-primary text-base font-extrabold text-primary-foreground"
            >
              ثبت و ارسال به تعمیرکار
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
