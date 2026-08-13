import { StyleSheet, Text, View } from "react-native";
import { arcade, formatArcadeScore } from "../arcadeTheme";
import { useTheme } from "../theme-context";

type Props = {
  score: number;
  highScore: number;
  width: number;
  /** When set, show LVL on the left (Pac-Man). */
  stage?: number;
};

export function ScoreHud({ score, highScore, width, stage }: Props) {
  const { typography } = useTheme();
  const pixel = { fontFamily: typography.pixelFamily, color: arcade.text };

  return (
    <View style={[styles.wrap, { width }]}>
      <View style={styles.left}>
        <Text style={[styles.label, pixel]}>
          {stage != null ? `LVL ${stage}/8` : "SCORE"}
        </Text>
        <Text style={[styles.value, pixel]}>{formatArcadeScore(score)}</Text>
      </View>
      <View style={styles.center}>
        <Text style={[styles.label, pixel]}>HIGH SCORE</Text>
        <Text style={[styles.value, pixel]}>
          {formatArcadeScore(highScore)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    marginBottom: 10,
    minHeight: 44,
    position: "relative",
    userSelect: "none",
  },
  left: {
    alignItems: "flex-start",
    zIndex: 1,
  },
  center: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.5,
    textShadowColor: arcade.glowWhite,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    userSelect: "none",
  },
  value: {
    marginTop: 6,
    fontSize: 13,
    textShadowColor: arcade.glowWhite,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    userSelect: "none",
  },
});
