import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getInitializationService } from "./init-service";

/**
 * Centralized system initialization state.
 * Frontend foundation only — no OWNER creation, users, tables or permissions yet.
 */
export const INITIALIZATION_STATES = [
  "CHECKING_INITIALIZATION",
  "NOT_INITIALIZED",
  "INITIALIZED",
  "INITIALIZATION_FAILED",
] as const;

export type InitializationState = (typeof INITIALIZATION_STATES)[number];

export type SystemInitContextValue = {
  status: InitializationState;
  error: string | null;
  isChecking: boolean;
  isInitialized: boolean;
  needsInitialization: boolean;
  hasFailed: boolean;
  /** Set the state manually (used by the next implementation steps). */
  setStatus: (status: InitializationState, error?: string | null) => void;
  /**
   * Runs a check routine and maps its result to the state machine.
   * Placeholder for the future server-side initialization check.
   */
  runCheck: (check?: () => Promise<boolean>) => Promise<void>;
  reset: () => void;
};

const SystemInitContext = createContext<SystemInitContextValue | null>(null);

export function SystemInitProvider({
  children,
  initialStatus = "CHECKING_INITIALIZATION",
}: {
  children: ReactNode;
  initialStatus?: InitializationState;
}) {
  const [status, setStatusState] = useState<InitializationState>(initialStatus);
  const [error, setError] = useState<string | null>(null);

  const setStatus = useCallback((next: InitializationState, nextError: string | null = null) => {
    setStatusState(next);
    setError(next === "INITIALIZATION_FAILED" ? nextError : null);
  }, []);

  const runCheck = useCallback(
    async (check?: () => Promise<boolean>) => {
      setStatus("CHECKING_INITIALIZATION");
      try {
        const initialized = check
          ? await check()
          : (await getInitializationService().checkInitialization()).initialized;
        setStatus(initialized ? "INITIALIZED" : "NOT_INITIALIZED");
      } catch (e) {
        setStatus("INITIALIZATION_FAILED", e instanceof Error ? e.message : "خطای نامشخص");
      }
    },
    [setStatus],
  );

  const reset = useCallback(() => setStatus("CHECKING_INITIALIZATION"), [setStatus]);

  const value = useMemo<SystemInitContextValue>(
    () => ({
      status,
      error,
      isChecking: status === "CHECKING_INITIALIZATION",
      isInitialized: status === "INITIALIZED",
      needsInitialization: status === "NOT_INITIALIZED",
      hasFailed: status === "INITIALIZATION_FAILED",
      setStatus,
      runCheck,
      reset,
    }),
    [status, error, setStatus, runCheck, reset],
  );

  return <SystemInitContext.Provider value={value}>{children}</SystemInitContext.Provider>;
}

export function useSystemInit(): SystemInitContextValue {
  const ctx = useContext(SystemInitContext);
  if (!ctx) throw new Error("useSystemInit must be used inside SystemInitProvider");
  return ctx;
}
