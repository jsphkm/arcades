import type { IdentityAuthConfig } from "identity-sdk";

export function arcadesAuthConfig(): IdentityAuthConfig | null {
  const clientId = process.env.EXPO_PUBLIC_IDENTITY_CLIENT_ID;
  const cognitoDomain = process.env.EXPO_PUBLIC_IDENTITY_COGNITO_DOMAIN;
  if (!clientId || !cognitoDomain) return null;
  return {
    clientId,
    cognitoDomain,
    // Shared prefix name across Arcades / Account / Admin (storage is still
    // per-origin; cross-app SSO uses the Cognito Hosted UI cookie).
    storageKeyPrefix: "identity.auth",
  };
}
