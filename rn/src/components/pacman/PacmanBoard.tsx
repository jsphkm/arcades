import { createElement, useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { POWER_BLINK_FRAMES } from "../../game/pacman/engine";
import { COLS, ROWS } from "../../game/pacman/maze";
import { MAZE_MAP, TILE_CHARS, TILES } from "../../game/pacman/mazeData";
import type { Ghost, PacmanSnapshot } from "../../game/pacman/types";

type Props = {
  snap: PacmanSnapshot;
  boardW: number;
  boardH: number;
  getSnap?: () => PacmanSnapshot;
};

const WALL_BLUE = "#2c35da";
const GATE = "#ffb8ff";
const PELLET = "#ffc8a7";
const POWER = "#ffc8a7";
const PAC = "#ffff00";
const FRIGHT_BLUE = "#2121de";
const EYE_BLUE = "#2121ff";

const ACTOR_PAC = 1.75;
const ACTOR_GHOST = 1.75;
const ACTOR_FRUIT = 1.5;
const DOT_SIZE = 0.25;
const POWER_DIAM = 1;
const LIFE_PAC = 1.5;
const ACTOR_EDGE_PAD = 0.4;

/** Arcade tiles are 8x8 pixels; the atlas is authored at that resolution. */
const TILE_PX = 8;

let mazeLayer: { key: string; canvas: HTMLCanvasElement } | null = null;

/**
 * The maze never changes, so paint the atlas once per size and blit it.
 * Built at device resolution so the 1px arcade lines survive the DPR scale.
 */
function buildMazeLayer(cell: number, dpr: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = `${cell}:${dpr}`;
  if (mazeLayer && mazeLayer.key === key) return mazeLayer.canvas;

  const scaled = cell * dpr;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(COLS * scaled));
  canvas.height = Math.max(1, Math.round(ROWS * scaled));
  const g = canvas.getContext("2d");
  if (!g) return null;

  const px = scaled / TILE_PX;
  for (let y = 0; y < MAZE_MAP.length; y += 1) {
    const row = MAZE_MAP[y];
    for (let x = 0; x < row.length; x += 1) {
      // Anything outside TILE_CHARS is a pellet, lane or pen cell: no art.
      const tile = TILES[TILE_CHARS.indexOf(row[x])];
      if (!tile) continue;
      for (let ty = 0; ty < TILE_PX; ty += 1) {
        const line = tile[ty];
        let tx = 0;
        while (tx < TILE_PX) {
          const ch = line[tx];
          if (ch === ".") {
            tx += 1;
            continue;
          }
          let end = tx + 1;
          while (end < TILE_PX && line[end] === ch) end += 1;
          // Snap to whole device pixels so the 1px arcade lines stay crisp.
          const px0 = Math.round(x * scaled + tx * px);
          const py0 = Math.round(y * scaled + ty * px);
          g.fillStyle = ch === "=" ? GATE : WALL_BLUE;
          g.fillRect(
            px0,
            py0,
            Math.max(1, Math.round(x * scaled + end * px) - px0),
            Math.max(1, Math.round(y * scaled + (ty + 1) * px) - py0),
          );
          tx = end;
        }
      }
    }
  }

  mazeLayer = { key, canvas };
  return canvas;
}

function drawMaze(ctx: CanvasRenderingContext2D, cell: number, dpr: number) {
  const layer = buildMazeLayer(cell, dpr);
  if (!layer) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(layer, 0, 0, COLS * cell, ROWS * cell);
}

function drawPac(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  dir: { x: number; y: number },
  mouth: number,
) {
  const cx = (x + 0.5) * cell;
  const cy = (y + 0.5) * cell;
  const r = (ACTOR_PAC * cell) / 2;
  let ang = 0;
  if (dir.x === 1) ang = 0;
  else if (dir.x === -1) ang = Math.PI;
  else if (dir.y === -1) ang = -Math.PI / 2;
  else if (dir.y === 1) ang = Math.PI / 2;

  // 3-frame munch @ 15fps (closed → mid → wide).
  const frame = Math.floor(mouth) % 3;
  const open = frame === 0 ? 0.05 : frame === 1 ? 0.45 : 0.8;
  ctx.fillStyle = PAC;
  ctx.beginPath();
  if (open < 0.08) {
    ctx.arc(cx, cy, r, 0, Math.PI * 2, false);
  } else {
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, ang + open, ang + Math.PI * 2 - open, false);
    ctx.closePath();
  }
  ctx.fill();
}

function drawPacDeath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  t: number,
) {
  const cx = (x + 0.5) * cell;
  const cy = (y + 0.5) * cell;
  const r = (ACTOR_PAC * cell) / 2;
  if (t < 0.75) {
    const open = 0.25 + (t / 0.75) * (Math.PI - 0.25);
    const ang = -Math.PI / 2;
    ctx.fillStyle = PAC;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, ang + open, ang + Math.PI * 2 - open, false);
    ctx.closePath();
    ctx.fill();
    return;
  }
  const u = (t - 0.75) / 0.25;
  ctx.strokeStyle = PAC;
  ctx.lineWidth = Math.max(1.5, cell * 0.06);
  for (let i = 0; i < 6; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const inner = r * (0.15 + u * 0.2);
    const outer = r * (0.55 + u * 0.7);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.stroke();
  }
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  g: Ghost,
  cell: number,
  time: number,
  frightFlash: boolean,
) {
  const cx = (g.x + 0.5) * cell;
  const cy = (g.y + 0.5) * cell;
  const size = ACTOR_GHOST * cell;
  const w = size;
  const h = size * 1.02;
  // Subtle 2-phase bob (SF ghost 01/02 frames)
  const bob = Math.sin(time * 10 + g.x * 2) * cell * 0.04;

  if (g.mode === "eaten" || g.mode === "entering") {
    const er = size * 0.14;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - w * 0.18, cy + bob, er, 0, Math.PI * 2);
    ctx.arc(cx + w * 0.18, cy + bob, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = EYE_BLUE;
    const ex = g.dir.x * size * 0.06;
    const ey = g.dir.y * size * 0.06;
    ctx.beginPath();
    ctx.arc(cx - w * 0.18 + ex, cy + bob + ey, er * 0.45, 0, Math.PI * 2);
    ctx.arc(cx + w * 0.18 + ex, cy + bob + ey, er * 0.45, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  let body = g.color;
  if (g.mode === "frightened") {
    body = frightFlash ? "#ffffff" : FRIGHT_BLUE;
  }

  const top = cy - h * 0.38 + bob;
  const left = cx - w / 2;
  const right = cx + w / 2;
  const bottom = cy + h * 0.42 + bob;

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, top + w * 0.38, w * 0.5, Math.PI, 0, false);
  ctx.lineTo(right, bottom);
  const scallops = 4;
  for (let i = 0; i < scallops; i += 1) {
    const t1 = (i + 0.5) / scallops;
    const t2 = (i + 1) / scallops;
    const x1 = right - (right - left) * t1;
    const x2 = right - (right - left) * t2;
    ctx.quadraticCurveTo(x1, bottom + cell * 0.12, x2, bottom);
  }
  ctx.closePath();
  ctx.fill();

  const eyeY = cy - size * 0.06 + bob;
  const eyeR = size * 0.13;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx - w * 0.18, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(cx + w * 0.18, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();
  if (g.mode !== "frightened") {
    ctx.fillStyle = EYE_BLUE;
    const ex = g.dir.x * size * 0.055;
    const ey = g.dir.y * size * 0.055;
    ctx.beginPath();
    ctx.arc(cx - w * 0.18 + ex, eyeY + ey, eyeR * 0.48, 0, Math.PI * 2);
    ctx.arc(cx + w * 0.18 + ex, eyeY + ey, eyeR * 0.48, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = frightFlash ? FRIGHT_BLUE : GATE;
    ctx.lineWidth = Math.max(1.5, size * 0.05);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.22, cy + size * 0.12 + bob);
    ctx.lineTo(cx - w * 0.08, cy + size * 0.06 + bob);
    ctx.lineTo(cx + w * 0.08, cy + size * 0.12 + bob);
    ctx.lineTo(cx + w * 0.22, cy + size * 0.06 + bob);
    ctx.stroke();
  }
}

function drawFruit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  color: string,
  label: string,
) {
  const cx = (x + 0.5) * cell;
  const cy = (y + 0.5) * cell;
  const size = ACTOR_FRUIT * cell;
  const bodyR = size * 0.32;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.04, bodyR, 0, Math.PI * 2);
  ctx.fill();
  // Cherry twin for first-fruit cue
  if (label.toLowerCase().includes("cherry")) {
    ctx.beginPath();
    ctx.arc(cx + bodyR * 0.85, cy + size * 0.08, bodyR * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#3d8c40";
  ctx.lineWidth = Math.max(1.5, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx, cy - bodyR * 0.2);
  ctx.quadraticCurveTo(cx - size * 0.1, cy - size * 0.35, cx - size * 0.05, cy - size * 0.42);
  ctx.stroke();
  ctx.fillStyle = "#3d8c40";
  ctx.beginPath();
  ctx.ellipse(
    cx - size * 0.12,
    cy - size * 0.38,
    size * 0.12,
    size * 0.07,
    -0.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(cx - bodyR * 0.3, cy - bodyR * 0.15, bodyR * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function arcadeFont(cell: number): string {
  return `${Math.max(8, Math.round(cell))}px PressStart2P, monospace`;
}

function paint(
  ctx: CanvasRenderingContext2D,
  snap: PacmanSnapshot,
  width: number,
  height: number,
  dpr: number,
) {
  // Life band sized for mini-Pac icons (~0.9 cell) under the course.
  const edgePad = ACTOR_EDGE_PAD;
  // Provisional cell from full play area, then reserve life band + edge pad.
  const lifeBandGuess = Math.max(22, Math.min(36, height * 0.07));
  const playH = height - lifeBandGuess;
  const cell = Math.min(width / COLS, playH / (ROWS + edgePad));
  const w = cell * COLS;
  const h = cell * ROWS;
  const lifeBand = Math.max(cell * LIFE_PAC * 1.35, lifeBandGuess * 0.85);
  const ox = (width - w) / 2;
  // Top pad for actor overhang; remaining slack centered.
  const topPad = cell * edgePad * 0.5;
  const usable = height - lifeBand - topPad;
  const oy = topPad + Math.max(0, (usable - h) / 2);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(ox, oy);
  const t = snap.frame / 8;
  drawMaze(ctx, cell, dpr);

  const powerOn =
    snap.frame % POWER_BLINK_FRAMES < POWER_BLINK_FRAMES / 2;
  const dotS = DOT_SIZE * cell;
  const powerR = (POWER_DIAM * cell) / 2;

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (snap.pellets[y]?.[x]) {
        // Classic arcade pellets are small squares, not circles.
        ctx.fillStyle = PELLET;
        ctx.fillRect(
          (x + 0.5) * cell - dotS / 2,
          (y + 0.5) * cell - dotS / 2,
          dotS,
          dotS,
        );
      }
      if (snap.powers[y]?.[x] && powerOn) {
        ctx.fillStyle = POWER;
        ctx.beginPath();
        ctx.arc((x + 0.5) * cell, (y + 0.5) * cell, powerR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (snap.fruit) {
    drawFruit(
      ctx,
      snap.fruit.x,
      snap.fruit.y,
      cell,
      snap.fruit.kind.color,
      snap.fruit.kind.label,
    );
  }

  const flash = snap.frightFlash;
  if (snap.phase !== "dying") {
    for (const g of snap.ghosts) {
      drawGhost(ctx, g, cell, t, flash);
    }
  }

  if (snap.phase === "dying") {
    drawPacDeath(ctx, snap.pac.x, snap.pac.y, cell, snap.deathT);
  } else if (!snap.eatPopup) {
    drawPac(ctx, snap.pac.x, snap.pac.y, cell, snap.pac.dir, snap.pac.mouth);
  } else {
    const p = snap.eatPopup;
    const rise = (1 - p.left / Math.max(0.001, 1)) * cell * 0.45;
    ctx.fillStyle = "#00e5ff";
    ctx.font = arcadeFont(cell);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      String(p.points),
      (p.x + 0.5) * cell,
      (p.y + 0.5) * cell - rise,
    );
  }

  if (snap.phase === "ready" || snap.phase === "dead") {
    const label = snap.phase === "ready" ? "READY!" : "GAME OVER";
    ctx.font = arcadeFont(cell);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = snap.phase === "ready" ? "#ffff00" : "#ff0000";
    const labelW = ctx.measureText(label).width;
    ctx.fillText(
      label,
      Math.round((w - labelW) / 2),
      (17 + 0.5) * cell,
    );
  }

  // Footer-style lives under the course
  const lifeR = (LIFE_PAC * cell) / 2;
  const lifeY = h + lifeBand * 0.55;
  const gap = lifeR * 2.4;
  const livesW = Math.max(0, snap.lives) * gap;
  const lifeStart = (w - livesW) / 2 + lifeR;
  for (let i = 0; i < snap.lives; i += 1) {
    const lx = lifeStart + i * gap;
    ctx.fillStyle = PAC;
    ctx.beginPath();
    ctx.moveTo(lx, lifeY);
    ctx.arc(lx, lifeY, lifeR, 0.45, Math.PI * 2 - 0.45);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/** Extra canvas height for life band + actor edge pad */
export const PACMAN_BOARD_EXTRA = 36;

export function PacmanBoard({ snap, boardW, boardH, getSnap }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const getSnapRef = useRef(getSnap);
  const snapRef = useRef(snap);
  getSnapRef.current = getSnap;
  snapRef.current = snap;

  const cssW = Math.max(1, Math.floor(boardW));
  const cssH = Math.max(1, Math.floor(boardH + PACMAN_BOARD_EXTRA));

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr =
      typeof window !== "undefined"
        ? Math.min(2, window.devicePixelRatio || 1)
        : 1;

    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.imageRendering = "pixelated";
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const loop = () => {
      const s = getSnapRef.current ? getSnapRef.current() : snapRef.current;
      paint(ctx, s, cssW, cssH, dpr);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cssW, cssH]);

  if (Platform.OS !== "web") {
    return <View style={[styles.root, { width: cssW, height: cssH }]} />;
  }

  return createElement(
    "div",
    {
      style: {
        width: cssW,
        height: cssH,
        backgroundColor: "#000",
        overflow: "hidden",
        position: "relative" as const,
        margin: "0 auto",
      },
    },
    createElement("canvas", { ref: canvasRef }),
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#000",
    overflow: "hidden",
  },
});
