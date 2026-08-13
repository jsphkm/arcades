import { StyleSheet, View } from "react-native";
import { ArcadeShell } from "../components/ArcadeShell";
import { GamePicker } from "../components/GamePicker";

export default function ArcadeLobby() {
  return (
    <ArcadeShell>
      <View style={styles.content}>
        <GamePicker />
      </View>
    </ArcadeShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    width: "100%",
  },
});
