import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import { arcade } from "../arcadeTheme";
import { useTheme } from "../theme-context";
import type { Dir } from "../hooks/useSnakeGame";

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

function lockWebSelection() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.body.style.userSelect = "none";
  (
    document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }
  ).webkitUserSelect = "none";
  window.getSelection()?.removeAllRanges();
}

function unlockWebSelection() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.body.style.userSelect = "";
  (
    document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }
  ).webkitUserSelect = "";
}

function preventSelectStart(e: Event) {
  e.preventDefault();
}

function preventTouchMoveDoc(e: Event) {
  if (e.cancelable) e.preventDefault();
}

export function Joystick({
  onDirection,
  onRelease,
  enabled = true,
  activeDir = null,
  travelDir = null,
  steerBlocked = false,
}: Props) {
  const { typography } = useTheme();
  const domId = useId().replace(/:/g, "");
  const markerAttr = `joystick-${domId}`;
  const hostRef = useRef<Element | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [holdDir, setHoldDir] = useState<Dir | null>(null);
  const lastDir = useRef<Dir | null>(null);
  const onDirectionRef = useRef(onDirection);
  const onReleaseRef = useRef(onRelease);
  const enabledRef = useRef(enabled);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const docBoundRef = useRef(false);
  onDirectionRef.current = onDirection;
  onReleaseRef.current = onRelease;
  enabledRef.current = enabled;

  const applyDelta = useCallback((dx: number, dy: number) => {
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
      onDirectionRef.current(dir.x, dir.y);
    }
  }, []);

  const applyDeltaRef = useRef(applyDelta);
  applyDeltaRef.current = applyDelta;

  const endDragRef = useRef<() => void>(() => {});

  // Stable identities for document listeners (created once per mount).
  const docHandlers = useRef({
    pointerMove(e: Event) {
      if (!draggingRef.current) return;
      const pe = e as PointerEvent;
      if (
        pointerIdRef.current != null &&
        pe.pointerId !== pointerIdRef.current
      ) {
        return;
      }
      if (e.cancelable) e.preventDefault();
      applyDeltaRef.current(
        pe.clientX - centerRef.current.x,
        pe.clientY - centerRef.current.y,
      );
    },
    pointerUp(e: Event) {
      const pe = e as PointerEvent;
      if (
        pointerIdRef.current != null &&
        pe.pointerId !== pointerIdRef.current
      ) {
        return;
      }
      endDragRef.current();
    },
    touchMove(e: Event) {
      if (!draggingRef.current) return;
      // Pointer Events path already moves the knob; still block scroll.
      if (typeof window !== "undefined" && "PointerEvent" in window) {
        if (e.cancelable) e.preventDefault();
        return;
      }
      const te = e as TouchEvent;
      const id = pointerIdRef.current;
      let t: Touch | undefined;
      for (let i = 0; i < te.touches.length; i += 1) {
        if (id == null || te.touches[i].identifier === id) {
          t = te.touches[i];
          break;
        }
      }
      if (!t) return;
      if (e.cancelable) e.preventDefault();
      applyDeltaRef.current(
        t.clientX - centerRef.current.x,
        t.clientY - centerRef.current.y,
      );
    },
    touchEnd(e: Event) {
      if (typeof window !== "undefined" && "PointerEvent" in window) return;
      const te = e as TouchEvent;
      const id = pointerIdRef.current;
      if (id != null) {
        for (let i = 0; i < te.touches.length; i += 1) {
          if (te.touches[i].identifier === id) return;
        }
      }
      endDragRef.current();
    },
  }).current;

  const unbindDocListeners = useCallback(() => {
    if (!docBoundRef.current || typeof document === "undefined") return;
    document.removeEventListener("selectstart", preventSelectStart, true);
    document.removeEventListener("touchmove", preventTouchMoveDoc, {
      capture: true,
    } as EventListenerOptions);
    document.removeEventListener("pointermove", docHandlers.pointerMove, true);
    document.removeEventListener("pointerup", docHandlers.pointerUp, true);
    document.removeEventListener("pointercancel", docHandlers.pointerUp, true);
    document.removeEventListener("touchmove", docHandlers.touchMove, true);
    document.removeEventListener("touchend", docHandlers.touchEnd, true);
    document.removeEventListener("touchcancel", docHandlers.touchEnd, true);
    docBoundRef.current = false;
  }, [docHandlers]);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    pointerIdRef.current = null;
    unbindDocListeners();
    unlockWebSelection();
    setKnob({ x: 0, y: 0 });
    setHoldDir(null);
    lastDir.current = null;
    onReleaseRef.current?.();
  }, [unbindDocListeners]);
  endDragRef.current = endDrag;

  const bindDocListeners = useCallback(() => {
    if (docBoundRef.current || typeof document === "undefined") return;
    document.addEventListener("selectstart", preventSelectStart, true);
    document.addEventListener("touchmove", preventTouchMoveDoc, {
      capture: true,
      passive: false,
    });
    document.addEventListener("pointermove", docHandlers.pointerMove, {
      capture: true,
      passive: false,
    });
    document.addEventListener("pointerup", docHandlers.pointerUp, true);
    document.addEventListener("pointercancel", docHandlers.pointerUp, true);
    document.addEventListener("touchmove", docHandlers.touchMove, {
      capture: true,
      passive: false,
    });
    document.addEventListener("touchend", docHandlers.touchEnd, true);
    document.addEventListener("touchcancel", docHandlers.touchEnd, true);
    docBoundRef.current = true;
  }, [docHandlers]);

  const updateCenterFromEl = (el: Element) => {
    const r = (el as HTMLElement).getBoundingClientRect();
    centerRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const startDrag = useCallback(
    (pageX: number, pageY: number, pointerId: number | null, el?: Element) => {
      if (!enabledRef.current) return;
      draggingRef.current = true;
      pointerIdRef.current = pointerId;
      lockWebSelection();
      if (Platform.OS === "web") bindDocListeners();
      if (el) updateCenterFromEl(el);
      applyDelta(pageX - centerRef.current.x, pageY - centerRef.current.y);
    },
    [applyDelta, bindDocListeners],
  );

  const bindHostNode = useCallback(
    (node: View | null) => {
      if (Platform.OS !== "web" || !node) {
        hostRef.current = null;
        return;
      }
      // RN-web may hand back the DOM node itself, or a component host.
      const raw = node as unknown;
      if (typeof Element !== "undefined" && raw instanceof Element) {
        hostRef.current = raw;
        return;
      }
      const anyNode = node as unknown as {
        _node?: Element;
        getNode?: () => Element;
      };
      const el =
        anyNode._node ??
        anyNode.getNode?.() ??
        (typeof document !== "undefined"
          ? document.getElementById(markerAttr)
          : null);
      hostRef.current = el ?? null;
    },
    [markerAttr],
  );

  // Mobile web: non-passive pointer/touch on the pad so the knob tracks and
  // the page cannot steal the gesture (PanResponder alone often fails on iOS).
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    let cleanupListeners: (() => void) | undefined;
    let timer: number | undefined;
    let attempts = 0;

    const attach = (target: Element) => {
      hostRef.current = target;
      const hasPointer =
        typeof window !== "undefined" && "PointerEvent" in window;

      const onPointerDown = (e: Event) => {
        if (!enabledRef.current) return;
        const pe = e as PointerEvent;
        if (e.cancelable) e.preventDefault();
        try {
          (target as HTMLElement).setPointerCapture?.(pe.pointerId);
        } catch {
          /* ignore */
        }
        startDrag(pe.clientX, pe.clientY, pe.pointerId, target);
      };

      const onTouchStart = (e: Event) => {
        // Block scroll/bounce; if PointerEvent exists, pointerdown owns the drag.
        if (e.cancelable) e.preventDefault();
        if (!enabledRef.current || hasPointer) return;
        const te = e as TouchEvent;
        const t = te.changedTouches[0];
        if (!t) return;
        startDrag(t.clientX, t.clientY, t.identifier, target);
      };

      target.addEventListener("pointerdown", onPointerDown, { passive: false });
      target.addEventListener("touchstart", onTouchStart, { passive: false });

      cleanupListeners = () => {
        target.removeEventListener("pointerdown", onPointerDown);
        target.removeEventListener("touchstart", onTouchStart);
        endDrag();
      };
    };

    const tryAttach = () => {
      const el =
        hostRef.current ??
        document.getElementById(markerAttr) ??
        document.querySelector(`[data-joystick="${markerAttr}"]`);
      if (el) {
        attach(el);
        return;
      }
      attempts += 1;
      if (attempts < 20) {
        timer = window.setTimeout(tryAttach, 50);
      }
    };

    tryAttach();

    return () => {
      if (timer != null) window.clearTimeout(timer);
      cleanupListeners?.();
    };
  }, [markerAttr, startDrag, endDrag]);

  // Native apps: RN responder API (location relative to the pad).
  const onGrant = (evt: GestureResponderEvent) => {
    if (!enabledRef.current || Platform.OS === "web") return;
    draggingRef.current = true;
    const { locationX, locationY } = evt.nativeEvent;
    applyDelta(locationX - BASE_SIZE / 2, locationY - BASE_SIZE / 2);
  };
  const onMove = (evt: GestureResponderEvent) => {
    if (!draggingRef.current || !enabledRef.current || Platform.OS === "web")
      return;
    const { locationX, locationY } = evt.nativeEvent;
    applyDelta(locationX - BASE_SIZE / 2, locationY - BASE_SIZE / 2);
  };
  const onReleaseNative = () => {
    if (Platform.OS === "web") return;
    endDrag();
  };

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
            color:
              on && blocked
                ? "#ff3333"
                : on
                  ? arcade.brand
                  : arcade.muted,
            fontFamily: typography.pixelFamily,
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
      ref={bindHostNode}
      nativeID={markerAttr}
      {...({
        id: markerAttr,
        "data-joystick": markerAttr,
        dataSet: { joystick: markerAttr },
      } as object)}
      collapsable={false}
      onStartShouldSetResponder={() =>
        Platform.OS !== "web" && enabledRef.current
      }
      onMoveShouldSetResponder={() =>
        Platform.OS !== "web" && enabledRef.current
      }
      onStartShouldSetResponderCapture={() =>
        Platform.OS !== "web" && enabledRef.current
      }
      onMoveShouldSetResponderCapture={() =>
        Platform.OS !== "web" && enabledRef.current
      }
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onReleaseNative}
      onResponderTerminate={onReleaseNative}
      style={[
        styles.base,
        {
          backgroundColor: arcade.surface,
          borderWidth: 2,
          borderColor: arcade.border,
          opacity: enabled ? 1 : 0.45,
          userSelect: "none",
          touchAction: "none",
        } as object,
      ]}
      accessibilityRole="adjustable"
      accessibilityState={{ disabled: !enabled }}
      accessibilityLabel="Direction joystick"
      accessibilityHint="Drag to steer"
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
            backgroundColor: arcade.silver,
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
