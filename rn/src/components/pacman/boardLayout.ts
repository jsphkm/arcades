import { COLS, ROWS } from "../../game/pacman/maze";

export const ACTOR_PAC = 2;
export const ACTOR_GHOST = 2;
export const ACTOR_FRUIT = 2;
export const DOT_SIZE = 0.25;
export const POWER_DIAM = 1;
export const LIFE_PAC = 2;
export const ACTOR_EDGE_PAD = 0.5;
export const TILE_PX = 8;
/** Extra canvas height for life band + actor edge pad */
export const PACMAN_BOARD_EXTRA = 36;

export type BoardLayout = {
  cell: number;
  mazeW: number;
  mazeH: number;
  ox: number;
  oy: number;
  lifeBand: number;
  lifeY: number;
};

export function boardLayout(
  width: number,
  height: number,
  dpr = 1,
): BoardLayout {
  const lifeBandGuess = Math.max(22, Math.min(36, height * 0.07));
  const playH = height - lifeBandGuess;
  let cell = Math.min(width / COLS, playH / (ROWS + ACTOR_EDGE_PAD));
  const mazePxW = Math.max(1, Math.round(COLS * cell * dpr));
  const mazePxH = Math.max(1, Math.round(ROWS * cell * dpr));
  cell = mazePxW / COLS / dpr;
  const mazeW = mazePxW / dpr;
  const mazeH = mazePxH / dpr;
  const lifeBand = Math.max(cell * LIFE_PAC * 1.35, lifeBandGuess * 0.85);
  const ox = (width - mazeW) / 2;
  const topPad = cell * ACTOR_EDGE_PAD * 0.5;
  const usable = height - lifeBand - topPad;
  const oy = topPad + Math.max(0, (usable - mazeH) / 2);
  return {
    cell,
    mazeW,
    mazeH,
    ox,
    oy,
    lifeBand,
    lifeY: mazeH + lifeBand * 0.55,
  };
}
