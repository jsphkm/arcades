function clean(v: string | undefined): string {
  return (v?.trim() ?? "").replace(/\/$/, "");
}

export const config = {
  scoresApiUrl(): string {
    // Expo inlines only static process.env.EXPO_PUBLIC_* member access.
    return clean(process.env.EXPO_PUBLIC_SCORES_API_URL);
  },
  /** External identity / account portal (from env / deploy SSM only). */
  accountUrl(): string {
    return clean(process.env.EXPO_PUBLIC_ACCOUNT_URL);
  },
};
