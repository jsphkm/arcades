import type { AuthSession } from "./types";

const SKEW_MS = 60_000;

function sessionKey(prefix: string): string {
  return `${prefix}.session`;
}

function persistentStorage(): Storage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

const LEGACY_PREFIXES = [
  "arcades.auth",
  "account.auth",
  "admin.dashboard",
] as const;

function readRawSession(store: Storage, prefix: string): string | null {
  return store.getItem(sessionKey(prefix));
}

/**
 * Migrate tab-only sessions (and older per-app key names) into localStorage
 * under the current prefix.
 */
function migrateLegacySessions(prefix: string): void {
  const dest = persistentStorage();
  if (!dest) return;
  const key = sessionKey(prefix);
  if (dest.getItem(key)) {
    // Still drop leftover tab copies of the current key.
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(key);
    }
    return;
  }

  const candidates = [prefix, ...LEGACY_PREFIXES.filter((p) => p !== prefix)];
  for (const fromPrefix of candidates) {
    for (const store of [
      typeof sessionStorage !== "undefined" ? sessionStorage : null,
      dest,
    ]) {
      if (!store) continue;
      const raw = readRawSession(store, fromPrefix);
      if (!raw) continue;
      dest.setItem(key, raw);
      if (store !== dest || fromPrefix !== prefix) {
        store.removeItem(sessionKey(fromPrefix));
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(key);
        sessionStorage.removeItem(sessionKey(fromPrefix));
      }
      return;
    }
  }
}

export function accessTokenStale(
  session: AuthSession,
  now = Date.now(),
): boolean {
  return now >= session.expiresAt - SKEW_MS;
}

export function loadSession(prefix: string): AuthSession | null {
  migrateLegacySessions(prefix);
  const s = persistentStorage();
  if (!s) return null;
  const raw = s.getItem(sessionKey(prefix));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    if (accessTokenStale(parsed) && !parsed.refreshToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(prefix: string, session: AuthSession): void {
  const s = persistentStorage();
  if (!s) return;
  s.setItem(sessionKey(prefix), JSON.stringify(session));
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(sessionKey(prefix));
  }
}

export function clearSession(prefix: string): void {
  const key = sessionKey(prefix);
  persistentStorage()?.removeItem(key);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(key);
  }
}

export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part || typeof atob !== "function") return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
