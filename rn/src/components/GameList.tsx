import { createElement, type CSSProperties } from "react";
import { Link, usePathname, type Href } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ARCADE_GAMES } from "../games/registry";

type Props = {
  fontFamily: string;
  onNavigate: () => void;
  scheme: "light" | "dark";
  activeBg: string;
  activeText: string;
  text: string;
};

export function GameList({
  fontFamily,
  onNavigate,
  scheme,
  activeBg,
  activeText,
  text,
}: Props) {
  const pathname = usePathname();

  if (Platform.OS === "web") {
    return createElement(
      "ul",
      {
        className: "arcades-game-list",
        "data-scheme": scheme,
      },
      ARCADE_GAMES.map((game) => {
        const active =
          pathname === game.href ||
          pathname.startsWith(`${String(game.href)}/`);
        return createElement(
          "li",
          {
            key: game.id,
            className: active
              ? "arcades-game-item is-selected"
              : "arcades-game-item",
          },
          createElement(
            Link,
            {
              href: game.href as Href,
              className: active
                ? "arcades-game-link is-selected"
                : "arcades-game-link",
              onPress: onNavigate,
              style: {
                fontFamily,
                color: active ? activeText : text,
                ["--arcades-active-bg" as string]: activeBg,
              } as CSSProperties,
            },
            game.title,
          ),
        );
      }),
    );
  }

  return (
    <View style={styles.list} accessibilityRole="list">
      {ARCADE_GAMES.map((game) => {
        const active =
          pathname === game.href ||
          pathname.startsWith(`${String(game.href)}/`);
        return (
          <View key={game.id} accessibilityRole="listitem" style={styles.item}>
            <Link href={game.href} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                onPress={onNavigate}
                style={({ pressed, hovered }) => [
                  styles.link,
                  {
                    backgroundColor: active
                      ? activeBg
                      : pressed || hovered
                        ? "rgba(128,128,128,0.15)"
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily,
                    fontSize: 15,
                    fontWeight: active ? "600" : "500",
                    color: active ? activeText : text,
                  }}
                >
                  {game.title}
                </Text>
              </Pressable>
            </Link>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4, paddingHorizontal: 4 },
  item: { paddingVertical: 4, paddingHorizontal: 4 },
  link: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
    justifyContent: "center",
  },
});
