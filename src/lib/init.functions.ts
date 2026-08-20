import { createServerFn } from "@tanstack/react-start";
import { getBackendConfig } from "./backend-config";
import type { Database } from "@/integrations/supabase/types";

/**
 * Public server function: reads the single `system_initialization` row.
 * No authentication required — the table has a public SELECT policy.
 */
export const readSystemInitialization = createServerFn({ method: "GET" })
  .handler(async () => {
    const config = getBackendConfig();
    if (!config.isConfigured) {
      throw new Error("تنظیمات بک‌اند هنوز پیکربندی نشده است.");
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient<Database>(
      config.backendUrl,
      config.publicApiKey,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data, error } = await supabase
      .from("system_initialization")
      .select("is_initialized, initialized_at")
      .maybeSingle();

    if (error) {
      // Missing table (fresh install) counts as "not initialized", not a failure.
      const missingTable =
        error.code === "42P01" ||
        error.code === "PGRST205" ||
        /does not exist|could not find the table/i.test(error.message ?? "");
      if (missingTable) {
        return { initialized: false, details: { source: config.source, missingTable: true } };
      }
      throw new Error(`خطا در خواندن وضعیت راه‌اندازی: ${error.message}`);
    }

    // A valid initialization row must exist and be flagged as initialized.
    const initialized = Boolean(data && data.is_initialized);

    return {
      initialized,
      details: { source: config.source, hasRow: Boolean(data) },
    };
  });

