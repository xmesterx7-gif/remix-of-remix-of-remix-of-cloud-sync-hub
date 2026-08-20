import { nowISO } from "@/lib/datetime";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  History,
  ImagePlus,
  PencilLine,
  PlayCircle,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Chip, EmptyState, PageHeader } from "@/components/ui-kit";
import { AmountField, InfoRow, TextArea } from "@/components/forms/fields";
import { PRIORITY_LABEL, TASK_STATUS_LABEL, can, canApproveTask, useStore } from "@/lib/store";
import { MAX_PHOTOS, compressImage } from "@/lib/images";
import { faDateTimeLong, money } from "@/lib/format";
import { RecordActions } from "@/components/records/RecordActions";

export const Route = createFileRoute("/tasks/$id")({
  head: () => ({
    meta: [
      { title: "جزئیات وظیفه | مدیریت تعمیرگاه" },
      { name: "description", content: "تغییر وضعیت وظیفه، ثبت انجام کار با عکس، تأیید یا رد توسط مدیر." },
      { property: "og:title", content: "جزئیات وظیفه تعمیرکار" },
      { property: "og:description", content: "پیگیری کامل یک وظیفه تعمیرگاه دوچرخه." },
    ],
  }),
  component: () => (
    <AppShell>
      <TaskDetail />
    </AppShell>
  ),
});

function TaskDetail() {
  const { id } = useParams({ from: "/tasks/$id" });
  const { state, setState, user, notify, log } = useStore();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [finalWage, setFinalWage] = useState(0);
  const [wageNote, setWageNote] = useState("");
  const [editReason, setEditReason] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const task = state.tasks.find((t) => t.id === id);
  if (!task || !user)
    return (
      <EmptyState
        icon={<XCircle className="size-6" />}
        title="وظیفه یافت نشد"
        description="این وظیفه حذف شده یا دسترسی ندارید."
      />
    );

  const worker = state.users.find((u) => u.id === task.workerId);
  const isOwner = task.workerId === user.id;
  const isManager = can(user, "approve");
  // Approving a task is OWNER-only, matching the database guard.
  const canApprove = canApproveTask(user);
  const readOnly = !can(user, "write");
  const savedPhotos = task.photos ?? [];
  const history = state.activity.filter((a) => a.entity === "task" && a.recordId === task.id);

  function patch(p: Record<string, unknown>) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? ({ ...t, ...p } as typeof t) : t)),
    }));
  }

  async function addPhotos(files: FileList | null, source: "camera" | "gallery") {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`حداکثر ${MAX_PHOTOS} عکس می‌توانید اضافه کنید.`);
      return;
    }
    setBusy(true);
    try {
      const picked: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        picked.push(await compressImage(file));
      }
      setPhotos((p) => [...p, ...picked]);
      toast.success(`${picked.length} عکس اضافه شد`);
    } catch (err) {
      // A blocked camera should still leave the gallery route open to the worker.
      toast.error(
        err instanceof Error
          ? err.message
          : source === "camera"
            ? "دوربین در دسترس نیست؛ از گالری استفاده کنید."
            : "خواندن تصویر ناموفق بود.",
      );
    } finally {
      setBusy(false);
    }
  }

  function submitWork() {
    if (!note.trim()) {
      toast.error("توضیح انجام کار را وارد کنید.");
      return;
    }
    if (!photos.length && !savedPhotos.length) {
      toast.error("ثبت حداقل یک عکس از کار انجام‌شده الزامی است.");
      return;
    }
    const allPhotos = [...savedPhotos, ...photos].slice(0, MAX_PHOTOS);
    patch({
      status: "SUBMITTED",
      completedNote: note,
      photos: allPhotos,
      ...(allPhotos[0] ? { photo: allPhotos[0] } : {}),
      submittedAt: nowISO(),
    });
    log({
      entity: "task",
      recordId: task!.id,
      action: "ثبت انجام کار",
      after: { note, photos: allPhotos.length },
    });
    notify({
      userRole: ["ADMIN", "STORE_MANAGER"],
      title: "وظیفه انجام شد",
      body: `${task!.title} — نیاز به تأیید دارد.`,
      url: `/tasks/${task!.id}`,
      type: "task",
      event: "TASK_STATUS",
    });
    setPhotos([]);
    setNote("");
    toast.success("انجام وظیفه ثبت شد");
  }

  function approve() {
    // Defense in depth: mirrors the database `APPROVAL_OWNER_ONLY` guard.
    if (!canApproveTask(user)) {
      toast.error("تأیید وظیفه فقط توسط پشتیبان سامانه ممکن است.");
      return;
    }
    const wage = finalWage || task!.wage;
    patch({
      status: "APPROVED",
      finalWage: wage,
      approvedAt: nowISO(),
      ...(wageNote.trim() ? { wageNote: wageNote.trim() } : {}),
    });
    log({
      entity: "wage",
      recordId: task!.id,
      action: "تأیید وظیفه و تعیین دستمزد نهایی",
      before: { wage: task!.wage },
      after: { wage, note: wageNote.trim() || undefined },
    });
    notify({
      userIds: [task!.workerId],
      userRole: ["MECHANIC"],
      title: "وظیفه تأیید شد",
      body: wageNote.trim()
        ? `دستمزد نهایی ثبت شد. توضیح: ${wageNote.trim()}`
        : "وظیفه شما تأیید شد.",
      url: `/tasks/${task!.id}`,
      type: "task",
      event: wage === task!.wage ? "TASK_STATUS" : "BONUS_PENALTY",
    });
    toast.success("وظیفه تأیید شد");
  }

  function reject() {
    if (!canApproveTask(user)) {
      toast.error("رد وظیفه فقط توسط پشتیبان سامانه ممکن است.");
      return;
    }
    if (!reason.trim()) {
      toast.error("دلیل رد اجباری است.");
      return;
    }
    patch({ status: "REJECTED", rejectReason: reason });
    log({ entity: "task", recordId: task!.id, action: "رد وظیفه", note: reason });
    notify({
      userIds: [task!.workerId],
      userRole: ["MECHANIC"],
      title: "وظیفه نیاز به اصلاح دارد",
      body: `دلیل: ${reason}`,
      url: `/tasks/${task!.id}`,
      type: "task",
      event: "TASK_STATUS",
    });
    toast.success("وظیفه رد شد");
  }

  function requestEdit() {
    if (!editReason.trim()) {
      toast.error("دلیل درخواست ویرایش را بنویسید.");
      return;
    }
    patch({ editRequest: editReason.trim(), editRequestAt: nowISO() });
    log({
      entity: "task",
      recordId: task!.id,
      action: "درخواست ویرایش",
      note: editReason.trim(),
    });
    notify({
      userRole: ["ADMIN", "STORE_MANAGER"],
      title: "درخواست ویرایش وظیفه",
      body: `${task!.title} — ${editReason.trim()}`,
      url: `/tasks/${task!.id}`,
      type: "task",
      event: "TASK_STATUS",
    });
    setEditReason("");
    toast.success("درخواست ویرایش برای مدیر ارسال شد");
  }

  function answerEditRequest(accepted: boolean) {
    patch({
      editRequest: null,
      editRequestAt: null,
      ...(accepted ? { status: "IN_PROGRESS" as const } : {}),
    });
    log({
      entity: "task",
      recordId: task!.id,
      action: accepted ? "پذیرش درخواست ویرایش" : "رد درخواست ویرایش",
    });
    notify({
      userIds: [task!.workerId],
      userRole: ["MECHANIC"],
      title: accepted ? "اجازهٔ ویرایش داده شد" : "درخواست ویرایش رد شد",
      body: task!.title,
      url: `/tasks/${task!.id}`,
      type: "task",
      event: "TASK_STATUS",
    });
    toast.success(accepted ? "وظیفه برای ویرایش باز شد" : "درخواست رد شد");
  }

  return (
    <>
      <button
        onClick={() => navigate({ to: "/tasks" })}
        className="mb-3 flex items-center gap-1 text-sm font-bold text-primary"
      >
        <ArrowRight className="size-4" /> بازگشت به وظایف
      </button>

      <PageHeader
        title={task.title}
        subtitle={`تعمیرکار: ${worker?.fullName ?? "—"}`}
        action={
          <div className="flex items-center gap-1">
            <Chip tone="info">{TASK_STATUS_LABEL[task.status]}</Chip>
            <RecordActions
              kind="task"
              id={task.id}
              title={task.title}
              status={task.status}
              onDone={() => void navigate({ to: "/tasks" })}
            />
          </div>
        }
      />

      <div className="app-card divide-y p-4 sm:p-6">
        <InfoRow label="توضیحات">{task.description || "—"}</InfoRow>
        <InfoRow label="اولویت">{PRIORITY_LABEL[task.priority]}</InfoRow>
        <InfoRow label="تاریخ سررسید">{task.dueDate ? faDateTimeLong(task.dueDate) : "—"}</InfoRow>
        <InfoRow label="دستمزد">
          <span className="num">{money(task.wage, state.currency)}</span>
        </InfoRow>
        {task.finalWage ? (
          <InfoRow label="دستمزد نهایی">
            <span className="num">{money(task.finalWage, state.currency)}</span>
          </InfoRow>
        ) : null}
        {task.wageNote ? <InfoRow label="توضیح دستمزد">{task.wageNote}</InfoRow> : null}
        {task.completedNote ? <InfoRow label="گزارش انجام کار">{task.completedNote}</InfoRow> : null}
        {task.rejectReason ? <InfoRow label="دلیل رد">{task.rejectReason}</InfoRow> : null}
      </div>

      {savedPhotos.length ? (
        <section className="app-card mt-4 p-4">
          <h3 className="mb-3 font-bold">عکس‌های ثبت‌شده</h3>
          <div className="grid grid-cols-3 gap-2">
            {savedPhotos.map((src, i) => (
              <a key={src.slice(-24) + i} href={src} target="_blank" rel="noreferrer">
                <img
                  src={src}
                  alt={`عکس کار انجام‌شده ${i + 1} برای ${task.title}`}
                  loading="lazy"
                  className="h-24 w-full rounded-xl object-cover"
                />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {isManager && task.editRequest ? (
        <section className="app-card mt-4 space-y-3 border-e-4 border-e-primary p-4">
          <h3 className="flex items-center gap-2 font-bold">
            <PencilLine className="size-5 text-primary" /> درخواست ویرایش از تعمیرکار
          </h3>
          <p className="text-sm leading-6">{task.editRequest}</p>
          <div className="flex gap-2">
            <button
              onClick={() => answerEditRequest(true)}
              className="min-h-12 flex-1 rounded-xl bg-primary font-extrabold text-primary-foreground"
            >
              اجازه ویرایش
            </button>
            <button
              onClick={() => answerEditRequest(false)}
              className="min-h-12 flex-1 rounded-xl bg-destructive/10 font-bold text-destructive"
            >
              رد درخواست
            </button>
          </div>
        </section>
      ) : null}

      {isOwner && !readOnly && (task.status === "PENDING" || task.status === "IN_PROGRESS" || task.status === "REJECTED") ? (
        <div className="app-card mt-4 space-y-3 p-4">
          {task.status === "PENDING" ? (
            <button
              onClick={() => {
                patch({ status: "IN_PROGRESS" });
                log({ entity: "task", recordId: task.id, action: "شروع وظیفه" });
                toast.success("وظیفه شروع شد");
              }}
              className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-primary-foreground"
            >
              <PlayCircle className="size-5" /> شروع وظیفه
            </button>
          ) : (
            <>
              <TextArea
                id="note"
                label="گزارش انجام کار"
                value={note}
                onChange={setNote}
                placeholder="شرح کارهای انجام‌شده..."
              />

              <div>
                <span className="mb-2 block text-sm font-bold">
                  عکس کار انجام‌شده (الزامی، حداکثر {MAX_PHOTOS} عکس)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => cameraRef.current?.click()}
                    className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary/10 text-sm font-bold text-primary disabled:opacity-60"
                  >
                    <Camera className="size-5" /> دوربین
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => galleryRef.current?.click()}
                    className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-bold disabled:opacity-60"
                  >
                    <ImagePlus className="size-5" /> گالری
                  </button>
                </div>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    void addPhotos(e.target.files, "camera");
                    e.target.value = "";
                  }}
                />
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void addPhotos(e.target.files, "gallery");
                    e.target.value = "";
                  }}
                />
                {busy ? (
                  <p className="mt-2 text-xs text-muted-foreground">در حال فشرده‌سازی تصویر…</p>
                ) : null}
                {photos.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {photos.map((src, i) => (
                      <div key={src.slice(-24) + i} className="relative">
                        <img
                          src={src}
                          alt={`عکس انتخاب‌شده ${i + 1}`}
                          className="h-24 w-full rounded-xl object-cover"
                        />
                        <button
                          type="button"
                          aria-label="حذف عکس"
                          onClick={() => setPhotos((p) => p.filter((_, x) => x !== i))}
                          className="absolute end-1 top-1 rounded-lg bg-background/90 p-1 text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                onClick={submitWork}
                disabled={busy}
                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-primary-foreground disabled:opacity-60"
              >
                <Send className="size-5" /> ثبت انجام وظیفه
              </button>
            </>
          )}
        </div>
      ) : null}

      {isOwner && !readOnly && (task.status === "SUBMITTED" || task.status === "APPROVED") ? (
        <div className="app-card mt-4 space-y-3 p-4">
          <h3 className="flex items-center gap-2 font-bold">
            <PencilLine className="size-5 text-primary" /> درخواست ویرایش
          </h3>
          <p className="text-xs leading-6 text-muted-foreground">
            پس از ثبت، تغییر اطلاعات فقط با تأیید مدیر ممکن است. دلیل درخواست خود را بنویسید.
          </p>
          {task.editRequest ? (
            <p className="rounded-xl bg-secondary p-3 text-sm">
              درخواست شما ثبت شده و در انتظار پاسخ مدیر است.
            </p>
          ) : (
            <>
              <TextArea
                id="editReason"
                label="دلیل درخواست"
                value={editReason}
                onChange={setEditReason}
              />
              <button
                onClick={requestEdit}
                className="min-h-12 w-full rounded-xl bg-secondary font-bold"
              >
                ارسال درخواست به مدیر
              </button>
            </>
          )}
        </div>
      ) : null}

      {canApprove && task.status === "SUBMITTED" ? (
        <div className="app-card mt-4 space-y-4 p-4">
          <h3 className="font-bold">بررسی و تأیید</h3>
          <AmountField
            id="finalWage"
            label="دستمزد نهایی (پاداش یا جریمه)"
            value={finalWage || task.wage}
            onChange={setFinalWage}
            currency={state.currency}
          />
          <TextArea
            id="wageNote"
            label="توضیح پاداش یا کسر (اختیاری)"
            value={wageNote}
            onChange={setWageNote}
          />
          <button
            onClick={approve}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-primary-foreground"
          >
            <CheckCircle2 className="size-5" /> تأیید وظیفه
          </button>
          <TextArea id="reason" label="دلیل رد (در صورت نیاز)" value={reason} onChange={setReason} />
          <button
            onClick={reject}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 font-bold text-destructive"
          >
            <XCircle className="size-5" /> رد و نیاز به اصلاح
          </button>
        </div>
      ) : null}

      {history.length ? (
        <section className="app-card mt-4 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold">
            <History className="size-5 text-primary" /> تاریخچهٔ تغییرات
          </h3>
          <ul className="space-y-3">
            {history.map((a) => (
              <li key={a.id} className="border-b pb-2 text-sm last:border-0">
                <p className="font-bold">{a.action}</p>
                <p className="text-xs text-muted-foreground">
                  {state.users.find((u) => u.id === a.userId)?.fullName ?? "کاربر"} —{" "}
                  {faDateTimeLong(a.createdAt)}
                </p>
                {a.note ? <p className="mt-1 text-xs leading-6">{a.note}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
