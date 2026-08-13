import { Text, Pressable, StyleSheet, View } from "react-native";
import { arcade } from "../arcadeTheme";
import { useTheme } from "../theme-context";

type Props = {
  onStart: () => void;
  label?: string;
};

export function Menu({ onStart, label = "New Game" }: Props) {
  const { typography } = useTheme();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        onPress={onStart}
        style={({ pressed, hovered }) => [
          styles.button,
          (hovered || pressed) && styles.buttonHot,
          pressed && styles.buttonDown,
        ]}
      >
        <Text
          style={{
            color: arcade.brand,
            fontFamily: typography.pixelFamily,
            fontSize: 11,
            letterSpacing: 1,
            textAlign: "center",
          }}
        >
          {label.toUpperCase()}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  button: {
    minWidth: 180,
    minHeight: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: arcade.brand,
    borderRadius: 8,
    backgroundColor: arcade.accentSoft,
  },
  buttonHot: {
    backgroundColor: arcade.accentSoftHot,
  },
  buttonDown: {
    transform: [{ translateY: 1 }],
  },
});
