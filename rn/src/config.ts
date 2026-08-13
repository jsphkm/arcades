function trimEnv(name: string): string {
  return (process.env[name]?.trim() ?? "").replace(/\/$/, "");
}

export const config = {
  scoresApiUrl(): string {
    return trimEnv("EXPO_PUBLIC_SCORES_API_URL");
  },
  /** External identity / account portal (from env / deploy SSM only). */
  accountUrl(): string {
    return trimEnv("EXPO_PUBLIC_ACCOUNT_URL");
  },
};
