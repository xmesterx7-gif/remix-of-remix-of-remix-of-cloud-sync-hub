/**
 * OWNER first-run creation service.
 *
 * Isolates the auth account / profile / organization / membership creation flow
 * used by the first-run setup screen. Behavior is identical to the previous
 * in-component implementation: same order of writes, same Persian error
 * messages, no extra reads or writes.
 */

import { supabase } from "@/integrations/supabase/client";

import { AUTH_EMAIL_DOMAIN, toAuthPassword, usernameToEmail } from "./auth-shared";

/**
 * Usernames are not email addresses: auth needs a deterministic synthetic
 * address. It MUST match the one the login flow derives (`usernameToEmail`),
 * otherwise the OWNER account cannot sign in after first-run setup.
 */
export const OWNER_EMAIL_DOMAIN = AUTH_EMAIL_DOMAIN;

export const toAuthEmail = (username: string) => usernameToEmail(username);


export type CreateOwnerInput = {
  fullName: string;
  username: string;
  password: string;
};

export type CreateOwnerResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

export interface OwnerSetupService {
  readonly name: string;
  /** Creates the OWNER auth account, profile, first organization and membership. */
  createOwner(input: CreateOwnerInput): Promise<CreateOwnerResult>;
}

export const cloudOwnerSetupService: OwnerSetupService = {
  name: "cloud",
  async createOwner({ fullName, username, password }) {
    const normalizedUsername = username.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: toAuthEmail(username),
      // Same transform the login flow applies, so short passwords still match.
      password: toAuthPassword(password),

      options: {
        data: {
          username: normalizedUsername,
          full_name: fullName,
        },
      },
    });

    if (error) {
      return {
        ok: false,
        message: /already registered|already exists|User already/i.test(error.message)
          ? "این نام کاربری قبلاً ثبت شده است."
          : `ساخت حساب انجام نشد: ${error.message}`,
      };
    }

    const userId = data.user?.id ?? null;
    if (!userId) {
      return { ok: false, message: "حساب ساخته شد اما شناسه کاربر دریافت نشد." };
    }

    // Profile record: only id, full name and username at this step.
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name: fullName,
      username: normalizedUsername,
    });
    if (profileError) {
      return {
        ok: false,
        message: `حساب ساخته شد اما ثبت پروفایل انجام نشد: ${profileError.message}`,
      };
    }

    // First organization record: use the OWNER full name as the initial name.
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: fullName, owner_id: userId })
      .select("id")
      .single();
    if (orgError || !org) {
      return {
        ok: false,
        message: `حساب و پروفایل ساخته شدند اما ثبت سازمان انجام نشد: ${orgError?.message ?? "شناسه سازمان دریافت نشد."}`,
      };
    }

    // OWNER membership: the organization's OWNER role is assigned automatically.
    const { error: memberError } = await supabase.from("organization_members").insert({
      organization_id: org.id,
      user_id: userId,
    });
    if (memberError) {
      return {
        ok: false,
        message: `سازمان ساخته شد اما ثبت عضویت صاحب سیستم انجام نشد: ${memberError.message}`,
      };
    }

    // Final step: mark the system as initialized (one-time, owner-only RPC).
    const { error: initError } = await supabase.rpc("initialize_system");
    if (initError) {
      const alreadyInitialized = /ALREADY_INITIALIZED/i.test(initError.message);
      return {
        ok: false,
        message: alreadyInitialized
          ? "سامانه قبلاً راه‌اندازی شده است."
          : `عضویت ثبت شد اما نهایی‌سازی راه‌اندازی سامانه انجام نشد: ${initError.message}`,
      };
    }

    return { ok: true, userId };
  },
};


let currentService: OwnerSetupService = cloudOwnerSetupService;

/** Swap the implementation later (e.g. a stub for testing). */
export function setOwnerSetupService(service: OwnerSetupService) {
  currentService = service;
}

export function getOwnerSetupService(): OwnerSetupService {
  return currentService;
}
