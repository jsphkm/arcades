import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArcadeShell } from "../../../components/ArcadeShell";
import { Leaderboard } from "../../../components/Leaderboard";
import { useTheme } from "../../../theme-context";

export default function HighScoresScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();

  return (
    <ArcadeShell highScoresHref="/games/snake/high-scores">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={{
              fontFamily: typography.fontFamily,
              fontSize: 22,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            High scores
          </Text>
          <Pressable onPress={() => router.replace("/games/snake")}>
            <Text
              style={{
                fontFamily: typography.fontFamily,
                color: colors.accent,
                fontWeight: "600",
              }}
            >
              Back to Snake
            </Text>
          </Pressable>
        </View>
        <Leaderboard />
      </ScrollView>
    </ArcadeShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 48,
    alignItems: "center",
    gap: 16,
  },
  titleRow: {
    width: "100%",
    maxWidth: 520,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
