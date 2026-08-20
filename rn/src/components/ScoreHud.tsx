import { createElement, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { arcade, formatArcadeScore } from "../arcadeTheme";
import { useTheme } from "../theme-context";

type Props = {
  score: number;
  highScore: number;
  width: number;
  /** Pac-Man: flashing 1UP over player 1's score. */
  oneUp?: boolean;
};

/** Cabinet 1UP blink: 16 frames on, 16 off at 60Hz. */
const ONE_UP_HALF_MS = 267;
const MAZE_COLS = 28;

/**
 * Press Start 2P is an 8px bitmap. Snap to a multiple of 8 so 2×/3× stays on grid.
 */
export function scoreHudTile(boardWidth: number) {
  const raw = boardWidth / MAZE_COLS;
  return Math.max(16, Math.round(raw / 8) * 8);
}

export function scoreHudHeight(boardWidth: number) {
  const tile = scoreHudTile(boardWidth);
  return 16 + (tile + 4) + tile / 2 + (tile + 4) + 8;
}

function PixelLine({
  text,
  tile,
  color,
  opacity = 1,
  cols,
  align = "left",
}: {
  text: string;
  tile: number;
  color: string;
  opacity?: number;
  /** Fixed glyph slots so 1UP can sit over a 5-digit field from the start. */
  cols?: number;
  align?: "left" | "right" | "center";
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const slots = Math.max(cols ?? text.length, text.length);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let alive = true;
    const paint = () => {
      if (!alive) return;
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const pad = 2;
      const w = Math.max(1, slots * tile);
      const h = tile + pad * 2;
      c.width = w * dpr;
      c.height = h * dpr;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.font = `${tile}px PressStart2P`;
      ctx.textBaseline = "top";
      const tw = text.length * tile;
      const x =
        align === "right"
          ? w - tw
          : align === "center"
            ? Math.round((w - tw) / 2)
            : 0;
      ctx.textAlign = "left";
      ctx.fillText(text, x, pad);
    };
    paint();
    void document.fonts.ready.then(paint);
    return () => {
      alive = false;
    };
  }, [text, tile, color, slots, align]);

  return createElement("canvas", {
    ref,
    role: "img",
    "aria-label": text,
    style: {
      width: Math.max(1, slots * tile),
      height: tile + 4,
      display: "block",
      opacity,
      imageRendering: "pixelated",
    },
  });
}

export function ScoreHud({ score, highScore, width, oneUp }: Props) {
  const { typography } = useTheme();
  const [oneUpOn, setOneUpOn] = useState(true);

  useEffect(() => {
    if (!oneUp) return;
    const id = setInterval(() => {
      setOneUpOn((on) => !on);
    }, ONE_UP_HALF_MS);
    return () => clearInterval(id);
  }, [oneUp]);

  if (!oneUp || Platform.OS !== "web") {
    const pixel = { fontFamily: typography.pixelFamily, color: arcade.text };
    return (
      <View style={[styles.wrap, { width, minHeight: 44 }]}>
        <View style={styles.col}>
          <Text style={[styles.rnLabel, pixel]}>SCORE</Text>
          <Text style={[styles.rnValue, pixel]}>{formatArcadeScore(score)}</Text>
        </View>
        <View style={styles.center}>
          <Text style={[styles.rnLabel, pixel]}>HIGH SCORE</Text>
          <Text style={[styles.rnValue, pixel]}>
            {formatArcadeScore(highScore)}
          </Text>
        </View>
      </View>
    );
  }

  const tile = scoreHudTile(width);
  const gap = tile / 2;
  const scoreCols = 5;

  return (
    <View
      style={[
        styles.wrap,
        { width, minHeight: scoreHudHeight(width), paddingTop: 8 },
      ]}
    >
      <View style={[styles.col, styles.colCenter]}>
        <PixelLine
          text="1UP"
          tile={tile}
          color="#ffffff"
          opacity={oneUpOn ? 1 : 0}
          cols={scoreCols}
          align="center"
        />
        <View style={{ height: gap }} />
        <PixelLine
          text={formatArcadeScore(score)}
          tile={tile}
          color="#ffffff"
          cols={scoreCols}
          align="right"
        />
      </View>
      <View style={[styles.center, styles.centerPad]}>
        <PixelLine text="HIGH SCORE" tile={tile} color="#ffffff" />
        <View style={{ height: gap }} />
        <PixelLine
          text={formatArcadeScore(highScore)}
          tile={tile}
          color="#ffffff"
          cols={scoreCols}
          align="center"
        />
      </View>
      {/* Cabinet 2UP sits on the right, mirrored from 1UP. Omit until 2P. */}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    marginBottom: 8,
    position: "relative",
    overflow: "visible",
    userSelect: "none",
  },
  col: {
    alignItems: "flex-start",
    zIndex: 1,
    overflow: "visible",
  },
  colCenter: {
    alignItems: "center",
  },
  center: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    alignItems: "center",
    overflow: "visible",
  },
  centerPad: {
    paddingTop: 8,
  },
  rnLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    userSelect: "none",
  },
  rnValue: {
    marginTop: 6,
    fontSize: 13,
    userSelect: "none",
  },
});
