const DEFAULT_ACCOUNT_URL = "https://d1a0llqq3cbyju.cloudfront.net";

export const config = {
  scoresApiUrl(): string {
    const v = process.env.EXPO_PUBLIC_SCORES_API_URL?.trim() ?? "";
    return v.replace(/\/$/, "");
  },
  /** External identity / account portal. */
  accountUrl(): string {
    const v = process.env.EXPO_PUBLIC_ACCOUNT_URL?.trim() ?? DEFAULT_ACCOUNT_URL;
    return v.replace(/\/$/, "") || DEFAULT_ACCOUNT_URL;
  },
};
