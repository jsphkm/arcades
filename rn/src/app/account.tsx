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
import { arcade, formatArcadeScore } from "../arcadeTheme";
import { ArcadeShell } from "../components/ArcadeShell";
import { useTheme } from "../theme-context";
import { fetchMyScores, type ScoreRow } from "../scores/api";
import { arcadesAuthConfig } from "../auth/config";

type SortKey = "score" | "playedAt" | "device" | "game";

function gameLabel(game?: string): string {
  if (game === "pacman") return "PAC-MAN";
  return "SNAKE";
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

export default function AccountScreen() {
  const authConfig = arcadesAuthConfig();
  const { typography } = useTheme();
  const pixel = typography.pixelFamily;
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
      else if (sortKey === "game")
        cmp = gameLabel(a.game).localeCompare(gameLabel(b.game));
      else cmp = a.playedAt.localeCompare(b.playedAt);
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortAsc]);

  if (!authConfig) {
    return (
      <ArcadeShell>
        <View style={styles.stage}>
          <Text style={[styles.empty, { fontFamily: pixel }]}>
            SIGN-IN NOT CONFIGURED
          </Text>
        </View>
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
            <Text style={[styles.hudLabel, { fontFamily: pixel }]}>RUNS</Text>
            <Text style={[styles.hudValue, { fontFamily: pixel }]}>
              {formatArcadeScore(rows.length)}
            </Text>
          </View>
          <View style={styles.hudCenter}>
            <Text style={[styles.hudLabel, { fontFamily: pixel }]}>
              YOUR SCORES
            </Text>
            <Text style={[styles.hudValue, { fontFamily: pixel }]}>
              {formatArcadeScore(
                rows.reduce((m, r) => Math.max(m, r.score), 0),
              )}
            </Text>
          </View>
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
    marginBottom: 24,
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
