/** Shared (browser + server) helpers for the username based login. */

export const AUTH_EMAIL_DOMAIN = "dezz-rekab.app";

/** Synthetic e-mail used behind the scenes for a username account. */
export function usernameToEmail(username: string) {
  const slug = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-");
  return `${slug || "user"}@${AUTH_EMAIL_DOMAIN}`;
}

/**
 * The app allows 4 character passwords while the auth service requires 6,
 * so short passwords get a deterministic suffix. Never shown to the user.
 */
export function toAuthPassword(password: string) {
  const p = password.trim();
  return p.length >= 6 ? p : `${p}::dz`;
}

export function onlyDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}
