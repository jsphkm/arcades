export const config = {
  scoresApiUrl(): string {
    const v = process.env.EXPO_PUBLIC_SCORES_API_URL?.trim() ?? "";
    return v.replace(/\/$/, "");
  },
};
