import { StyleSheet, View } from "react-native";
import { Joystick } from "./Joystick";
import { ActionButtons, type FaceLabels } from "./ActionButtons";
import type { Dir } from "../game/pacman/types";

type Props = {
  onDirection: (x: number, y: number) => void;
  onRelease?: () => void;
  onPrimary: () => void;
  onSecondary: () => void;
  enabled?: boolean;
  activeDir?: Dir | null;
  travelDir?: Dir | null;
  mode: "landscape" | "portrait";
  labels?: FaceLabels;
};

const SELECT_START: FaceLabels = { primary: "START", secondary: "SELECT" };

export function GamepadControls({
  onDirection,
  onRelease,
  onPrimary,
  onSecondary,
  enabled = true,
  activeDir = null,
  travelDir = null,
  mode,
  labels = SELECT_START,
}: Props) {
  const stick = (
    <Joystick
      enabled={enabled}
      activeDir={activeDir}
      travelDir={travelDir}
      onDirection={(x, y) => {
        if (!enabled) return;
        onDirection(x, y);
      }}
      onRelease={() => {
        if (!enabled) return;
        onRelease?.();
      }}
    />
  );

  if (mode === "landscape") {
    return (
      <ActionButtons
        enabled={enabled}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        labels={labels}
        layout="stack"
      />
    );
  }

  return (
    <View style={styles.portraitRow}>
      {stick}
      <ActionButtons
        enabled={enabled}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        labels={labels}
        layout="selectStart"
      />
    </View>
  );
}

export function GamepadStick(
  props: Omit<Props, "onPrimary" | "onSecondary" | "mode" | "labels">,
) {
  return (
    <Joystick
      enabled={props.enabled}
      activeDir={props.activeDir}
      travelDir={props.travelDir}
      onDirection={(x, y) => {
        if (!props.enabled) return;
        props.onDirection(x, y);
      }}
      onRelease={() => {
        if (!props.enabled) return;
        props.onRelease?.();
      }}
    />
  );
}

const styles = StyleSheet.create({
  portraitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 420,
    paddingHorizontal: 20,
    gap: 16,
  },
});
