/**
 * Cloud-backed implementation of `DailyReportService`.
 *
 * Records live in `public.daily_reports`, one row per subject per Tehran
 * business day. Reads exclude archived rows, removal is a soft delete through
 * the manager-only `soft_delete_record` routine, and every change is captured
 * by the database audit trigger.
 */

import { supabase } from "@/integrations/supabase/client";

import type { BusinessDayKey } from "./business-day";
import type {
  DailyReport,
  DailyReportInput,
  DailyReportQuery,
  DailyReportService,
  PerformanceRating,
} from "./types";

type Row = {
  id: string;
  organization_id: string | null;
  subject_id: string;
  business_date: string;
  salary: number | string;
  bonus: number | string;
  penalty: number | string;
  performance: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const amount = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

function fromRow(r: Row): DailyReport {
  return {
    id: r.id,
    ...(r.organization_id ? { organizationId: r.organization_id } : {}),
    subjectId: r.subject_id,
    date: r.business_date as BusinessDayKey,
    salary: amount(r.salary),
    bonus: amount(r.bonus),
    penalty: amount(r.penalty),
    performance: (r.performance ?? null) as PerformanceRating | null,
    notes: r.notes ?? "",
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const listeners = new Set<() => void>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function emit() {
  for (const l of listeners) l();
}

function ensureChannel() {
  if (channel) return;
  channel = supabase
    .channel("daily-reports-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "daily_reports" },
      () => emit(),
    );
  channel.subscribe();
}

export const cloudDailyReportService: DailyReportService = {
  async getDay(subjectId, date) {
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("subject_id", subjectId)
      .eq("business_date", date)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`گزارش روزانه: ${error.message}`);
    return data ? fromRow(data as unknown as Row) : null;
  },

  async listRange({ subjectId, from, to }: DailyReportQuery) {
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("subject_id", subjectId)
      .gte("business_date", from)
      .lte("business_date", to)
      .is("deleted_at", null)
      .order("business_date", { ascending: true });
    if (error) throw new Error(`گزارش روزانه: ${error.message}`);
    return ((data ?? []) as unknown as Row[]).map(fromRow);
  },

  async saveDay(input: DailyReportInput, actorId: string) {
    const existing = await this.getDay(input.subjectId, input.date);
    const payload = {
      subject_id: input.subjectId,
      business_date: input.date,
      salary: amount(input.salary),
      bonus: amount(input.bonus),
      penalty: amount(input.penalty),
      performance: input.performance,
      notes: input.notes.trim(),
      created_by: existing?.createdBy ?? actorId,
    };

    const query = existing
      ? supabase.from("daily_reports").update(payload as never).eq("id", existing.id)
      : supabase.from("daily_reports").insert(payload as never);

    const { data, error } = await query.select("*").single();
    if (error) throw new Error(`ثبت گزارش روزانه: ${error.message}`);
    emit();
    return fromRow(data as unknown as Row);
  },

  async removeDay(subjectId, date) {
    const existing = await this.getDay(subjectId, date);
    if (!existing) return;
    const { error } = await supabase.rpc("soft_delete_record", {
      _table: "daily_reports",
      _id: existing.id,
      _restore: false,
    });
    if (error) throw new Error(`بایگانی گزارش روزانه: ${error.message}`);
    emit();
  },

  subscribe(listener) {
    ensureChannel();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};