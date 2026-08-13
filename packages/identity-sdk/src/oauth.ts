import * as AuthSession from "expo-auth-session";

export type PendingOAuth = {
  codeVerifier: string;
  state: string;
  redirectUri: string;
};

function pkceKey(prefix: string): string {
  return `${prefix}.oauth.pkce`;
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

export function shouldAttemptSilentSso(prefix: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(ssoSkipKey(prefix))) return false;
  if (sessionStorage.getItem(ssoAttemptedKey(prefix))) return false;
  return true;
}

export function markSilentSsoAttempted(prefix: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ssoAttemptedKey(prefix), "1");
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
  if (
    ![...url.searchParams.keys()].some((k) =>
      ["code", "state", "error", "error_description"].includes(k),
    )
  ) {
    return;
  }
  url.search = "";
  window.history.replaceState({}, "", `${url.pathname}${url.hash}`);
}
