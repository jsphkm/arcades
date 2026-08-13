import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useIdentityAuth } from "identity-sdk";
import { ArcadeShell } from "../components/ArcadeShell";
import { useTheme } from "../theme-context";
import { fetchMyScores, type ScoreRow } from "../scores/api";
import { arcadesAuthConfig } from "../auth/config";

type SortKey = "score" | "playedAt" | "device";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function AccountScreen() {
  const authConfig = arcadesAuthConfig();
  const { colors, typography } = useTheme();
  const fontFamily = typography.fontFamily;
  const router = useRouter();
  const auth = useIdentityAuth();
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("playedAt");
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    if (!auth.session) return;
    setLoading(true);
    setError(null);
    try {
      const token = await auth.getAccessToken();
      if (!token) {
        setError("Not signed in");
        return;
      }
      const res = await fetchMyScores(token);
      setRows(res.scores ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scores");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (auth.ready && auth.session) void load();
  }, [auth.ready, auth.session, load]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "score") cmp = a.score - b.score;
      else if (sortKey === "device")
        cmp = (a.device ?? "").localeCompare(b.device ?? "");
      else cmp = a.playedAt.localeCompare(b.playedAt);
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortAsc]);

  if (!authConfig) {
    return (
      <ArcadeShell>
        <Text style={{ fontFamily, color: colors.muted, padding: 24 }}>
          Sign-in is not configured.
        </Text>
      </ArcadeShell>
    );
  }

  if (auth.ready && !auth.session) {
    return <Redirect href="/" />;
  }

  const header = (key: SortKey, label: string, flex: number) => (
    <Pressable
      onPress={() => {
        if (sortKey === key) setSortAsc((v) => !v);
        else {
          setSortKey(key);
          setSortAsc(key === "device");
        }
      }}
      style={{ flex }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: 12,
          fontWeight: "700",
          color: sortKey === key ? colors.text : colors.muted,
        }}
      >
        {label}
        {sortKey === key ? (sortAsc ? " ↑" : " ↓") : ""}
      </Text>
    </Pressable>
  );

  return (
    <ArcadeShell>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={{
              fontFamily,
              fontSize: 22,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            Account
          </Text>
          <Pressable onPress={() => router.replace("/")}>
            <Text style={{ fontFamily, color: colors.accent, fontWeight: "600" }}>
              Back to Arcades
            </Text>
          </Pressable>
        </View>
        <Text
          style={{
            fontFamily,
            fontSize: 14,
            color: colors.muted,
            marginBottom: 16,
          }}
        >
          Your past scores
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : error ? (
          <Text style={{ fontFamily, color: colors.muted }}>{error}</Text>
        ) : sorted.length === 0 ? (
          <Text style={{ fontFamily, color: colors.muted }}>
            No scores yet. Play a game while signed in.
          </Text>
        ) : (
          <View
            style={[
              styles.table,
              { borderColor: colors.border, backgroundColor: colors.board },
            ]}
          >
            <View style={[styles.row, styles.head]}>
              {header("score", "Score", 1)}
              {header("playedAt", "Date & time", 2)}
              {header("device", "Device", 1.5)}
            </View>
            {sorted.map((r, i) => (
              <View
                key={r.runId ?? `${r.playedAt}-${i}`}
                style={[
                  styles.row,
                  {
                    borderTopColor: colors.border,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily,
                    flex: 1,
                    fontWeight: "600",
                    color: colors.text,
                  }}
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
                >
                  {formatWhen(r.playedAt)}
                </Text>
                <Text
                  style={{
                    fontFamily,
                    flex: 1.5,
                    fontSize: 12,
                    color: colors.muted,
                  }}
                  numberOfLines={2}
                >
                  {r.device || "—"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ArcadeShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48, gap: 4 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  head: { paddingVertical: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
