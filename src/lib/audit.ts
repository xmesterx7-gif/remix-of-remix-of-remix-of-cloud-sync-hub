/**
 * Read-only access to the immutable database audit history, plus the
 * OWNER/manager controls that act on it: restoring an archived record and
 * reversing a record to its previous workflow stage.
 *
 * History itself is never written from here: `public.audit_log` is filled by
 * database triggers and blocked against UPDATE/DELETE.
 */

import { supabase } from "@/integrations/supabase/client";
import { restoreRecord } from "@/lib/db";

export type AuditRow = {
  id: number;
  tableName: string;
  recordId: string;
  operation: "INSERT" | "UPDATE" | "DELETE" | string;
  actorId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  /** Tehran business date the change belongs to. */
  businessDate: string;
  createdAt: string;
};

/** Tables that keep business history and can be archived / restored. */
export const AUDITED_TABLES = [
  "bicycle_purchases",
  "expenses",
  "tasks",
  "purchase_invoices",
  "daily_reports",
  "messages",
  "profiles",
  "user_roles",
] as const;

export type AuditedTable = (typeof AUDITED_TABLES)[number];

export const TABLE_LABEL: Record<string, string> = {
  bicycle_purchases: "خرید دوچرخه",
  expenses: "هزینه‌ها",
  tasks: "وظایف",
  purchase_invoices: "فاکتورهای خرید",
  invoice_items: "اقلام فاکتور",
  daily_reports: "گزارش روزانه",
  messages: "پیام‌ها",
  profiles: "کاربران",
  user_roles: "نقش‌ها",
  organization_members: "اعضای مجموعه",
};

export const OPERATION_LABEL: Record<string, string> = {
  INSERT: "ایجاد",
  UPDATE: "ویرایش",
  DELETE: "حذف",
};

/** Tables whose archived rows the manager-only routine can restore. */
export const RESTORABLE_TABLES = [
  "bicycle_purchases",
  "expenses",
  "tasks",
  "purchase_invoices",
  "daily_reports",
  "messages",
] as const;

export type RestorableTable = (typeof RESTORABLE_TABLES)[number];

/** Ordered workflow stages per table; reversal moves one step back. */
export const WORKFLOW_STAGES: Record<string, string[]> = {
  bicycle_purchases: ["PENDING", "APPROVED", "SYNCED_TO_ACCOUNTING"],
  expenses: ["PENDING", "APPROVED", "SYNCED_TO_ACCOUNTING"],
  tasks: ["PENDING", "IN_PROGRESS", "SUBMITTED", "APPROVED", "SYNCED_TO_ACCOUNTING"],
  purchase_invoices: [
    "PRE_INVOICE",
    "PURCHASED",
    "PENDING_FINAL",
    "FINALIZED",
    "SYNCED_TO_ACCOUNTING",
  ],
};

export function previousStage(table: string, status: string | null | undefined) {
  const stages = WORKFLOW_STAGES[table];
  if (!stages || !status) return null;
  const index = stages.indexOf(status);
  if (index <= 0) return null;
  return stages[index - 1] ?? null;
}

function auditFromRow(r: Record<string, unknown>): AuditRow {
  return {
    id: Number(r['id']),
    tableName: String(r['table_name'] ?? ""),
    recordId: String(r['record_id'] ?? ""),
    operation: String(r['operation'] ?? ""),
    actorId: (r['actor_id'] as string | null) ?? null,
    before: (r['before_data'] as Record<string, unknown> | null) ?? null,
    after: (r['after_data'] as Record<string, unknown> | null) ?? null,
    businessDate: String(r['business_date'] ?? ""),
    createdAt: String(r['created_at'] ?? ""),
  };
}

/** Latest audit lines, newest first. Managers/OWNER only (enforced by RLS). */
export async function fetchAuditHistory(options?: {
  table?: string;
  recordId?: string;
  limit?: number;
}): Promise<AuditRow[]> {
  let query = supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 200);
  if (options?.table) query = query.eq("table_name", options.table);
  if (options?.recordId) query = query.eq("record_id", options.recordId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(auditFromRow);
}

export type ArchivedRow = {
  table: RestorableTable;
  id: string;
  title: string;
  status: string | null;
  deletedAt: string;
  deletedBy: string | null;
};

const ARCHIVE_SELECT: Record<RestorableTable, { columns: string; title: (r: Record<string, unknown>) => string }> = {
  bicycle_purchases: {
    columns: "id, brand, color, status, deleted_at, deleted_by",
    title: (r) => [r['brand'], r['color']].filter(Boolean).join(" ") || "دوچرخه",
  },
  expenses: {
    columns: "id, name, category, amount, status, deleted_at, deleted_by",
    title: (r) => String(r['name'] ?? r['category'] ?? "هزینه"),
  },
  tasks: {
    columns: "id, title, status, deleted_at, deleted_by",
    title: (r) => String(r['title'] ?? "وظیفه"),
  },
  purchase_invoices: {
    columns: "id, invoice_number, supplier, status, deleted_at, deleted_by",
    title: (r) => `${r['invoice_number'] ?? ""} — ${r['supplier'] ?? ""}`.trim(),
  },
  daily_reports: {
    columns: "id, business_date, deleted_at, deleted_by",
    title: (r) => `گزارش ${r['business_date'] ?? ""}`,
  },
  messages: {
    columns: "id, text, deleted_at, deleted_by",
    title: (r) => String(r['text'] ?? "پیام").slice(0, 60) || "پیام",
  },
};

/** Every archived (soft-deleted) business record the viewer may see. */
export async function fetchArchived(): Promise<ArchivedRow[]> {
  const results = await Promise.all(
    RESTORABLE_TABLES.map(async (table) => {
      const spec = ARCHIVE_SELECT[table];
      const { data, error } = await supabase
        .from(table)
        .select(spec.columns)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })
        .limit(100);
      if (error) return [] as ArchivedRow[];
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        table,
        id: String(r['id']),
        title: spec.title(r),
        status: (r['status'] as string | null) ?? null,
        deletedAt: String(r['deleted_at'] ?? ""),
        deletedBy: (r['deleted_by'] as string | null) ?? null,
      }));
    }),
  );
  return results
    .flat()
    .sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
}

/** Restores an archived record. Manager/OWNER only (enforced in the database). */
export async function restoreArchived(table: RestorableTable, id: string) {
  await restoreRecord(table, id);
}
