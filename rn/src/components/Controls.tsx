import { Joystick } from "./Joystick";
import type { Dir } from "../game/dir";

type Props = {
  onDirection: (x: number, y: number) => void;
  onRelease?: () => void;
  enabled?: boolean;
  activeDir?: Dir | null;
  travelDir?: Dir | null;
  steerBlocked?: boolean;
};

export function Controls({
  onDirection,
  onRelease,
  enabled = true,
  activeDir = null,
  travelDir = null,
  steerBlocked = false,
}: Props) {
  return (
    <Joystick
      enabled={enabled}
      activeDir={activeDir}
      travelDir={travelDir}
      steerBlocked={steerBlocked}
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
}
