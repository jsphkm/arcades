import * as AuthSession from "expo-auth-session";

export type PendingOAuth = {
  codeVerifier: string;
  state: string;
  redirectUri: string;
};

function pkceKey(prefix: string): string {
  return `${prefix}.oauth.pkce`;
}

function usedCodeKey(prefix: string): string {
  return `${prefix}.oauth.usedCode`;
}

function ssoAttemptedKey(prefix: string): string {
  return `${prefix}.sso.attempted`;
}

function ssoSkipKey(prefix: string): string {
  return `${prefix}.sso.skip`;
}

export function defaultRedirectUri(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/`;
  }
  return AuthSession.makeRedirectUri({ path: "/" });
}

export function savePendingOAuth(
  prefix: string,
  pending: PendingOAuth,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(pkceKey(prefix), JSON.stringify(pending));
}

export function takePendingOAuth(prefix: string): PendingOAuth | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(pkceKey(prefix));
  if (!raw) return null;
  sessionStorage.removeItem(pkceKey(prefix));
  try {
    const parsed = JSON.parse(raw) as PendingOAuth;
    if (!parsed.codeVerifier || !parsed.state || !parsed.redirectUri) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function markOAuthCodeUsed(prefix: string, code: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(usedCodeKey(prefix), code);
}

export function wasOAuthCodeUsed(prefix: string, code: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(usedCodeKey(prefix)) === code;
}

/** Soft Cognito errors from prompt=none when there is no Hosted UI session. */
export function isSilentSsoSoftError(error: string | null): boolean {
  if (!error) return false;
  return (
    error === "login_required" ||
    error === "interaction_required" ||
    error === "consent_required" ||
    error === "account_selection_required"
  );
}

function urlHasSsoFlag(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("sso") === "1";
}

/** Drop ?sso=1 after it has been observed (keeps other query params). */
export function clearSsoQueryFlag(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("sso")) return;
  url.searchParams.delete("sso");
  const q = url.searchParams.toString();
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${q ? `?${q}` : ""}${url.hash}`,
  );
}

export function shouldAttemptSilentSso(prefix: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(ssoSkipKey(prefix))) return false;
  // Cross-app handoff (e.g. Arcades → Account) always retries once.
  if (urlHasSsoFlag()) return true;
  if (sessionStorage.getItem(ssoAttemptedKey(prefix))) return false;
  return true;
}

export function markSilentSsoAttempted(prefix: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ssoAttemptedKey(prefix), "1");
  clearSsoQueryFlag();
}

/** After local sign-out, skip silent SSO for this tab so we do not bounce back in. */
export function markSilentSsoSkipped(prefix: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ssoSkipKey(prefix), "1");
  sessionStorage.setItem(ssoAttemptedKey(prefix), "1");
}

export function clearSilentSsoSkip(prefix: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(ssoSkipKey(prefix));
  sessionStorage.removeItem(ssoAttemptedKey(prefix));
}

export function readOAuthCallbackParams(): {
  code: string | null;
  state: string | null;
  error: string | null;
  errorDescription: string | null;
} {
  if (typeof window === "undefined") {
    return { code: null, state: null, error: null, errorDescription: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get("code"),
    state: params.get("state"),
    error: params.get("error"),
    errorDescription: params.get("error_description"),
  };
}

export function clearOAuthQueryFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of ["code", "state", "error", "error_description", "sso"]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  const q = url.searchParams.toString();
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${q ? `?${q}` : ""}${url.hash}`,
  );
}
