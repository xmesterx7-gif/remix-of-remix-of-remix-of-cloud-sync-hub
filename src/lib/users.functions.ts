import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { onlyDigits, toAuthPassword, usernameToEmail } from "./auth-shared";

export type Role =
  | "ADMIN"
  | "GENERAL_MANAGER"
  | "STORE_MANAGER"
  | "ACCOUNTANT"
  | "EMPLOYEE"
  | "SENIOR_SELLER"
  | "MECHANIC"
  | "VIEWER";

export type SaveUserInput = {
  id?: string;
  fullName: string;
  username: string;
  phone: string;
  title: string;
  role: Role;
  isWorker: boolean;
  isActive: boolean;
  isArchived?: boolean;
  /** Custom role label defined by the main admin (display only). */
  customRole?: string;
  /** Optional free-form notes about the person. */
  bio?: string;
  permissions: Record<string, boolean>;
  password?: string;
};


/**
 * Public: turns a username or phone number into the internal login e-mail.
 * Only returns whether an active account exists; no user data is exposed.
 */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { identifier: string }) => data)
  .handler(async ({ data }) => {
    const identifier = data.identifier.trim().toLowerCase();
    const digits = onlyDigits(data.identifier);

    type ProfileRow = { username: string; phone: string | null; is_active: boolean | null; is_archived: boolean | null };
    let rows: ProfileRow[] | null = null;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const res = await supabaseAdmin
        .from("profiles")
        .select("username, phone, is_active, is_archived");
      rows = (res.data ?? null) as ProfileRow[] | null;
    } catch {
      // Elevated profile lookup unavailable (no service key configured):
      // fall back to the deterministic username -> e-mail mapping below.
      rows = null;
    }

    if (!rows) {
      if (!identifier || identifier === digits) return { email: null as string | null, active: false };
      return { email: usernameToEmail(identifier), active: true };
    }

    const found = rows.find(
      (r) =>
        r.username.trim().toLowerCase() === identifier ||
        (!!digits && onlyDigits(r.phone ?? "") === digits),
    );
    if (!found) return { email: null as string | null, active: false };
    return {
      email: usernameToEmail(found.username),
      active: !!found.is_active && !found.is_archived,
    };

  });


/** Public: creates the very first admin account, only while no user exists. */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { fullName: string; username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("حساب مدیر از قبل ساخته شده است.");
    const email = usernameToEmail(data.username);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: toAuthPassword(data.password),
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "ساخت حساب ناموفق بود.");
    await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      full_name: data.fullName || data.username,
      username: data.username.trim(),
      title: "پشتیبان",
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "ADMIN" });
    return { email };
  });

/** OWNER only: creates or updates a team member (profile, position, password). */
export const saveTeamUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SaveUserInput) => data)
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("is_org_owner", {
      _user_id: context.userId,
    });
    if (!allowed) throw new Error("فقط پشتیبان می‌تواند کاربران و دسترسی‌ها را مدیریت کند.");
    const isSelf = !!data.id && data.id === context.userId;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profile = {
      full_name: data.fullName.trim(),
      username: data.username.trim(),
      phone: data.phone.trim(),
      title: data.title.trim(),
      is_worker: data.isWorker,
      is_active: data.isActive,
      is_archived: !!data.isArchived,
      custom_role: data.customRole?.trim() || null,
      bio: data.bio?.trim() ?? "",
      permissions: data.permissions ?? {},
    };

    if (data.id) {
      // Nobody can raise their own position, permissions or account status —
      // those fields are dropped for a self-edit and the existing row wins.
      const writable = isSelf
        ? {
            full_name: profile.full_name,
            username: profile.username,
            phone: profile.phone,
            bio: profile.bio,
          }
        : profile;
      const { error } = await supabaseAdmin.from("profiles").update(writable).eq("id", data.id);
      if (error) throw new Error(error.message);
      if (!isSelf) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
        await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });
      }
      const updates: { password?: string; email?: string } = {
        email: usernameToEmail(profile.username),
      };
      if (data.password?.trim()) updates.password = toAuthPassword(data.password);
      await supabaseAdmin.auth.admin.updateUserById(data.id, updates);
      return { id: data.id };
    }


    if (!data.password?.trim()) throw new Error("رمز عبور برای کاربر جدید لازم است.");
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(profile.username),
      password: toAuthPassword(data.password),
      email_confirm: true,
    });
    if (authError || !created.user) throw new Error(authError?.message ?? "ساخت کاربر ناموفق بود.");
    const { error } = await supabaseAdmin
      .from("profiles")
      .insert({ id: created.user.id, ...profile });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    return { id: created.user.id };
  });
