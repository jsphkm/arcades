import { config } from "../config";

export type ScoreRow = {
  rank?: number;
  userSub: string;
  email?: string;
  score: number;
  playedAt: string;
  device?: string;
  userAgent?: string;
  runId?: string;
};

export class ScoresApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function scoresFetch<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const base = config.scoresApiUrl();
  if (!base) throw new ScoresApiError(0, "Scores API URL not configured");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }
  if (!res.ok) {
    const err =
      typeof body === "object" &&
      body &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `HTTP ${res.status}`;
    throw new ScoresApiError(res.status, err);
  }
  return body as T;
}

export function fetchLeaderboard() {
  return scoresFetch<{ scores: ScoreRow[] }>("/v1/scores/leaderboard");
}

export function fetchMyScores(token: string) {
  return scoresFetch<{ scores: ScoreRow[]; nextCursor?: string }>(
    "/v1/scores/me",
    { token },
  );
}

export function submitScore(
  token: string,
  score: number,
  device: string,
  userAgent: string,
) {
  return scoresFetch<{
    runId: string;
    playedAt: string;
    score: number;
    onLeaderboard: boolean;
  }>("/v1/scores", {
    method: "POST",
    token,
    body: JSON.stringify({ score, device, userAgent }),
  });
}

export function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const uaData = (
    navigator as Navigator & {
      userAgentData?: { brands?: { brand: string }[]; platform?: string };
    }
  ).userAgentData;
  if (uaData?.brands?.length) {
    const brand =
      uaData.brands.find((b) => !/Not.?A.?Brand/i.test(b.brand))?.brand ??
      uaData.brands[0]?.brand;
    return [brand, uaData.platform].filter(Boolean).join(" / ") || "web";
  }
  if (/Edg\//.test(ua)) return "Edge / web";
  if (/Chrome\//.test(ua)) return "Chrome / web";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari / web";
  if (/Firefox\//.test(ua)) return "Firefox / web";
  return "web";
}
