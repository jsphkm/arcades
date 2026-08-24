import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useIdentityAuth } from "identity-sdk";
import { arcade, formatArcadeScore } from "../arcadeTheme";
import { ArcadeShell } from "../components/ArcadeShell";
import { useTheme } from "../theme-context";
import { fetchAllMyScores, type ScoreRow } from "../scores/api";
import { arcadesAuthConfig } from "../auth/config";

type SortKey = "score" | "playedAt" | "device" | "game";
type GameFilter = "all" | "snake" | "pacman";

function gameLabel(game?: string): string {
  if (game === "pacman") return "PAC-MAN";
  return "SNAKE";
}

function gameId(game?: string): "snake" | "pacman" {
  return game === "pacman" ? "pacman" : "snake";
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function highOf(rows: ScoreRow[]): number {
  return rows.reduce((m, r) => Math.max(m, r.score), 0);
}

export default function AccountScreen() {
  if (!arcadesAuthConfig()) {
    return (
      <ArcadeShell>
        <NotConfigured />
      </ArcadeShell>
    );
  }
  return <AccountBody />;
}

function NotConfigured() {
  const { typography } = useTheme();
  return (
    <View style={styles.stage}>
      <Text style={[styles.empty, { fontFamily: typography.pixelFamily }]}>
        SIGN-IN NOT CONFIGURED
      </Text>
    </View>
  );
}

function AccountBody() {
  const { typography } = useTheme();
  const pixel = typography.pixelFamily;
  const router = useRouter();
  const {
    session,
    ready,
    signIn,
    requestSilentSso,
    silentSsoPending,
    getAccessToken,
  } = useIdentityAuth();
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("playedAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState<GameFilter>("all");

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!ready || session) return;
    requestSilentSso();
  }, [ready, session, requestSilentSso]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Not signed in");
        return;
      }
      setRows(await fetchAllMyScores(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scores");
    } finally {
      setLoading(false);
    }
  }, [session, getAccessToken]);

  useEffect(() => {
    if (ready && session) void load();
  }, [ready, session, load]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => gameId(r.game) === filter);
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "score") cmp = a.score - b.score;
      else if (sortKey === "device")
        cmp = (a.device ?? "").localeCompare(b.device ?? "");
      else if (sortKey === "game")
        cmp = gameLabel(a.game).localeCompare(gameLabel(b.game));
      else cmp = a.playedAt.localeCompare(b.playedAt);
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortAsc]);

  const snakeRows = useMemo(
    () => rows.filter((r) => gameId(r.game) === "snake"),
    [rows],
  );
  const pacRows = useMemo(
    () => rows.filter((r) => gameId(r.game) === "pacman"),
    [rows],
  );

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
          fontFamily: pixel,
          fontSize: 8,
          letterSpacing: 0.5,
          color: sortKey === key ? arcade.brand : arcade.muted,
        }}
      >
        {label}
        {sortKey === key ? (sortAsc ? " ^" : " v") : ""}
      </Text>
    </Pressable>
  );

  const chip = (id: GameFilter, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: filter === id }}
      onPress={() => setFilter(id)}
      style={[styles.chip, filter === id && styles.chipOn]}
    >
      <Text
        style={[
          styles.chipLabel,
          { fontFamily: pixel, color: filter === id ? arcade.text : arcade.muted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  if (!ready || silentSsoPending) {
    return (
      <ArcadeShell>
        <View style={styles.stage}>
          <ActivityIndicator color={arcade.brand} style={{ marginTop: 48 }} />
        </View>
      </ArcadeShell>
    );
  }

  if (!session) {
    return (
      <ArcadeShell>
        <View style={styles.centerStage}>
          <Text style={[styles.empty, { fontFamily: pixel }]}>
            SIGN IN TO SEE YOUR RUNS
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign In"
            onPress={() => void signIn()}
            style={({ pressed, hovered }) => [
              styles.backBtn,
              (pressed || hovered) && styles.backBtnHot,
            ]}
          >
            <Text style={[styles.backLabel, { fontFamily: pixel }]}>
              SIGN IN
            </Text>
          </Pressable>
        </View>
      </ArcadeShell>
    );
  }

  return (
    <ArcadeShell>
      <ScrollView
        style={styles.stage}
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontFamily: pixel }]}>ACCOUNT</Text>

        <View style={styles.hud}>
          <View style={styles.hudLeft}>
            <Text style={[styles.hudLabel, { fontFamily: pixel }]}>PLAYS</Text>
            <Text style={[styles.hudValue, { fontFamily: pixel }]}>
              {formatArcadeScore(filtered.length)}
            </Text>
          </View>
          <View style={styles.hudCenter}>
            <Text style={[styles.hudLabel, { fontFamily: pixel }]}>HIGH</Text>
            <Text style={[styles.hudValue, { fontFamily: pixel }]}>
              {formatArcadeScore(highOf(filtered))}
            </Text>
          </View>
        </View>

        {filter === "all" && rows.length > 0 ? (
          <View style={styles.breakdown}>
            <Text style={[styles.breakLine, { fontFamily: pixel }]}>
              SNAKE  {formatArcadeScore(snakeRows.length)} PLAYS  HIGH{" "}
              {formatArcadeScore(highOf(snakeRows))}
            </Text>
            <Text style={[styles.breakLine, { fontFamily: pixel }]}>
              PAC-MAN  {formatArcadeScore(pacRows.length)} PLAYS  HIGH{" "}
              {formatArcadeScore(highOf(pacRows))}
            </Text>
          </View>
        ) : null}

        <View style={styles.chips}>
          {chip("all", "ALL")}
          {chip("snake", "SNAKE")}
          {chip("pacman", "PAC-MAN")}
        </View>

        {loading ? (
          <ActivityIndicator color={arcade.brand} />
        ) : error ? (
          <Text style={[styles.empty, { fontFamily: pixel }]}>{error}</Text>
        ) : sorted.length === 0 ? (
          <Text style={[styles.empty, { fontFamily: pixel }]}>
            NO SCORES YET
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.head}>
              {header("game", "GAME", 1.2)}
              {header("score", "SCORE", 1)}
              {header("playedAt", "DATE", 1.2)}
              {header("device", "DEVICE", 1.2)}
            </View>
            {sorted.map((r, i) => (
              <View
                key={r.runId ?? `${r.playedAt}-${i}`}
                style={styles.row}
              >
                <Text
                  style={[styles.cell, { fontFamily: pixel, flex: 1.2 }]}
                  numberOfLines={1}
                >
                  {gameLabel(r.game)}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    { fontFamily: pixel, flex: 1, color: arcade.gold },
                  ]}
                >
                  {formatArcadeScore(r.score)}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    { fontFamily: pixel, flex: 1.2, color: arcade.muted },
                  ]}
                  numberOfLines={1}
                >
                  {formatWhen(r.playedAt)}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    { fontFamily: pixel, flex: 1.2, color: arcade.dim },
                  ]}
                  numberOfLines={1}
                >
                  {(r.device || "—").toUpperCase().slice(0, 10)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Pressable
          onPress={() => router.replace("/")}
          style={({ pressed, hovered }) => [
            styles.backBtn,
            (pressed || hovered) && styles.backBtnHot,
          ]}
        >
          <Text style={[styles.backLabel, { fontFamily: pixel }]}>
            BACK TO ARCADES
          </Text>
        </Pressable>
      </ScrollView>
    </ArcadeShell>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: arcade.bg,
  },
  centerStage: {
    flex: 1,
    backgroundColor: arcade.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  inner: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  title: {
    color: arcade.brand,
    fontSize: 18,
    letterSpacing: 1,
    marginBottom: 20,
    textShadowColor: arcade.glowBrand,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  hud: {
    width: "100%",
    flexDirection: "row",
    marginBottom: 16,
    minHeight: 44,
    position: "relative",
  },
  hudLeft: { alignItems: "flex-start", zIndex: 1 },
  hudCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hudLabel: {
    color: arcade.text,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  hudValue: {
    color: arcade.text,
    fontSize: 13,
    marginTop: 6,
  },
  breakdown: {
    width: "100%",
    gap: 6,
    marginBottom: 16,
  },
  breakLine: {
    color: arcade.muted,
    fontSize: 8,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: arcade.border,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: {
    borderColor: arcade.brand,
    backgroundColor: arcade.accentSoft,
  },
  chipLabel: {
    fontSize: 8,
    letterSpacing: 1,
  },
  table: {
    width: "100%",
    gap: 8,
    marginBottom: 28,
  },
  head: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: arcade.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 26,
  },
  cell: {
    color: arcade.text,
    fontSize: 8,
  },
  empty: {
    color: arcade.muted,
    fontSize: 10,
    textAlign: "center",
    marginVertical: 24,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: arcade.brand,
    borderRadius: 8,
    backgroundColor: arcade.accentSoft,
  },
  backBtnHot: {
    backgroundColor: arcade.accentSoftHot,
  },
  backLabel: {
    color: arcade.brand,
    fontSize: 10,
    letterSpacing: 1,
  },
});
