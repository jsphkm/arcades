import { useCallback, useEffect, useState } from "react";
import { useRouter, type Href } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { arcade, formatArcadeScore } from "../arcadeTheme";
import {
  fetchLeaderboard,
  type ArcadeGameId,
  type ScoreRow,
} from "../scores/api";
import { useTheme } from "../theme-context";
import { ArcadeShell } from "./ArcadeShell";

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

function playerLabel(r: ScoreRow): string {
  const raw = r.email || r.device || "PLAYER";
  const base = raw.includes("@") ? raw.split("@")[0]! : raw;
  return base.toUpperCase().slice(0, 12);
}

type Props = {
  game: ArcadeGameId;
  title: string;
  backHref: Href;
  backLabel: string;
  highScoresHref: Href;
};

export function ArcadeScoreboard({
  game,
  title,
  backHref,
  backLabel,
  highScoresHref,
}: Props) {
  const router = useRouter();
  const { typography } = useTheme();
  const pixel = typography.pixelFamily;
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
      setError(e instanceof Error ? e.message : "Failed to load scores");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    void load();
  }, [load]);

  const top = rows[0]?.score ?? 0;

  return (
    <ArcadeShell highScoresHref={highScoresHref}>
      <ScrollView
        style={styles.stage}
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.gameTitle, { fontFamily: pixel }]}>
          {title.toUpperCase()}
        </Text>

        <View style={styles.hud}>
          <View style={styles.hudLeft}>
            <Text style={[styles.hudLabel, { fontFamily: pixel }]}>
              {game === "pacman" ? "LVL —" : "RUNS"}
            </Text>
            <Text style={[styles.hudValue, { fontFamily: pixel }]}>
              {formatArcadeScore(rows.length)}
            </Text>
          </View>
          <View style={styles.hudCenter}>
            <Text style={[styles.hudLabel, { fontFamily: pixel }]}>
              HIGH SCORE
            </Text>
            <Text style={[styles.hudValue, { fontFamily: pixel }]}>
              {formatArcadeScore(top)}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { fontFamily: pixel }]}>
          LEADERBOARD
        </Text>

        <View style={styles.board}>
          {loading ? (
            <ActivityIndicator
              color={arcade.brand}
              style={{ marginVertical: 24 }}
            />
          ) : error ? (
            <Text style={[styles.empty, { fontFamily: pixel }]}>{error}</Text>
          ) : rows.length === 0 ? (
            <Text style={[styles.empty, { fontFamily: pixel }]}>
              NO SCORES YET
            </Text>
          ) : (
            rows.slice(0, 10).map((r, i) => {
              const rank = r.rank ?? i + 1;
              const accent =
                rank === 1
                  ? arcade.gold
                  : rank === 2
                    ? arcade.silver
                    : rank === 3
                      ? arcade.brand
                      : arcade.text;
              return (
                <View
                  key={r.runId ?? `${r.playedAt}-${i}`}
                  style={styles.row}
                >
                  <Text
                    style={[styles.rank, { fontFamily: pixel, color: accent }]}
                  >
                    {String(rank).padStart(2, "0")}
                  </Text>
                  <Text
                    style={[
                      styles.player,
                      { fontFamily: pixel, color: accent },
                    ]}
                    numberOfLines={1}
                  >
                    {playerLabel(r)}
                  </Text>
                  <Text
                    style={[styles.score, { fontFamily: pixel, color: accent }]}
                  >
                    {formatArcadeScore(r.score)}
                  </Text>
                  <Text
                    style={[styles.when, { fontFamily: pixel }]}
                    numberOfLines={1}
                  >
                    {formatWhen(r.playedAt)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={() => router.replace(backHref)}
          style={({ pressed, hovered }) => [
            styles.backBtn,
            (pressed || hovered) && styles.backBtnHot,
          ]}
        >
          <Text style={[styles.backLabel, { fontFamily: pixel }]}>
            {backLabel.toUpperCase()}
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
    maxWidth: 448,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  gameTitle: {
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
    marginBottom: 28,
    minHeight: 44,
    position: "relative",
  },
  hudLeft: {
    alignItems: "flex-start",
    zIndex: 1,
  },
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
    textShadowColor: arcade.glowWhite,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  hudValue: {
    color: arcade.text,
    fontSize: 13,
    marginTop: 6,
    textShadowColor: arcade.glowWhite,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  sectionTitle: {
    color: arcade.text,
    fontSize: 11,
    marginBottom: 14,
    textShadowColor: arcade.glowWhite,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  board: {
    width: "100%",
    gap: 10,
    minHeight: 120,
    marginBottom: 28,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 28,
  },
  rank: { width: 28, fontSize: 10 },
  player: { flex: 1.4, fontSize: 10 },
  score: { flex: 1, fontSize: 10, textAlign: "right" },
  when: {
    width: 52,
    fontSize: 8,
    color: arcade.dim,
    textAlign: "right",
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
