import { createElement, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { POWER_BLINK_FRAMES } from "../../game/pacman/engine";
import { COLS, ROWS } from "../../game/pacman/maze";
import { MAZE_MAP, TILE_CHARS, TILES } from "../../game/pacman/mazeData";
import type { PacmanSnapshot } from "../../game/pacman/types";
import {
  ACTOR_FRUIT,
  ACTOR_GHOST,
  ACTOR_PAC,
  LIFE_PAC,
  PACMAN_BOARD_EXTRA,
  boardLayout,
} from "./boardLayout";
import { PacmanViewBoard } from "./PacmanViewBoard";
import {
  FRUITS_SHEET,
  GHOSTS_SHEET,
  PAC_SHEET,
  PELLETS_SHEET,
  SPRITE_CELL,
  fruitSheetCell,
  ghostSheetCell,
  lifeSheetCell,
  pacSheetCell,
  pelletSheetCell,
  sheetUri,
  type SheetCell,
} from "./spriteSheets";

type Props = {
  snap: PacmanSnapshot;
  boardW: number;
  boardH: number;
  getSnap?: () => PacmanSnapshot;
};

const WALL_BLUE = "#2c35da";
const GATE = "#ffb8ff";
const sheetImgs = new Map<string, HTMLImageElement>();

function sheetImage(source: unknown): HTMLImageElement | null {
  if (typeof document === "undefined") return null;
  const uri = sheetUri(source);
  if (!uri) return null;
  let img = sheetImgs.get(uri);
  if (!img) {
    img = new window.Image();
    img.src = uri;
    sheetImgs.set(uri, img);
  }
  return img;
}

function drawSheetCell(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cell: SheetCell,
  cx: number,
  cy: number,
  dest: number,
) {
  if (!img?.complete || img.naturalWidth === 0) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, cy);
  if (cell.rotateDeg) ctx.rotate((cell.rotateDeg * Math.PI) / 180);
  if (cell.flipX) ctx.scale(-1, 1);
  ctx.drawImage(
    img,
    cell.col * SPRITE_CELL,
    cell.row * SPRITE_CELL,
    SPRITE_CELL,
    SPRITE_CELL,
    -dest / 2,
    -dest / 2,
    dest,
    dest,
  );
  ctx.restore();
}

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

function actorCenter(x: number, y: number, cell: number) {
  return { cx: (x + 0.5) * cell, cy: (y + 0.5) * cell };
}

function drawPac(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  dir: { x: number; y: number },
  mouth: number,
) {
  const { cx, cy } = actorCenter(x, y, cell);
  drawSheetCell(
    ctx,
    sheetImage(PAC_SHEET),
    pacSheetCell(mouth, dir),
    cx,
    cy,
    ACTOR_PAC * cell,
  );
}

function drawPacDeath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  t: number,
) {
  const { cx, cy } = actorCenter(x, y, cell);
  drawSheetCell(
    ctx,
    sheetImage(PAC_SHEET),
    pacSheetCell(0, { x: 0, y: 0 }, true, t),
    cx,
    cy,
    ACTOR_PAC * cell,
  );
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  g: PacmanSnapshot["ghosts"][number],
  cell: number,
  frame: number,
  frightFlash: boolean,
) {
  const { cx, cy } = actorCenter(g.x, g.y, cell);
  drawSheetCell(
    ctx,
    sheetImage(GHOSTS_SHEET),
    ghostSheetCell(g, frame, frightFlash),
    cx,
    cy,
    ACTOR_GHOST * cell,
  );
}

function drawFruit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  id: string,
) {
  const { cx, cy } = actorCenter(x, y, cell);
  drawSheetCell(
    ctx,
    sheetImage(FRUITS_SHEET),
    fruitSheetCell(id),
    cx,
    cy,
    ACTOR_FRUIT * cell,
  );
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
  const { cell, mazeW: w, mazeH: h, ox, oy, lifeY } = boardLayout(
    width,
    height,
    dpr,
  );

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(ox, oy);
  drawMaze(ctx, cell, dpr);

  const powerOn =
    snap.frame % POWER_BLINK_FRAMES < POWER_BLINK_FRAMES / 2;
  const pelletImg = sheetImage(PELLETS_SHEET);
  const pelletDest = ACTOR_PAC * cell;

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (snap.pellets[y]?.[x]) {
        const { cx, cy } = actorCenter(x, y, cell);
        drawSheetCell(ctx, pelletImg, pelletSheetCell("dot"), cx, cy, pelletDest);
      }
      if (snap.powers[y]?.[x] && powerOn) {
        const { cx, cy } = actorCenter(x, y, cell);
        drawSheetCell(
          ctx,
          pelletImg,
          pelletSheetCell("energizer"),
          cx,
          cy,
          pelletDest,
        );
      }
    }
  }

  if (snap.fruit) {
    drawFruit(ctx, snap.fruit.x, snap.fruit.y, cell, snap.fruit.kind.id);
  }

  if (snap.eatPopup) {
    const p = snap.eatPopup;
    ctx.fillStyle = p.hidePac ? "#00ffff" : "#fff4dc";
    ctx.font = arcadeFont(cell);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      String(p.points),
      (p.x + 0.5) * cell,
      (p.y + 0.5) * cell,
    );
  }

  const flash = snap.frightFlash;
  if (snap.phase !== "dying" && !snap.showPlayerOne) {
    for (const g of snap.ghosts) {
      drawGhost(ctx, g, cell, snap.frame, flash);
    }
  }

  if (snap.phase === "dying") {
    drawPacDeath(ctx, snap.pac.x, snap.pac.y, cell, snap.deathT);
  } else if (!snap.eatPopup?.hidePac && !snap.showPlayerOne) {
    drawPac(ctx, snap.pac.x, snap.pac.y, cell, snap.pac.dir, snap.pac.mouth);
  }

  if (snap.phase === "ready" || snap.phase === "dead") {
    ctx.font = arcadeFont(cell);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    if (snap.phase === "ready" && snap.showPlayerOne) {
      const who = "PLAYER ONE";
      ctx.fillStyle = "#00ffff";
      const whoW = ctx.measureText(who).width;
      ctx.fillText(who, Math.round((w - whoW) / 2), (11 + 0.5) * cell);
    }
    const label = snap.phase === "ready" ? "READY!" : "GAME OVER";
    ctx.fillStyle = snap.phase === "ready" ? "#ffff00" : "#ff0000";
    const labelW = ctx.measureText(label).width;
    ctx.fillText(
      label,
      Math.round((w - labelW) / 2),
      (17 + 0.5) * cell,
    );
  }

  const lifeSize = LIFE_PAC * cell;
  const gap = lifeSize * 1.2;
  const lifeStart = cell * 0.35 + lifeSize / 2;
  for (let i = 0; i < snap.lives; i += 1) {
    drawSheetCell(
      ctx,
      sheetImage(PAC_SHEET),
      lifeSheetCell(),
      lifeStart + i * gap,
      lifeY,
      lifeSize,
    );
  }

  const icons = snap.footerFruits ?? [];
  const fruitGap = cell * 2;
  let fx = w - cell * 0.85;
  for (const icon of icons) {
    drawFruit(ctx, fx / cell - 0.5, lifeY / cell - 0.5, cell, icon.id);
    fx -= fruitGap;
  }

  ctx.restore();
}

export { PACMAN_BOARD_EXTRA } from "./boardLayout";

export function PacmanBoard({ snap, boardW, boardH, getSnap }: Props) {
  const cssW = Math.max(1, Math.floor(boardW));
  const cssH = Math.max(1, Math.floor(boardH + PACMAN_BOARD_EXTRA));
  if (Platform.OS !== "web") {
    return <PacmanViewBoard snap={snap} cssW={cssW} cssH={cssH} />;
  }

  return <PacmanWebBoard snap={snap} cssW={cssW} cssH={cssH} getSnap={getSnap} />;
}

function PacmanWebBoard({
  snap,
  cssW,
  cssH,
  getSnap,
}: {
  snap: PacmanSnapshot;
  cssW: number;
  cssH: number;
  getSnap?: () => PacmanSnapshot;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const getSnapRef = useRef(getSnap);
  const snapRef = useRef(snap);
  getSnapRef.current = getSnap;
  snapRef.current = snap;

  useEffect(() => {
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

    sheetImage(PAC_SHEET);
    sheetImage(GHOSTS_SHEET);
    sheetImage(FRUITS_SHEET);
    sheetImage(PELLETS_SHEET);

    let raf = 0;
    const loop = () => {
      const s = getSnapRef.current ? getSnapRef.current() : snapRef.current;
      paint(ctx, s, cssW, cssH, dpr);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cssW, cssH]);

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
