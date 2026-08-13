import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme-context";
import {
  fetchLeaderboard,
  type ArcadeGameId,
  type ScoreRow,
} from "../scores/api";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export function Leaderboard({
  refreshKey = 0,
  game = "snake",
}: {
  refreshKey?: number;
  game?: ArcadeGameId;
}) {
  const { colors, typography } = useTheme();
  const fontFamily = typography.fontFamily;
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLeaderboard(game);
      setRows(res.scores ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leaderboard");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.board, borderColor: colors.border },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={{ fontFamily, fontSize: 13, color: colors.muted }}>
          {error}
        </Text>
      ) : rows.length === 0 ? (
        <Text style={{ fontFamily, fontSize: 13, color: colors.muted }}>
          No scores yet — be the first.
        </Text>
      ) : (
        <View style={{ gap: 6 }}>
          {rows.slice(0, 10).map((r, i) => (
            <View key={`${r.runId ?? r.playedAt}-${i}`} style={styles.row}>
              <Text
                style={{
                  fontFamily,
                  width: 28,
                  fontWeight: "600",
                  color: colors.muted,
                }}
              >
                {r.rank ?? i + 1}
              </Text>
              <Text
                style={{
                  fontFamily,
                  flex: 1,
                  color: colors.text,
                  fontWeight: "600",
                }}
                numberOfLines={1}
              >
                {r.score}
              </Text>
              <Text
                style={{
                  fontFamily,
                  flex: 2,
                  fontSize: 12,
                  color: colors.muted,
                }}
                numberOfLines={1}
              >
                {r.email || r.device || "player"}
              </Text>
              <Text
                style={{
                  fontFamily,
                  flex: 2,
                  fontSize: 11,
                  color: colors.muted,
                  textAlign: "right",
                }}
                numberOfLines={1}
              >
                {formatWhen(r.playedAt)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 520,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
