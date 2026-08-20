import { nowISO } from "@/lib/datetime";
import { useState } from "react";
import { Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AmountField, Field, SelectField, TextArea } from "@/components/forms/fields";
import { BIKE_TYPE_LABEL, uid, useStore, type BicyclePurchase, type Task } from "@/lib/store";

const PRESETS = [
  "پنچرگیری",
  "تنظیم باد",
  "سرویس کامل",
  "تعویض قطعه",
  "تنظیم ترمز",
  "تعمیر دلخواه",
];

type Line = { id: string; title: string; workerId: string; wage: number; description: string };

const emptyLine = (workerId: string): Line => ({
  id: uid("line"),
  title: "",
  workerId,
  wage: 0,
  description: "",
});

/**
 * Bottom sheet that registers one or more repair services for a single bike.
 * Every service becomes a task (with wage) assigned to the chosen mechanic and
 * stays linked to the bike through `bikeId`.
 */
export function RepairSheet({
  bike,
  open,
  onOpenChange,
}: {
  bike: BicyclePurchase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, setState, user, notify } = useStore();
  const workers = state.users.filter(
    (u) => u.isActive && !u.isArchived && (u.isWorker || u.role === "MECHANIC"),
  );
  const [lines, setLines] = useState<Line[]>([emptyLine("")]);

  function reset() {
    setLines([emptyLine(workers[0]?.id ?? "")]);
  }

  function patch(id: string, p: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!bike || !user) return;
    for (const l of lines) {
      if (!l.title.trim()) {
        toast.error("نام خدمت را برای همه تعمیرها وارد کنید.");
        return;
      }
      if (!l.workerId) {
        toast.error("برای هر تعمیر یک تعمیرکار انتخاب کنید.");
        return;
      }
      if (!(l.wage > 0)) {
        toast.error("مبلغ دستمزد باید بیشتر از صفر باشد.");
        return;
      }
    }
    const now = nowISO();
    const created: Task[] = lines.map((l) => ({
      id: uid("t"),
      workerId: l.workerId,
      bikeId: bike.id,
      title: l.title.trim(),
      description:
        l.description.trim() ||
        `${bike.brand} · سایز ${bike.size} · ${BIKE_TYPE_LABEL[bike.bikeType]}`,
      priority: "MEDIUM",
      wage: l.wage,
      status: "PENDING",
      createdBy: user.id,
      createdAt: now,
    }));
    setState((s) => ({
      ...s,
      tasks: [...created, ...s.tasks],
      purchases: s.purchases.map((p) =>
        p.id === bike.id && !p.repairTaskId ? { ...p, repairTaskId: created[0]!.id } : p,
      ),
    }));
    notify({
      userRole: ["MECHANIC"],
      userIds: [...new Set(created.map((t) => t.workerId))],
      title: "دوچرخه برای تعمیر ارسال شد",
      body: `${bike.brand} سایز ${bike.size} – ${created.map((t) => t.title).join("، ")}`,
      url: "/tasks",
      type: "task",
      event: "NEW_TASK",
    });
    reset();
    onOpenChange(false);
    toast.success(`${created.length} تعمیر برای این دوچرخه ثبت شد`);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) reset();
        onOpenChange(o);
      }}
    >
      <SheetContent
        side="bottom"
        className="safe-bottom max-h-[92vh] overflow-y-auto rounded-t-3xl"
      >
        <SheetHeader className="text-start">
          <SheetTitle className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" /> ارسال برای تعمیر
            {bike ? <span className="text-sm font-bold text-muted-foreground">{bike.brand}</span> : null}
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4 p-4" noValidate>
          {lines.map((l, i) => (
            <div key={l.id} className="app-card space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold">تعمیر {i + 1}</span>
                {lines.length > 1 ? (
                  <button
                    type="button"
                    aria-label="حذف این تعمیر"
                    onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                    className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => patch(l.id, { title: p })}
                    aria-pressed={l.title === p}
                    className={`min-h-10 rounded-full px-3 text-xs font-bold ${
                      l.title === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <Field
                id={`repair-title-${l.id}`}
                label="نام خدمت"
                required
                value={l.title}
                onChange={(v) => patch(l.id, { title: v })}
                placeholder="مثلاً پنچرگیری چرخ عقب"
              />
              <SelectField
                id={`repair-worker-${l.id}`}
                label="تعمیرکار"
                required
                value={l.workerId}
                onChange={(v) => patch(l.id, { workerId: v })}
                options={[
                  { value: "", label: "انتخاب کنید" },
                  ...workers.map((w) => ({ value: w.id, label: `${w.fullName} – ${w.title}` })),
                ]}
              />
              <AmountField
                id={`repair-wage-${l.id}`}
                label="دستمزد"
                required
                currency={state.currency}
                value={l.wage}
                onChange={(v) => patch(l.id, { wage: v })}
              />
              <TextArea
                id={`repair-desc-${l.id}`}
                label="توضیحات (اختیاری)"
                value={l.description}
                onChange={(v) => patch(l.id, { description: v })}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setLines((ls) => [...ls, emptyLine(workers[0]?.id ?? "")])}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-extrabold text-secondary-foreground"
          >
            <Plus className="size-4" /> افزودن تعمیر دیگر
          </button>

          <button
            type="submit"
            className="min-h-13 w-full rounded-xl bg-primary py-3.5 text-base font-extrabold text-primary-foreground"
          >
            ثبت و ارسال به تعمیرکار
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
