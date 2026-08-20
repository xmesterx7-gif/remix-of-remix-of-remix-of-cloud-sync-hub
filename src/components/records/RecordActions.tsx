/**
 * منوی «عملیات» رکوردها برای حساب پشتیبان (OWNER).
 *
 * چهار عملیات استاندارد روی هر ثبت: اصلاح، حذف (Soft-delete موجود)،
 * بازگردانی از بایگانی و برگشت به مرحلهٔ قبل.
 *
 * این لایه فقط Frontend است: نوشتن‌ها از همان مسیرهای موجود
 * (`setState` → `pushChanges`، `soft_delete_record`، `restoreRecord`) انجام
 * می‌شود و هر عملیات با `log()` در تاریخچه/Audit ثبت می‌گردد. هیچ بررسی
 * امنیتی سمت سرور دور زده نمی‌شود؛ اگر پایگاه‌داده اجازه ندهد، خطا نمایش
 * داده می‌شود.
 */

import { useMemo, useState } from "react";
import { MoreVertical, Pencil, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { previousStage, restoreArchived, TABLE_LABEL, type RestorableTable } from "@/lib/audit";
import {
  INVOICE_STATUS_LABEL,
  TASK_STATUS_LABEL,
  useStore,
  type ActivityEntry,
  type State,
  type User,
} from "@/lib/store";
import { cn } from "@/lib/utils";

import { RecordEditForm } from "./RecordEditForm";

export type RecordKind =
  | "expense"
  | "purchase"
  | "task"
  | "invoice"
  | "message"
  | "dailyReport";

export const RECORD_TABLE: Record<RecordKind, RestorableTable> = {
  expense: "expenses",
  purchase: "bicycle_purchases",
  task: "tasks",
  invoice: "purchase_invoices",
  message: "messages",
  dailyReport: "daily_reports",
};

const RECORD_ENTITY: Record<RecordKind, ActivityEntry["entity"]> = {
  expense: "expense",
  purchase: "user",
  task: "task",
  invoice: "user",
  message: "message",
  dailyReport: "user",
};

const STATUS_LABEL: Record<string, string> = {
  ...TASK_STATUS_LABEL,
  ...INVOICE_STATUS_LABEL,
  PENDING: "در انتظار",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  SYNCED_TO_ACCOUNTING: "ثبت در حسابداری",
};

export const statusLabel = (s: string | null | undefined) => (s ? (STATUS_LABEL[s] ?? s) : "—");

/**
 * فقط حساب پشتیبان/OWNER کنترل‌های کامل رکورد را می‌بیند.
 * (پایگاه‌داده هم همین سطح را جداگانه بررسی می‌کند.)
 */
export function isRecordSupervisor(user: User | null | undefined): boolean {
  if (!user) return false;
  if (!user.isActive || user.isArchived) return false;
  return user.role === "ADMIN";
}

export const DELETE_CONFIRM_TEXT = "آیا مطمئن هستید که می‌خواهید این ثبت را حذف کنید؟";

type Props = {
  kind: RecordKind;
  /** شناسهٔ رکورد در همان جدول موجود. */
  id: string;
  /** عنوان کوتاه برای پیام‌ها و تاریخچه. */
  title: string;
  /** وضعیت فعلی؛ برای «برگشت به مرحلهٔ قبل». */
  status?: string | undefined;
  /** رکورد بایگانی‌شده است (برای فعال‌شدن «بازگردانی»). */
  archived?: boolean;
  /** برای رکوردهایی که در استور نیستند (مثل گزارش روزانه). */
  onEdit?: (() => void) | undefined;
  onDelete?: (() => Promise<void> | void) | undefined;
  /** پس از هر عملیات موفق (برای تازه‌سازی نمای محلی). */
  onDone?: (() => void) | undefined;
  className?: string;
  /** ظاهر دکمه روی پس‌زمینهٔ تیره (چت). */
  tone?: "default" | "onHero";
};

/** حذف رکورد از استور؛ مسیر موجود آن را Soft-delete می‌کند. */
function removeFromState(kind: RecordKind, id: string) {
  return (s: State): State => {
    switch (kind) {
      case "expense":
        return { ...s, expenses: s.expenses.filter((x) => x.id !== id) };
      case "purchase":
        return { ...s, purchases: s.purchases.filter((x) => x.id !== id) };
      case "task":
        return { ...s, tasks: s.tasks.filter((x) => x.id !== id) };
      case "invoice":
        return { ...s, invoices: s.invoices.filter((x) => x.id !== id) };
      case "message":
        return { ...s, messages: s.messages.filter((x) => x.id !== id) };
      default:
        return s;
    }
  };
}

/** تغییر وضعیت رکورد به مرحلهٔ قبل، بدون دست‌زدن به سایر فیلدها. */
function setStatusInState(kind: RecordKind, id: string, status: string) {
  return (s: State): State => {
    const apply = <T extends { id: string; status: string }>(list: T[]) =>
      list.map((r) => (r.id === id ? { ...r, status } : r));
    switch (kind) {
      case "expense":
        return { ...s, expenses: apply(s.expenses as never) as State["expenses"] };
      case "purchase":
        return { ...s, purchases: apply(s.purchases as never) as State["purchases"] };
      case "task":
        return { ...s, tasks: apply(s.tasks as never) as State["tasks"] };
      case "invoice":
        return { ...s, invoices: apply(s.invoices as never) as State["invoices"] };
      default:
        return s;
    }
  };
}

export function RecordActions({
  kind,
  id,
  title,
  status,
  archived = false,
  onEdit,
  onDelete,
  onDone,
  className,
  tone = "default",
}: Props) {
  const { state, setState, user, log } = useStore();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const table = RECORD_TABLE[kind];
  const target = useMemo(() => previousStage(table, status ?? null), [table, status]);
  const editable = kind !== "dailyReport" || !!onEdit;

  if (!isRecordSupervisor(user)) return null;

  const note = `${TABLE_LABEL[table] ?? table} — ${title}`;

  function record<T extends { id: string }>(list: T[]) {
    return list.find((x) => x.id === id);
  }

  function snapshot(): unknown {
    switch (kind) {
      case "expense":
        return record(state.expenses);
      case "purchase":
        return record(state.purchases);
      case "task":
        return record(state.tasks);
      case "invoice":
        return record(state.invoices);
      case "message":
        return record(state.messages);
      default:
        return undefined;
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      const before = snapshot();
      if (onDelete) await onDelete();
      else setState(removeFromState(kind, id));
      log({
        entity: RECORD_ENTITY[kind],
        recordId: id,
        action: "حذف ثبت (بایگانی)",
        ...(before ? { before } : {}),
        note,
      });
      toast.success("ثبت حذف (بایگانی) شد.");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حذف ناموفق بود.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  async function doRestore() {
    setBusy(true);
    try {
      await restoreArchived(table, id);
      log({ entity: RECORD_ENTITY[kind], recordId: id, action: "بازگردانی ثبت از بایگانی", note });
      toast.success("ثبت بازگردانی شد.");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "بازگردانی ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  /** برگشت مستقیم و بدون واسطه به مرحلهٔ قبل. */
  function doReverse() {
    if (!target || !status) return;
    const before = snapshot();
    setState(setStatusInState(kind, id, target));
    log({
      entity: RECORD_ENTITY[kind],
      recordId: id,
      action: "برگشت به مرحلهٔ قبل",
      ...(before ? { before } : {}),
      after: { status: target },
      note: `${note}: ${statusLabel(status)} ← ${statusLabel(target)}`,
    });
    toast.success(`به مرحلهٔ «${statusLabel(target)}» بازگشت.`);
    onDone?.();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="عملیات روی این ثبت"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={cn(
            "inline-grid size-9 shrink-0 place-items-center rounded-full transition-colors",
            tone === "onHero"
              ? "text-on-hero hover:bg-on-hero/10"
              : "text-muted-foreground hover:bg-muted",
            className,
          )}
        >
          <MoreVertical className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 text-start">
          <DropdownMenuLabel className="text-start text-xs text-muted-foreground">
            عملیات پشتیبان
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            disabled={!editable}
            onSelect={(e) => {
              e.preventDefault();
              if (onEdit) onEdit();
              else setEditOpen(true);
            }}
            className="gap-2 font-bold"
          >
            <Pencil className="size-4" /> اصلاح
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={!target}
            onSelect={(e) => {
              e.preventDefault();
              doReverse();
            }}
            className="gap-2 font-bold"
          >
            <Undo2 className="size-4" />
            {target ? `برگشت به «${statusLabel(target)}»` : "برگشت به مرحله قبل"}
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={!archived}
            onSelect={(e) => {
              e.preventDefault();
              void doRestore();
            }}
            className="gap-2 font-bold"
          >
            <RotateCcw className="size-4" /> بازگردانی
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
            className="gap-2 font-bold text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" /> حذف
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl" className="text-start">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">{DELETE_CONFIRM_TEXT}</AlertDialogTitle>
            <AlertDialogDescription className="text-start">{note}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void doDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent
          side="bottom"
          dir="rtl"
          className="safe-bottom max-h-[92vh] overflow-y-auto rounded-t-3xl"
        >
          <SheetHeader className="text-start">
            <SheetTitle>اصلاح ثبت — {title}</SheetTitle>
          </SheetHeader>
          <RecordEditForm
            kind={kind}
            id={id}
            note={note}
            onClose={() => {
              setEditOpen(false);
              onDone?.();
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
