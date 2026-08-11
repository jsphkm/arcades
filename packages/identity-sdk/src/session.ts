import type { AuthSession } from "./types";

const SKEW_MS = 60_000;

function storage(): Storage | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

function sessionKey(prefix: string): string {
  return `${prefix}.session`;
}

export function accessTokenStale(
  session: AuthSession,
  now = Date.now(),
): boolean {
  return now >= session.expiresAt - SKEW_MS;
}

export function loadSession(prefix: string): AuthSession | null {
  const s = storage();
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
  const s = storage();
  if (!s) return;
  s.setItem(sessionKey(prefix), JSON.stringify(session));
}

export function clearSession(prefix: string): void {
  const s = storage();
  if (!s) return;
  s.removeItem(sessionKey(prefix));
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
