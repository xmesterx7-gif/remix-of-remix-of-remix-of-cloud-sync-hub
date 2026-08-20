/**
 * Personal (per-user) settings architecture.
 *
 * Single typed model + swappable service for the three personal areas already
 * present in the /account UI: profile, theme (appearance) and notification
 * preferences. No UI, route, auth, role or report behavior is changed here and
 * no new database tables are introduced.
 *
 * Storage split of the default implementation:
 * - profile        -> existing `public.profiles` row of the signed-in user (RLS: own row only)
 * - theme + notifs -> per-user local storage key, until dedicated columns exist
 *
 * Every read/write is scoped to one authenticated user id, so settings stay
 * isolated per account. Swap `setPersonalSettingsService` to move theme and
 * notification storage to the backend later without touching callers.
 */

import { supabase } from "@/integrations/supabase/client";

import { DEFAULT_USER_PREFS, type UserPrefs } from "./user-prefs";

/** Appearance preference. Mirrors the values the existing store already uses. */
export type ThemePreference = "light" | "dark";

/** Editable personal profile fields (identity fields such as username stay read-only here). */
export type PersonalProfile = {
  fullName: string;
  phone: string;
  title: string;
};

/** Personal notification preferences (same shape the account UI already renders). */
export type NotificationPreferences = UserPrefs;

/** Full personal settings model for one authenticated user. */
export type PersonalSettings = {
  userId: string;
  profile: PersonalProfile;
  theme: ThemePreference;
  notifications: NotificationPreferences;
};

export const DEFAULT_PERSONAL_PROFILE: PersonalProfile = {
  fullName: "",
  phone: "",
  title: "",
};

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = DEFAULT_USER_PREFS;

export function defaultPersonalSettings(userId: string): PersonalSettings {
  return {
    userId,
    profile: { ...DEFAULT_PERSONAL_PROFILE },
    theme: DEFAULT_THEME_PREFERENCE,
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  };
}

export type PersonalSettingsResult<T> = { ok: true; value: T } | { ok: false; message: string };

export interface PersonalSettingsService {
  readonly name: string;
  /** Reads every personal setting of one authenticated user. */
  read(userId: string): Promise<PersonalSettingsResult<PersonalSettings>>;
  updateProfile(
    userId: string,
    patch: Partial<PersonalProfile>,
  ): Promise<PersonalSettingsResult<PersonalProfile>>;
  updateTheme(
    userId: string,
    theme: ThemePreference,
  ): Promise<PersonalSettingsResult<ThemePreference>>;
  updateNotifications(
    userId: string,
    patch: Partial<NotificationPreferences>,
  ): Promise<PersonalSettingsResult<NotificationPreferences>>;
}

/* ------------------------------------------------------------------ */
/* Local, per-user storage for the not-yet-persisted parts             */
/* ------------------------------------------------------------------ */

const LOCAL_PREFIX = "dar-rekab-personal-settings";

type LocalPart = { theme: ThemePreference; notifications: NotificationPreferences };

function localKey(userId: string) {
  return `${LOCAL_PREFIX}:${userId}`;
}

function readLocalPart(userId: string): LocalPart {
  const fallback: LocalPart = {
    theme: DEFAULT_THEME_PREFERENCE,
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(localKey(userId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LocalPart>;
    return {
      theme: parsed.theme === "dark" ? "dark" : "light",
      notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(parsed.notifications ?? {}) },
    };
  } catch {
    return fallback;
  }
}

function writeLocalPart(userId: string, part: LocalPart) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(localKey(userId), JSON.stringify(part));
  } catch {
    /* storage unavailable — settings stay in-memory for this session */
  }
}

/* ------------------------------------------------------------------ */
/* Default implementation                                              */
/* ------------------------------------------------------------------ */

export const cloudPersonalSettingsService: PersonalSettingsService = {
  name: "cloud",

  async read(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, title")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return { ok: false, message: `خواندن تنظیمات شخصی انجام نشد: ${error.message}` };
    }

    const local = readLocalPart(userId);
    return {
      ok: true,
      value: {
        userId,
        profile: {
          fullName: data?.full_name ?? DEFAULT_PERSONAL_PROFILE.fullName,
          phone: data?.phone ?? DEFAULT_PERSONAL_PROFILE.phone,
          title: data?.title ?? DEFAULT_PERSONAL_PROFILE.title,
        },
        theme: local.theme,
        notifications: local.notifications,
      },
    };
  },

  async updateProfile(userId, patch) {
    const current = await this.read(userId);
    if (!current.ok) return current;

    const next: PersonalProfile = { ...current.value.profile, ...patch };
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: next.fullName, phone: next.phone, title: next.title })
      .eq("id", userId);

    if (error) {
      return { ok: false, message: `ذخیره پروفایل انجام نشد: ${error.message}` };
    }
    return { ok: true, value: next };
  },

  async updateTheme(userId, theme) {
    const local = readLocalPart(userId);
    writeLocalPart(userId, { ...local, theme });
    return { ok: true, value: theme };
  },

  async updateNotifications(userId, patch) {
    const local = readLocalPart(userId);
    const notifications: NotificationPreferences = { ...local.notifications, ...patch };
    writeLocalPart(userId, { ...local, notifications });
    return { ok: true, value: notifications };
  },
};

/** Backend-free implementation, useful for tests and offline fallbacks. */
export const localPersonalSettingsService: PersonalSettingsService = {
  name: "local",

  async read(userId) {
    const local = readLocalPart(userId);
    return {
      ok: true,
      value: { ...defaultPersonalSettings(userId), theme: local.theme, notifications: local.notifications },
    };
  },

  async updateProfile(_userId, patch) {
    // No backend in this implementation: profile edits are echoed back only.
    return { ok: true, value: { ...DEFAULT_PERSONAL_PROFILE, ...patch } };
  },

  async updateTheme(userId, theme) {
    const local = readLocalPart(userId);
    writeLocalPart(userId, { ...local, theme });
    return { ok: true, value: theme };
  },

  async updateNotifications(userId, patch) {
    const local = readLocalPart(userId);
    const notifications: NotificationPreferences = { ...local.notifications, ...patch };
    writeLocalPart(userId, { ...local, notifications });
    return { ok: true, value: notifications };
  },
};

let currentService: PersonalSettingsService = cloudPersonalSettingsService;

/** Swap the implementation later (e.g. fully backend-backed, or a test stub). */
export function setPersonalSettingsService(service: PersonalSettingsService) {
  currentService = service;
}

export function getPersonalSettingsService(): PersonalSettingsService {
  return currentService;
}
