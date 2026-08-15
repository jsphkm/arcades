import { Pressable, StyleSheet, Text, View } from "react-native";
import { arcade } from "../../arcadeTheme";
import { FRUIT_TABLE } from "../../game/pacman/types";
import { useTheme } from "../../theme-context";

type Props = {
  onClose: () => void;
};

const GHOSTS = [
  { color: "#ff0000", nick: "SHADOW", name: "BLINKY" },
  { color: "#ffa8de", nick: "SPEEDY", name: "PINKY" },
  { color: "#00cdff", nick: "BASHFUL", name: "INKY" },
  { color: "#ffa800", nick: "POKEY", name: "CLYDE" },
];

export function PacmanInfo({ onClose }: Props) {
  const { typography } = useTheme();
  const pixel = typography.pixelFamily;

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <View style={styles.card}>
        <Text style={[styles.title, { fontFamily: pixel }]}>
          CHARACTER / NICKNAME
        </Text>
        {GHOSTS.map((g) => (
          <View key={g.name} style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: g.color }]} />
            <Text style={[styles.line, { fontFamily: pixel, color: g.color }]}>
              {`- ${g.nick}  \u201c${g.name}\u201d`}
            </Text>
          </View>
        ))}

        <Text style={[styles.title, { fontFamily: pixel, marginTop: 16 }]}>
          POINTS
        </Text>
        <Text style={[styles.line, { fontFamily: pixel }]}>• PELLET  10</Text>
        <Text style={[styles.line, { fontFamily: pixel }]}>• POWER  50</Text>
        <Text style={[styles.line, { fontFamily: pixel }]}>
          • GHOSTS  200 → 1600
        </Text>

        <Text style={[styles.title, { fontFamily: pixel, marginTop: 16 }]}>
          FRUIT
        </Text>
        <View style={styles.fruitGrid}>
          {FRUIT_TABLE.map((f) => (
            <Text
              key={f.id}
              style={[styles.fruit, { fontFamily: pixel }]}
            >
              {f.label.toUpperCase()} {f.points}
            </Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: arcade.bg,
    borderWidth: 2,
    borderColor: arcade.brand,
    borderRadius: 10,
    padding: 16,
  },
  title: {
    fontSize: 10,
    letterSpacing: 1,
    color: arcade.gold,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  line: {
    color: arcade.text,
    fontSize: 8,
    lineHeight: 14,
  },
  fruitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fruit: {
    color: arcade.muted,
    fontSize: 7,
    minWidth: "45%",
  },
});
