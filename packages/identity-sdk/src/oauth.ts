import * as AuthSession from "expo-auth-session";

export type PendingOAuth = {
  codeVerifier: string;
  state: string;
  redirectUri: string;
};

function pkceKey(prefix: string): string {
  return `${prefix}.oauth.pkce`;
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
