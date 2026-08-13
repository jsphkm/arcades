import type { IdentityAuthConfig } from "identity-sdk";

export function arcadesAuthConfig(): IdentityAuthConfig | null {
  const clientId = process.env.EXPO_PUBLIC_IDENTITY_CLIENT_ID;
  const cognitoDomain = process.env.EXPO_PUBLIC_IDENTITY_COGNITO_DOMAIN;
  if (!clientId || !cognitoDomain) return null;
  return {
    clientId,
    cognitoDomain,
    storageKeyPrefix: "arcades.auth",
  };
}
