import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { arcade } from "../arcadeTheme";
import { ARCADE_GAMES } from "../games/registry";
import { useTheme } from "../theme-context";

/** Home game list — keyboard arrows + click to open. */
export function GamePicker() {
  const router = useRouter();
  const { typography } = useTheme();
  const pixel = typography.pixelFamily;
  const [selected, setSelected] = useState(0);

  const openGame = useCallback(
    (index: number) => {
      const game = ARCADE_GAMES[index];
      if (game) router.push(game.href);
    },
    [router],
  );

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        setSelected((i) => (i + 1) % ARCADE_GAMES.length);
        return;
      }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        setSelected(
          (i) => (i - 1 + ARCADE_GAMES.length) % ARCADE_GAMES.length,
        );
        return;
      }
      if (
        e.key === "Enter" ||
        e.key === " " ||
        e.key === "ArrowRight" ||
        e.key === "d" ||
        e.key === "D"
      ) {
        e.preventDefault();
        openGame(selected);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openGame, selected]);

  return (
    <View style={styles.stage}>
      <View style={styles.wrap}>
        <Text style={[styles.brand, { fontFamily: pixel }]}>ARCADES</Text>
        <Text style={[styles.tagline, { fontFamily: pixel }]}>
          SELECT A GAME
        </Text>

        <View
          style={styles.list}
          accessibilityRole="menu"
          accessibilityLabel="Games"
        >
          {ARCADE_GAMES.map((game, index) => {
            const active = index === selected;
            return (
              <Pressable
                key={game.id}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: active }}
                accessibilityLabel={game.title}
                onHoverIn={() => setSelected(index)}
                onPress={() => openGame(index)}
                style={styles.row}
              >
                <Text
                  style={[
                    styles.chevron,
                    { fontFamily: pixel },
                    active ? styles.chevronOn : styles.chevronOff,
                  ]}
                >
                  {active ? ">" : " "}
                </Text>
                <Text
                  style={[
                    styles.title,
                    { fontFamily: pixel },
                    active ? styles.titleOn : styles.titleOff,
                  ]}
                >
                  {game.title.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: "100%",
    backgroundColor: arcade.bg,
  },
  wrap: {
    flex: 1,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  brand: {
    color: arcade.brand,
    fontSize: 22,
    letterSpacing: 2,
    textAlign: "center",
    textShadowColor: arcade.glowBrand,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  tagline: {
    color: arcade.muted,
    fontSize: 10,
    marginTop: 12,
    marginBottom: 36,
    letterSpacing: 1,
    textAlign: "center",
  },
  list: {
    alignSelf: "center",
    gap: 14,
    minWidth: 200,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
    paddingVertical: 6,
  },
  chevron: {
    width: 22,
    fontSize: 14,
  },
  chevronOn: {
    color: arcade.text,
  },
  chevronOff: {
    color: "transparent",
  },
  title: {
    fontSize: 14,
    letterSpacing: 1,
  },
  titleOn: {
    color: arcade.text,
  },
  titleOff: {
    color: arcade.muted,
  },
});
