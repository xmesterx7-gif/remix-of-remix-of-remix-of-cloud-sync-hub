/**
 * Single reusable initialization service interface.
 * The default implementation is backed by the `public.system_initialization` table.
 */

import { readSystemInitialization } from "./init.functions";

export type InitializationStatus = {
  /** Whether the system has already been initialized (OWNER exists, etc.). */
  initialized: boolean;
  /** Optional details for diagnostics / future backend payloads. */
  details?: Record<string, unknown>;
};

export type InitializationPayload = {
  [key: string]: unknown;
};

export interface InitializationService {
  /** Unique name of the implementation (e.g. "local-stub", "cloud"). */
  readonly name: string;
  /** Reads current initialization status. */
  checkInitialization(signal?: AbortSignal): Promise<InitializationStatus>;
  /** Performs the initialization. Not implemented until backend is connected. */
  initialize(payload?: InitializationPayload, signal?: AbortSignal): Promise<InitializationStatus>;
}

export class InitializationNotImplementedError extends Error {
  constructor(action: string) {
    super(`سرویس راه‌اندازی هنوز به بک‌اند متصل نشده است (${action}).`);
    this.name = "InitializationNotImplementedError";
  }
}

/** Backend-backed implementation: reads `is_initialized` from `public.system_initialization`. */
export const cloudInitializationService: InitializationService = {
  name: "cloud",
  async checkInitialization() {
    // Unexpected errors propagate so the state machine can report INITIALIZATION_FAILED.
    // A missing table / missing row resolves to NOT_INITIALIZED inside the server function.
    return await readSystemInitialization();
  },
  async initialize() {
    // One-time, owner-only RPC. RLS/grants restrict it to the signed-in OWNER.
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.rpc("initialize_system");
    if (error) {
      throw new Error(
        /ALREADY_INITIALIZED/i.test(error.message)
          ? "سامانه قبلاً راه‌اندازی شده است."
          : `نهایی‌سازی راه‌اندازی سامانه انجام نشد: ${error.message}`,
      );
    }
    return {
      initialized: Boolean(data?.is_initialized),
      details: { source: "cloud" },
    };
  },
};





/** Fallback no-backend implementation: always reports "not initialized". */
export const localStubInitializationService: InitializationService = {
  name: "local-stub",
  async checkInitialization() {
    return { initialized: false, details: { source: "local-stub" } };
  },
  async initialize() {
    throw new InitializationNotImplementedError("initialize");
  },
};

let currentService: InitializationService = cloudInitializationService;

/** Swap the implementation later (e.g. back to local stub for testing). */
export function setInitializationService(service: InitializationService) {
  currentService = service;
}

export function getInitializationService(): InitializationService {
  return currentService;
}
