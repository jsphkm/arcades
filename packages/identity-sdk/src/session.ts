import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthSession } from "./types";

const SKEW_MS = 60_000;

function sessionKey(prefix: string): string {
  return `${prefix}.session`;
}

function nativeKeys(prefix: string) {
  return {
    access: `${prefix}.session.access`,
    id: `${prefix}.session.id`,
    refresh: `${prefix}.session.refresh`,
    meta: `${prefix}.session.meta`,
  };
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

function loadWeb(prefix: string): AuthSession | null {
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

async function loadNative(prefix: string): Promise<AuthSession | null> {
  const k = nativeKeys(prefix);
  const [accessToken, idToken, refreshToken, metaRaw] = await Promise.all([
    SecureStore.getItemAsync(k.access),
    SecureStore.getItemAsync(k.id),
    SecureStore.getItemAsync(k.refresh),
    SecureStore.getItemAsync(k.meta),
  ]);
  if (!accessToken && !refreshToken) return null;
  let meta: { expiresAt: number; email?: string } | null = null;
  if (metaRaw) {
    try {
      meta = JSON.parse(metaRaw) as { expiresAt: number; email?: string };
    } catch {
      meta = null;
    }
  }
  const session: AuthSession = {
    accessToken: accessToken ?? "",
    idToken: idToken ?? undefined,
    refreshToken: refreshToken ?? undefined,
    expiresAt: meta?.expiresAt ?? 0,
    email: meta?.email,
  };
  if (!session.refreshToken && (!session.accessToken || accessTokenStale(session))) {
    return null;
  }
  return session;
}

async function saveNative(prefix: string, session: AuthSession): Promise<void> {
  const k = nativeKeys(prefix);
  const meta = JSON.stringify({
    expiresAt: session.expiresAt,
    email: session.email,
  });
  await Promise.all([
    SecureStore.setItemAsync(k.access, session.accessToken),
    SecureStore.setItemAsync(k.meta, meta),
    session.idToken
      ? SecureStore.setItemAsync(k.id, session.idToken)
      : SecureStore.deleteItemAsync(k.id),
    session.refreshToken
      ? SecureStore.setItemAsync(k.refresh, session.refreshToken)
      : SecureStore.deleteItemAsync(k.refresh),
  ]);
}
async function clearNative(prefix: string): Promise<void> {
  const k = nativeKeys(prefix);
  await Promise.all([
    SecureStore.deleteItemAsync(k.access),
    SecureStore.deleteItemAsync(k.id),
    SecureStore.deleteItemAsync(k.refresh),
    SecureStore.deleteItemAsync(k.meta),
  ]);
}

export async function loadSession(prefix: string): Promise<AuthSession | null> {
  if (Platform.OS === "web") return loadWeb(prefix);
  return loadNative(prefix);
}

export async function saveSession(prefix: string, session: AuthSession): Promise<void> {
  if (Platform.OS === "web") {
    const s = persistentStorage();
    if (!s) return;
    s.setItem(sessionKey(prefix), JSON.stringify(session));
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(sessionKey(prefix));
    }
    return;
  }
  await saveNative(prefix, session);
}

export async function clearSession(prefix: string): Promise<void> {
  if (Platform.OS === "web") {
    const key = sessionKey(prefix);
    persistentStorage()?.removeItem(key);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(key);
    }
    return;
  }
  await clearNative(prefix);
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
