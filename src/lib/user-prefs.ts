import { useCallback, useEffect, useState } from "react";

/** Personal notification preferences, kept per signed-in account. */
export type UserPrefs = {
  push: boolean;
  inApp: boolean;
  sound: boolean;
  vibrate: boolean;
};

export const DEFAULT_USER_PREFS: UserPrefs = {
  push: false,
  inApp: true,
  sound: true,
  vibrate: true,
};

function prefsKey(userId: string) {
  return `dar-rekab-prefs:${userId}`;
}

export function useUserPrefs(userId: string | null) {
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_USER_PREFS);

  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(prefsKey(userId));
      setPrefs(raw ? { ...DEFAULT_USER_PREFS, ...JSON.parse(raw) } : DEFAULT_USER_PREFS);
    } catch {
      setPrefs(DEFAULT_USER_PREFS);
    }
  }, [userId]);

  const update = useCallback(
    (patch: Partial<UserPrefs>) => {
      setPrefs((p) => {
        const next = { ...p, ...patch };
        if (userId) localStorage.setItem(prefsKey(userId), JSON.stringify(next));
        return next;
      });
    },
    [userId],
  );

  return { prefs, update };
}