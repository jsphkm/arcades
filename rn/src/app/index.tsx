import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArcadeShell } from "../components/ArcadeShell";
import { useTheme } from "../theme-context";

export default function ArcadeLobby() {
  const router = useRouter();
  const { scheme, typography } = useTheme();
  const [hot, setHot] = useState(false);
  const label = scheme === "dark" ? "#71717a" : "#6b7280";
  const labelHot = scheme === "dark" ? "#a1a1aa" : "#4b5563";

  return (
    <ArcadeShell>
      <View style={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New Game"
          onPress={() => router.push("/games/snake")}
          onHoverIn={() => setHot(true)}
          onHoverOut={() => setHot(false)}
          onPressIn={() => setHot(true)}
          onPressOut={() => setHot(false)}
          style={({ hovered }) => [
            styles.action,
            hovered && { cursor: "pointer" as const },
          ]}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily,
              fontSize: 15,
              fontWeight: "500",
              color: hot ? labelHot : label,
            }}
          >
            New Game
          </Text>
        </Pressable>
      </View>
    </ArcadeShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  action: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
});
