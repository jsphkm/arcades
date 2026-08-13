import { Pressable, StyleSheet, Text, View } from "react-native";
import { arcade } from "../arcadeTheme";
import { useTheme } from "../theme-context";

export type FaceLabels = { primary: string; secondary: string };

type Props = {
  onPrimary: () => void;
  onSecondary: () => void;
  enabled?: boolean;
  /** vertical stack | Game Boy A/B diagonal | Select/Start oval pair */
  layout?: "stack" | "gameboy" | "selectStart";
  labels?: FaceLabels;
};

const DEFAULT_AB: FaceLabels = { primary: "A", secondary: "B" };

function FaceButton({
  label,
  onPress,
  enabled,
  accent,
  variant,
}: {
  label: string;
  onPress: () => void;
  enabled: boolean;
  accent: string;
  variant: "round" | "oval";
}) {
  const { typography } = useTheme();
  const oval = variant === "oval";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        oval ? styles.oval : styles.round,
        {
          backgroundColor: pressed
            ? arcade.accentSoftHot
            : hovered
              ? arcade.hover
              : arcade.surface,
          borderColor: pressed ? accent : arcade.border,
          opacity: enabled ? 1 : 0.45,
          cursor: enabled ? ("pointer" as const) : ("default" as const),
          transform: pressed ? [{ scale: 0.96 }] : [],
        },
      ]}
    >
      <Text
        style={{
          fontFamily: typography.pixelFamily,
          fontSize: oval ? 9 : 12,
          color: arcade.text,
          letterSpacing: oval ? 1.2 : 0,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

export function ActionButtons({
  onPrimary,
  onSecondary,
  enabled = true,
  layout = "stack",
  labels = DEFAULT_AB,
}: Props) {
  const accent = arcade.brand;
  const useOval =
    layout === "selectStart" ||
    labels.primary.length > 1 ||
    labels.secondary.length > 1;
  const variant = useOval ? "oval" : "round";

  if (layout === "selectStart") {
    return (
      <View style={styles.selectStart}>
        <FaceButton
          label={labels.secondary}
          onPress={onSecondary}
          enabled={enabled}
          accent={accent}
          variant="oval"
        />
        <FaceButton
          label={labels.primary}
          onPress={onPrimary}
          enabled={enabled}
          accent={accent}
          variant="oval"
        />
      </View>
    );
  }

  if (layout === "gameboy") {
    return (
      <View style={styles.gameboy}>
        <View style={styles.gbB}>
          <FaceButton
            label={labels.secondary}
            onPress={onSecondary}
            enabled={enabled}
            accent={accent}
            variant={variant}
          />
        </View>
        <View style={styles.gbA}>
          <FaceButton
            label={labels.primary}
            onPress={onPrimary}
            enabled={enabled}
            accent={accent}
            variant={variant}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <FaceButton
        label={labels.secondary}
        onPress={onSecondary}
        enabled={enabled}
        accent={accent}
        variant={variant}
      />
      <FaceButton
        label={labels.primary}
        onPress={onPrimary}
        enabled={enabled}
        accent={accent}
        variant={variant}
      />
    </View>
  );
}

const BTN = 56;

const styles = StyleSheet.create({
  stack: {
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  selectStart: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  gameboy: {
    width: 140,
    height: 110,
    position: "relative",
  },
  gbB: {
    position: "absolute",
    left: 0,
    bottom: 8,
  },
  gbA: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  round: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  oval: {
    minWidth: 88,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
