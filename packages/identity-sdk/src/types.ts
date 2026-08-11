export type AuthSession = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
  email?: string;
};

export type IdentityAuthConfig = {
  clientId: string;
  cognitoDomain: string;
  redirectUri?: () => string;
  storageKeyPrefix?: string;
  scopes?: string[];
  onSignedIn?: () => void;
};

export type IdentityAuthValue = {
  session: AuthSession | null;
  ready: boolean;
  configOk: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  expireSession: () => void;
  getAccessToken: () => Promise<string | null>;
  accessToken: string | null;
};
