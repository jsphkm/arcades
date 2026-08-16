import { useMemo, useRef, useState } from "react";
import { PanResponder, Platform, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme-context";
import type { Dir } from "../game/dir";

const BASE_SIZE = 140;
const KNOB_SIZE = 56;
const MAX_RADIUS = (BASE_SIZE - KNOB_SIZE) / 2;
const DEAD_ZONE = 12;

type Props = {
  onDirection: (x: number, y: number) => void;
  onRelease?: () => void;
  enabled?: boolean;
  activeDir?: Dir | null;
  travelDir?: Dir | null;
  steerBlocked?: boolean;
};

function toCardinal(dx: number, dy: number): Dir | null {
  const dist = Math.hypot(dx, dy);
  if (dist < DEAD_ZONE) return null;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: dx > 0 ? 1 : -1, y: 0 };
  }
  return { x: 0, y: dy > 0 ? 1 : -1 };
}

function dirKey(dir: Dir | null | undefined): string | null {
  if (!dir) return null;
  if (dir.x === -1) return "left";
  if (dir.x === 1) return "right";
  if (dir.y === -1) return "up";
  if (dir.y === 1) return "down";
  return null;
}

function isReverse(travel: Dir | null | undefined, dir: Dir | null): boolean {
  if (!dir || !travel) return false;
  if (travel.x === 0 && travel.y === 0) return false;
  return dir.x === -travel.x && dir.y === -travel.y;
}

function applyKnob(
  dx: number,
  dy: number,
  setKnob: (v: { x: number; y: number }) => void,
  setHoldDir: (d: Dir | null) => void,
  lastDir: { current: Dir | null },
  onDirection: (x: number, y: number) => void
) {
  let x = dx;
  let y = dy;
  const dist = Math.hypot(x, y);
  if (dist > MAX_RADIUS && dist > 0) {
    x = (x / dist) * MAX_RADIUS;
    y = (y / dist) * MAX_RADIUS;
  }
  setKnob({ x, y });

  const dir = toCardinal(x, y);
  setHoldDir(dir);
  if (!dir) {
    lastDir.current = null;
    return;
  }
  const prev = lastDir.current;
  if (!prev || prev.x !== dir.x || prev.y !== dir.y) {
    lastDir.current = dir;
    onDirection(dir.x, dir.y);
  }
}

function lockWebSelection() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.body.style.userSelect = "none";
  (document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect =
    "none";
  window.getSelection()?.removeAllRanges();
}

function unlockWebSelection() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.body.style.userSelect = "";
  (document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect =
    "";
}

function preventSelectStart(e: Event) {
  e.preventDefault();
}

export function Joystick({
  onDirection,
  onRelease,
  enabled = true,
  activeDir = null,
  travelDir = null,
  steerBlocked = false,
}: Props) {
  const { colors, typography } = useTheme();
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [holdDir, setHoldDir] = useState<Dir | null>(null);
  const lastDir = useRef<Dir | null>(null);
  const onDirectionRef = useRef(onDirection);
  const onReleaseRef = useRef(onRelease);
  const enabledRef = useRef(enabled);
  const captureElRef = useRef<Element | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  onDirectionRef.current = onDirection;
  onReleaseRef.current = onRelease;
  enabledRef.current = enabled;

  const endDrag = () => {
    if (
      Platform.OS === "web" &&
      captureElRef.current &&
      pointerIdRef.current != null &&
      typeof (captureElRef.current as Element & { releasePointerCapture?: (id: number) => void })
        .releasePointerCapture === "function"
    ) {
      try {
        (
          captureElRef.current as Element & {
            releasePointerCapture: (id: number) => void;
          }
        ).releasePointerCapture(pointerIdRef.current);
      } catch {
        /* already released */
      }
    }
    captureElRef.current = null;
    pointerIdRef.current = null;
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.removeEventListener("selectstart", preventSelectStart, true);
    }
    unlockWebSelection();
    setKnob({ x: 0, y: 0 });
    setHoldDir(null);
    lastDir.current = null;
    onReleaseRef.current?.();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabledRef.current,
        onMoveShouldSetPanResponder: () => enabledRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          if (!enabledRef.current) return;
          setKnob({ x: 0, y: 0 });
          setHoldDir(null);
          lockWebSelection();
          if (Platform.OS === "web" && typeof document !== "undefined") {
            document.addEventListener("selectstart", preventSelectStart, true);
          }
          const ne = evt.nativeEvent as {
            pointerId?: number;
            target?: Element;
          };
          const target =
            ne.target ?? (evt as unknown as { target?: Element }).target ?? null;
          if (
            Platform.OS === "web" &&
            target &&
            typeof ne.pointerId === "number" &&
            typeof (target as Element & { setPointerCapture?: (id: number) => void })
              .setPointerCapture === "function"
          ) {
            try {
              (
                target as Element & { setPointerCapture: (id: number) => void }
              ).setPointerCapture(ne.pointerId);
              captureElRef.current = target;
              pointerIdRef.current = ne.pointerId;
            } catch {
              /* ignore */
            }
          }
        },
        onPanResponderMove: (_, gesture) => {
          if (!enabledRef.current) return;
          applyKnob(
            gesture.dx,
            gesture.dy,
            setKnob,
            setHoldDir,
            lastDir,
            onDirectionRef.current
          );
        },
        onPanResponderRelease: () => {
          endDrag();
        },
        onPanResponderTerminate: () => {
          endDrag();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const displayDir = holdDir ?? activeDir;
  const active = dirKey(displayDir);
  const blocked =
    !!displayDir &&
    (isReverse(travelDir, displayDir) ||
      (steerBlocked &&
        !!activeDir &&
        displayDir.x === activeDir.x &&
        displayDir.y === activeDir.y));

  const marker = (key: string, label: string, style: object) => {
    const on = enabled && active === key;
    return (
      <Text
        style={[
          styles.marker,
          style,
          {
            pointerEvents: "none",
            userSelect: "none",
            color: on && blocked ? "#ff3333" : on ? colors.button : colors.hint,
            fontFamily: typography.fontFamily,
            opacity: on ? 1 : 0.4,
          },
        ]}
      >
        {label}
      </Text>
    );
  };

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.board,
          opacity: enabled ? 1 : 0.45,
          userSelect: "none",
          touchAction: "none",
        } as const,
      ]}
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityState={{ disabled: !enabled }}
      accessibilityLabel="Direction joystick"
      accessibilityHint="Drag to steer the snake"
      accessibilityValue={{
        text: active
          ? blocked
            ? `Blocked ${active}`
            : `Going ${active}`
          : "No direction",
      }}
    >
      {marker("up", "↑", styles.up)}
      {marker("down", "↓", styles.down)}
      {marker("left", "←", styles.left)}
      {marker("right", "→", styles.right)}
      <View
        style={[
          styles.knob,
          {
            pointerEvents: "none",
            backgroundColor: colors.button,
            transform: [{ translateX: knob.x }, { translateY: knob.y }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
  },
  marker: {
    position: "absolute",
    fontSize: 16,
    width: 24,
    textAlign: "center",
  },
  up: {
    top: 8,
    alignSelf: "center",
  },
  down: {
    bottom: 8,
    alignSelf: "center",
  },
  left: {
    left: 10,
    top: "50%",
    marginTop: -10,
  },
  right: {
    right: 10,
    top: "50%",
    marginTop: -10,
  },
});
