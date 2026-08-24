import { Asset } from "expo-asset";
import type { ImageSourcePropType } from "react-native";
import type { Dir } from "../../game/dir";
import type { Ghost } from "../../game/pacman/types";

export const GHOSTS_SHEET = require("../../../assets/pacman/ghosts.png") as ImageSourcePropType;
export const PAC_SHEET = require("../../../assets/pacman/pacman.png") as ImageSourcePropType;
export const FRUITS_SHEET = require("../../../assets/pacman/fruits.png") as ImageSourcePropType;
export const PELLETS_SHEET = require("../../../assets/pacman/pellets.png") as ImageSourcePropType;

/** RN web has no Image.resolveAssetSource. expo-asset covers module ids and `{ uri }`. */
export function sheetUri(source: unknown): string | null {
  if (typeof source === "string" && source) return source;
  try {
    const asset = Asset.fromModule(
      source as number | string | { uri: string; width: number; height: number },
    );
    return asset.uri || null;
  } catch {
    return null;
  }
}

/** Source cell size. Both sheets are 2× arcade (16px actors). */
export const SPRITE_CELL = 32;
export const GHOST_SHEET_COLS = 12;
export const GHOST_SHEET_ROWS = 4;
export const PAC_SHEET_COLS = 14;
export const PAC_SHEET_ROWS = 1;
export const FRUIT_SHEET_COLS = 8;
export const FRUIT_SHEET_ROWS = 1;
export const PELLET_SHEET_COLS = 2;
export const PELLET_SHEET_ROWS = 1;

const FRUIT_COL: Record<string, number> = {
  cherry: 0,
  strawberry: 1,
  orange: 2,
  apple: 3,
  melon: 4,
  galaxian: 5,
  bell: 6,
  key: 7,
};

const GHOST_ROW: Record<string, number> = {
  blinky: 0,
  pinky: 1,
  inky: 2,
  clyde: 3,
};

export type SheetCell = {
  col: number;
  row: number;
  flipX: boolean;
  rotateDeg: number;
};

function dirIndex(dir: Dir): number {
  if (dir.x > 0) return 0;
  if (dir.x < 0) return 1;
  if (dir.y < 0) return 2;
  return 3;
}

export function ghostSheetCell(
  ghost: Pick<Ghost, "id" | "dir" | "mode">,
  frame: number,
  frightFlash: boolean,
): SheetCell {
  const walk = Math.floor(frame / 8) % 2;
  if (ghost.mode === "eaten" || ghost.mode === "entering") {
    return { col: 8 + dirIndex(ghost.dir), row: 1, flipX: false, rotateDeg: 0 };
  }
  if (ghost.mode === "frightened") {
    return {
      col: (frightFlash ? 10 : 8) + walk,
      row: 0,
      flipX: false,
      rotateDeg: 0,
    };
  }
  return {
    col: dirIndex(ghost.dir) * 2 + walk,
    row: GHOST_ROW[ghost.id] ?? 0,
    flipX: false,
    rotateDeg: 0,
  };
}

/** Sheet order is wide, mid, closed — engine mouth is closed, mid, wide.
 *  Munch frames face right; flip/rotate from that. */
export function pacSheetCell(
  mouth: number,
  dir: Dir,
  dying = false,
  deathT = 0,
): SheetCell {
  if (dying) {
    const col = 3 + Math.min(10, Math.floor(Math.max(0, deathT) * 11));
    return { col, row: 0, flipX: false, rotateDeg: 0 };
  }
  const col = 2 - (Math.floor(mouth) % 3);
  if (dir.x < 0) return { col, row: 0, flipX: true, rotateDeg: 0 };
  if (dir.y < 0) return { col, row: 0, flipX: false, rotateDeg: -90 };
  if (dir.y > 0) return { col, row: 0, flipX: false, rotateDeg: 90 };
  return { col, row: 0, flipX: false, rotateDeg: 0 };
}

/** Footer lives: second munch frame (half-open, facing right). */
export function lifeSheetCell(): SheetCell {
  return { col: 1, row: 0, flipX: false, rotateDeg: 0 };
}

export function fruitSheetCell(id: string): SheetCell {
  return { col: FRUIT_COL[id] ?? 0, row: 0, flipX: false, rotateDeg: 0 };
}

export function pelletSheetCell(kind: "dot" | "energizer"): SheetCell {
  return { col: kind === "energizer" ? 1 : 0, row: 0, flipX: false, rotateDeg: 0 };
}
