import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import {
  clearOAuthQueryFromUrl,
  clearSilentSsoSkip,
  defaultRedirectUri,
  isSilentSsoSoftError,
  markSilentSsoAttempted,
  markSilentSsoSkipped,
  readOAuthCallbackParams,
  savePendingOAuth,
  shouldAttemptSilentSso,
  takePendingOAuth,
} from "./oauth";
import {
  accessTokenStale,
  clearSession,
  decodeJwtPayload,
  loadSession,
  saveSession,
} from "./session";
import type {
  AuthSession as StoredSession,
  IdentityAuthConfig,
  IdentityAuthValue,
} from "./types";

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext<IdentityAuthValue | null>(null);

let oauthReturnInFlight: Promise<StoredSession | null> | null = null;
let oauthReturnResult: {
  session: StoredSession | null;
  error: string | null;
} | null = null;

function trimSlash(v: string): string {
  return v.replace(/\/$/, "");
}

function sessionFromTokenResponse(
  token: AuthSession.TokenResponse,
  prev?: StoredSession | null,
): StoredSession {
  const expiresIn = token.expiresIn ?? 3600;
  const payload = token.accessToken
    ? decodeJwtPayload(token.accessToken)
    : null;
  const idPayload = token.idToken ? decodeJwtPayload(token.idToken) : null;
  const email =
    (typeof idPayload?.email === "string" && idPayload.email) ||
    (typeof payload?.username === "string" && payload.username) ||
    prev?.email;

  return {
    accessToken: token.accessToken!,
    idToken: token.idToken ?? prev?.idToken,
    refreshToken: token.refreshToken ?? prev?.refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    email,
  };
}

function discoveryFromDomain(domain: string) {
  const d = trimSlash(domain);
  return {
    authorizationEndpoint: `${d}/oauth2/authorize`,
    tokenEndpoint: `${d}/oauth2/token`,
    revocationEndpoint: `${d}/oauth2/revoke`,
    endSessionEndpoint: `${d}/logout`,
  };
}

function cognitoRegionFromDomain(domain: string): string | null {
  const m = trimSlash(domain).match(
    /\.auth\.([a-z0-9-]+)\.amazoncognito\.com$/i,
  );
  return m?.[1] ?? null;
}

/** Best-effort: invalidate all refresh tokens for this user (may fail CORS). */
async function tryGlobalSignOut(
  accessToken: string,
  cognitoDomain: string,
): Promise<void> {
  const region = cognitoRegionFromDomain(cognitoDomain);
  if (!region) return;
  try {
    await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.GlobalSignOut",
      },
      body: JSON.stringify({ AccessToken: accessToken }),
    });
  } catch {
    // ignore — Hosted UI /logout still clears the shared cookie
  }
}

async function completeWebOAuthReturn(opts: {
  prefix: string;
  config: IdentityAuthConfig;
}): Promise<{ session: StoredSession | null; error: string | null }> {
  const { prefix, config } = opts;

  if (Platform.OS !== "web" || typeof window === "undefined") {
    return { session: null, error: null };
  }

  if (oauthReturnResult) return oauthReturnResult;
  if (oauthReturnInFlight) {
    await oauthReturnInFlight;
    return oauthReturnResult ?? { session: null, error: "Sign-in failed" };
  }

  const { code, state, error, errorDescription } = readOAuthCallbackParams();
  if (!code && !error) {
    return { session: null, error: null };
  }

  clearOAuthQueryFromUrl();

  if (error) {
    takePendingOAuth(prefix);
    if (isSilentSsoSoftError(error)) {
      oauthReturnResult = { session: null, error: null };
      return oauthReturnResult;
    }
    oauthReturnResult = {
      session: null,
      error: errorDescription || error || "Sign-in was denied",
    };
    return oauthReturnResult;
  }

  const pending = takePendingOAuth(prefix);
  const authCode = code!;

  oauthReturnInFlight = (async () => {
    try {
      if (!pending) {
        throw new Error("Sign-in session expired. Start again from Sign in.");
      }
      if (state && state !== pending.state) {
        throw new Error("Sign-in state mismatch. Try again.");
      }

      const token = await AuthSession.exchangeCodeAsync(
        {
          clientId: config.clientId,
          code: authCode,
          redirectUri: pending.redirectUri,
          extraParams: { code_verifier: pending.codeVerifier },
        },
        discoveryFromDomain(config.cognitoDomain),
      );

      if (!token.accessToken) {
        throw new Error("Token exchange returned no access token");
      }

      const next = sessionFromTokenResponse(token, null);
      saveSession(prefix, next);
      clearSilentSsoSkip(prefix);
      oauthReturnResult = { session: next, error: null };
      return next;
    } catch (e) {
      oauthReturnResult = {
        session: null,
        error: e instanceof Error ? e.message : "Sign-in failed",
      };
      return null;
    } finally {
      oauthReturnInFlight = null;
    }
  })();

  await oauthReturnInFlight;
  return oauthReturnResult ?? { session: null, error: "Sign-in failed" };
}

export type IdentityAuthProviderProps = {
  config?: IdentityAuthConfig;
  prepare?: () => Promise<IdentityAuthConfig>;
  children: React.ReactNode;
};

export function IdentityAuthProvider({
  config: staticConfig,
  prepare,
  children,
}: IdentityAuthProviderProps) {
  const [resolved, setResolved] = useState<IdentityAuthConfig | null>(
    staticConfig ?? null,
  );
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);
  const [configOk, setConfigOk] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [silentSsoPending, setSilentSsoPending] = useState(false);
  const sessionRef = useRef<StoredSession | null>(null);
  const refreshPromise = useRef<Promise<string | null> | null>(null);
  const resolvedRef = useRef<IdentityAuthConfig | null>(resolved);
  const silentRedirectStarted = useRef(false);

  const prefix = resolved?.storageKeyPrefix ?? "identity.auth";
  const getRedirectUri = resolved?.redirectUri ?? defaultRedirectUri;
  const scopes = resolved?.scopes ?? ["openid", "email", "profile"];

  useEffect(() => {
    resolvedRef.current = resolved;
  }, [resolved]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let next = staticConfig ?? null;
        if (prepare) {
          next = await prepare();
        }
        if (cancelled) return;
        if (!next?.clientId || !next?.cognitoDomain) {
          setAuthError("Identity auth config is incomplete");
          setConfigOk(false);
          setReady(true);
          return;
        }

        setResolved(next);
        resolvedRef.current = next;
        setConfigOk(true);

        const storagePrefix = next.storageKeyPrefix ?? "identity.auth";
        const { session: fromOAuth, error } = await completeWebOAuthReturn({
          prefix: storagePrefix,
          config: next,
        });
        if (cancelled) return;

        if (error) setAuthError(error);

        if (fromOAuth) {
          sessionRef.current = fromOAuth;
          setSession(fromOAuth);
          setReady(true);
          next.onSignedIn?.();
          return;
        }

        const existing = loadSession(storagePrefix);
        if (existing) {
          sessionRef.current = existing;
          setSession(existing);
          setReady(true);
          return;
        }

        if (
          Platform.OS === "web" &&
          shouldAttemptSilentSso(storagePrefix)
        ) {
          setSilentSsoPending(true);
          return;
        }

        setReady(true);
      } catch (e) {
        if (cancelled) return;
        setAuthError(e instanceof Error ? e.message : "Auth bootstrap failed");
        setConfigOk(false);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const discovery = useMemo(() => {
    if (!configOk || !resolved) return null;
    return discoveryFromDomain(resolved.cognitoDomain);
  }, [configOk, resolved]);

  const expireSession = useCallback(() => {
    clearSession(prefix);
    sessionRef.current = null;
    setSession(null);
  }, [prefix]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const cfg = resolvedRef.current;
    if (!configOk || !discovery || !cfg) return null;
    const current = sessionRef.current;
    if (!current?.refreshToken) {
      expireSession();
      return null;
    }

    try {
      const token = await AuthSession.refreshAsync(
        {
          clientId: cfg.clientId,
          refreshToken: current.refreshToken,
        },
        discovery,
      );
      if (!token.accessToken) {
        expireSession();
        return null;
      }
      const next = sessionFromTokenResponse(token, current);
      saveSession(prefix, next);
      sessionRef.current = next;
      setSession(next);
      return next.accessToken;
    } catch {
      expireSession();
      return null;
    }
  }, [configOk, discovery, expireSession, prefix]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const current = sessionRef.current;
    if (!current) return null;
    if (!accessTokenStale(current)) return current.accessToken;

    if (!refreshPromise.current) {
      refreshPromise.current = refreshAccessToken().finally(() => {
        refreshPromise.current = null;
      });
    }
    return refreshPromise.current;
  }, [refreshAccessToken]);

  useEffect(() => {
    if (!session?.refreshToken) return;
    const ms = session.expiresAt - Date.now() - 60_000;
    if (ms <= 0) {
      void getAccessToken();
      return;
    }
    const id = setTimeout(() => {
      void getAccessToken();
    }, ms);
    return () => clearTimeout(id);
  }, [session?.expiresAt, session?.refreshToken, getAccessToken]);

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: configOk && resolved ? resolved.clientId : "pending",
      redirectUri: getRedirectUri(),
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      scopes,
    },
    discovery,
  );

  // Cognito Hosted UI SSO: when another app already logged the user in,
  // prompt=none exchanges the shared cookie for tokens on this origin.
  useEffect(() => {
    if (!silentSsoPending || !configOk || !discovery || !request) return;
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setSilentSsoPending(false);
      setReady(true);
      return;
    }
    if (silentRedirectStarted.current) return;
    if (!request.codeVerifier || !request.state) return;

    silentRedirectStarted.current = true;
    markSilentSsoAttempted(prefix);

    (async () => {
      try {
        const url = await request.makeAuthUrlAsync(discovery);
        const silentUrl = /[?&]prompt=/.test(url)
          ? url.replace(/([?&])prompt=[^&]*/i, "$1prompt=none")
          : `${url}&prompt=none`;
        savePendingOAuth(prefix, {
          codeVerifier: request.codeVerifier!,
          state: request.state!,
          redirectUri: getRedirectUri(),
        });
        window.location.assign(silentUrl);
      } catch {
        setSilentSsoPending(false);
        setReady(true);
      }
    })();
  }, [
    silentSsoPending,
    configOk,
    discovery,
    request,
    prefix,
    getRedirectUri,
  ]);

  useEffect(() => {
    if (!silentSsoPending) return;
    const id = setTimeout(() => {
      if (silentRedirectStarted.current) return;
      setSilentSsoPending(false);
      setReady(true);
    }, 8_000);
    return () => clearTimeout(id);
  }, [silentSsoPending]);

  const signIn = useCallback(async () => {
    const cfg = resolvedRef.current;
    if (!configOk || !discovery || !request || !cfg) {
      throw new Error("Auth config not ready");
    }

    clearSilentSsoSkip(prefix);

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const url = await request.makeAuthUrlAsync(discovery);
      if (!request.codeVerifier || !request.state) {
        throw new Error("PKCE not ready");
      }
      savePendingOAuth(prefix, {
        codeVerifier: request.codeVerifier,
        state: request.state,
        redirectUri: getRedirectUri(),
      });
      window.location.assign(url);
      return;
    }

    const result = await promptAsync();
    if (result.type !== "success" || !result.params.code) {
      if (result.type === "error") {
        throw new Error(result.error?.message ?? "Sign-in failed");
      }
      return;
    }

    const token = await AuthSession.exchangeCodeAsync(
      {
        clientId: cfg.clientId,
        code: result.params.code,
        redirectUri: getRedirectUri(),
        extraParams: { code_verifier: request.codeVerifier ?? "" },
      },
      discovery,
    );

    const next = sessionFromTokenResponse(token, null);
    saveSession(prefix, next);
    sessionRef.current = next;
    setSession(next);
  }, [configOk, discovery, getRedirectUri, prefix, promptAsync, request]);

  const signOut = useCallback(async () => {
    const cfg = resolvedRef.current;
    const current = sessionRef.current;
    markSilentSsoSkipped(prefix);

    if (configOk && discovery && cfg && current?.refreshToken) {
      try {
        await AuthSession.revokeAsync(
          {
            clientId: cfg.clientId,
            token: current.refreshToken,
          },
          discovery,
        );
      } catch {
        // continue with logout redirect
      }
    }

    if (cfg && current?.accessToken) {
      await tryGlobalSignOut(current.accessToken, cfg.cognitoDomain);
    }

    expireSession();
    if (!configOk || !cfg || typeof window === "undefined") return;
    const domain = trimSlash(cfg.cognitoDomain);
    const logoutUrl =
      `${domain}/logout` +
      `?client_id=${encodeURIComponent(cfg.clientId)}` +
      `&logout_uri=${encodeURIComponent(getRedirectUri())}`;
    window.location.href = logoutUrl;
  }, [configOk, discovery, expireSession, getRedirectUri, prefix]);

  const value = useMemo(
    () => ({
      session,
      ready,
      configOk,
      authError,
      clearAuthError,
      signIn,
      signOut,
      expireSession,
      getAccessToken,
      accessToken: session?.accessToken ?? null,
    }),
    [
      session,
      ready,
      configOk,
      authError,
      clearAuthError,
      signIn,
      signOut,
      expireSession,
      getAccessToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useIdentityAuth(): IdentityAuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useIdentityAuth outside IdentityAuthProvider");
  return ctx;
}
