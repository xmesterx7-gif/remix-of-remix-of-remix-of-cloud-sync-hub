import { nowISO } from "@/lib/datetime";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, FilterChips, ListSkeleton, PageHeader } from "@/components/ui-kit";
import { AmountField, DateField, Field, SelectField, TextArea } from "@/components/forms/fields";
import {
  PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  can,
  uid,
  useStore,
  type Priority,
  type TaskStatus,
} from "@/lib/store";
import { money, toFa } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RecordActions } from "@/components/records/RecordActions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/tasks/")({
  head: () => ({
    meta: [
      { title: "وظایف تعمیرکاران | مدیریت تعمیرگاه" },
      {
        name: "description",
        content: "تعریف وظیفه برای تعمیرکاران، پیگیری وضعیت، دستمزد و تأیید کارهای انجام‌شده.",
      },
      { property: "og:title", content: "مدیریت وظایف تعمیرکاران" },
      { property: "og:description", content: "کارهای در حال انجام و محول‌شده تعمیرگاه دوچرخه." },
    ],
  }),
  component: () => (
    <AppShell>
      <TasksPage />
    </AppShell>
  ),
});

const statusTone = (s: TaskStatus) =>
  s === "APPROVED"
    ? "success"
    : s === "REJECTED" || s === "CANCELLED"
      ? "danger"
      : s === "SUBMITTED"
        ? "info"
        : s === "IN_PROGRESS"
          ? "primary"
          : "neutral";

function TasksPage() {
  const { state, setState, user, notify, loading } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [newOpen, setNewOpen] = useState(false);

  const [form, setForm] = useState({
    workerId: "",
    title: "",
    description: "",
    priority: "MEDIUM" as Priority,
    dueDate: "",
    wage: 0,
  });

  const isManager = can(user, "approve");
  const workers = state.users.filter((u) => u.isWorker || u.role === "MECHANIC");

  const myTasks = useMemo(
    () => state.tasks.filter((t) => t.workerId === user?.id),
    [state.tasks, user],
  );
  const workerTasks = useMemo(
    () =>
      state.tasks
        .filter((t) => (selectedWorker ? t.workerId === selectedWorker : true))
        .filter((t) => filter === "ALL" || t.status === filter),
    [state.tasks, selectedWorker, filter],
  );

  function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.workerId || !form.title.trim() || form.wage <= 0) {
      toast.error("کارمند، عنوان وظیفه و دستمزد اجباری هستند.");
      return;
    }
    setState((s) => ({
      ...s,
      tasks: [
        {
          id: uid("t"),
          workerId: form.workerId,
          title: form.title,
          description: form.description,
          priority: form.priority,
          ...(form.dueDate ? { dueDate: new Date(form.dueDate).toISOString() } : {}),
          wage: form.wage,
          status: "PENDING",
          createdBy: user!.id,
          createdAt: nowISO(),
        },
        ...s.tasks,
      ],
    }));
    notify({
      userRole: ["MECHANIC"],
      title: "وظیفه جدید",
      body: "وظیفه جدید برای شما ثبت شد.",
      url: "/tasks",
      type: "task",
      event: "NEW_TASK",
    });
    setNewOpen(false);
    setForm({ workerId: "", title: "", description: "", priority: "MEDIUM", dueDate: "", wage: 0 });
    toast.success("وظیفه جدید ثبت شد");
  }

  if (!user) return null;

  /* ---------- Mechanic / employee view ---------- */
  if (!isManager) {
    const list = myTasks.filter((t) => filter === "ALL" || t.status === filter);
    return (
      <>
        <PageHeader title="وظایف من" subtitle="لیست کارهای محول‌شده به شما" />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "همه" },
            { value: "PENDING", label: "انجام‌نشده" },
            { value: "IN_PROGRESS", label: "در حال انجام" },
            { value: "SUBMITTED", label: "منتظر تأیید" },
            { value: "APPROVED", label: "تأییدشده" },
            { value: "REJECTED", label: "رد شده" },
          ]}
        />
        <div className="mt-4">
          {loading ? (
            <ListSkeleton />
          ) : list.length === 0 ? (
            <EmptyState
              icon={<Wrench className="size-6" />}
              title="وظیفه‌ای وجود ندارد"
              description="در این دسته وظیفه‌ای برای شما ثبت نشده است."
            />
          ) : (
            <ul className="space-y-3">
              {list.map((t) => (
                <TaskCard key={t.id} id={t.id} />
              ))}
            </ul>
          )}
        </div>
      </>
    );
  }

  /* ---------- Manager view ---------- */
  return (
    <>
      <PageHeader
        title="مدیریت وظایف تعمیرکاران"
        subtitle="انتخاب کارمند و پیگیری کارها"
        action={
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" /> وظیفه جدید
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border bg-card px-4 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجوی تعمیرکار..."
          aria-label="جستجوی تعمیرکار"
          className="h-12 w-full bg-transparent text-sm outline-none"
        />
      </div>

      <ul className="space-y-3">
        {workers
          .filter((w) => w.fullName.includes(q))
          .map((w) => {
            const active = state.tasks.filter(
              (t) => t.workerId === w.id && (t.status === "PENDING" || t.status === "IN_PROGRESS"),
            ).length;
            return (
              <li key={w.id}>
                <button
                  onClick={() => setSelectedWorker(selectedWorker === w.id ? null : w.id)}
                  aria-pressed={selectedWorker === w.id}
                  className={`app-card flex w-full items-center gap-3 p-4 text-start ${
                    selectedWorker === w.id ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <Avatar className="size-12 border-2 border-primary/30">
                    <AvatarFallback className="bg-accent font-bold text-accent-foreground">
                      {w.fullName.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{w.fullName}</p>
                    <p className="truncate text-sm text-muted-foreground">{w.title}</p>
                  </div>
                  <Chip tone={active ? "success" : "neutral"}>
                    {active ? `${toFa(active)} وظیفه فعال` : "بدون وظیفه"}
                  </Chip>
                </button>
              </li>
            );
          })}
      </ul>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">
          {selectedWorker
            ? `وظایف ${state.users.find((u) => u.id === selectedWorker)?.fullName}`
            : "همه وظایف"}
        </h2>
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "همه" },
            { value: "PENDING", label: "انجام‌نشده" },
            { value: "IN_PROGRESS", label: "در حال انجام" },
            { value: "SUBMITTED", label: "منتظر تأیید" },
            { value: "APPROVED", label: "تأییدشده" },
            { value: "REJECTED", label: "رد شده" },
          ]}
        />
        <div className="mt-4">
          {loading ? (
            <ListSkeleton />
          ) : workerTasks.length === 0 ? (
            <EmptyState
              icon={<Wrench className="size-6" />}
              title="وظیفه‌ای یافت نشد"
              description="برای این کارمند وظیفه‌ای در این وضعیت ثبت نشده است."
              action={
                <button
                  onClick={() => setNewOpen(true)}
                  className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
                >
                  ایجاد وظیفه جدید
                </button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {workerTasks.map((t) => (
                <TaskCard key={t.id} id={t.id} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent side="bottom" className="safe-bottom max-h-[92vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="text-start">
            <SheetTitle>ایجاد وظیفه جدید</SheetTitle>
          </SheetHeader>
          <form onSubmit={createTask} className="space-y-4 p-4" noValidate>
            <SelectField
              id="worker"
              label="انتخاب کارمند"
              required
              value={form.workerId}
              onChange={(v) => setForm({ ...form, workerId: v })}
              options={[
                { value: "", label: "انتخاب کنید" },
                ...workers.map((w) => ({ value: w.id, label: w.fullName })),
              ]}
            />
            <Field
              id="title"
              label="عنوان وظیفه"
              required
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
              placeholder="مثلاً سرویس کامل دوچرخه کوهستان"
            />
            <TextArea
              id="desc"
              label="توضیحات وظیفه"
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
            />
            <SelectField
              id="priority"
              label="اولویت"
              value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v as Priority })}
              options={(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => ({
                value: p,
                label: PRIORITY_LABEL[p],
              }))}
            />
            <DateField
              id="due"
              label="تاریخ سررسید"
              value={form.dueDate}
              onChange={(v) => setForm({ ...form, dueDate: v })}
            />
            <AmountField
              id="wage"
              label="دستمزد"
              required
              value={form.wage}
              onChange={(v) => setForm({ ...form, wage: v })}
              currency={state.currency}
            />
            <button
              type="submit"
              className="min-h-13 w-full rounded-xl bg-primary py-3.5 font-extrabold text-primary-foreground"
            >
              ثبت وظیفه
            </button>
          </form>
        </SheetContent>
      </Sheet>

      <button hidden onClick={() => navigate({ to: "/tasks" })} />
    </>
  );
}

function TaskCard({ id }: { id: string }) {
  const { state } = useStore();
  const t = state.tasks.find((x) => x.id === id)!;
  const border =
    t.status === "IN_PROGRESS"
      ? "border-e-4 border-e-primary"
      : t.status === "SUBMITTED"
        ? "border-e-4 border-e-info"
        : "";
  return (
    <li className="relative">
      <RecordActions
        kind="task"
        id={t.id}
        title={t.title}
        status={t.status}
        className="absolute start-2 top-2 z-10 bg-card/80 backdrop-blur"
      />
      <Link to="/tasks/$id" params={{ id: t.id }} className={`app-card block p-4 ${border}`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-extrabold">{t.title}</h3>
          <Chip tone={statusTone(t.status)}>{TASK_STATUS_LABEL[t.status]}</Chip>
        </div>
        <p className="num mt-2 text-sm text-muted-foreground">
          {money(t.wage, state.currency)}
        </p>
        <p className="mt-2 flex items-center gap-1 text-sm font-bold">
          <span
            className={`size-2.5 rounded-full ${
              t.priority === "HIGH" || t.priority === "URGENT"
                ? "bg-destructive"
                : t.priority === "MEDIUM"
                  ? "bg-primary"
                  : "bg-muted-foreground"
            }`}
          />
          {PRIORITY_LABEL[t.priority]}
        </p>
      </Link>
    </li>
  );
}
