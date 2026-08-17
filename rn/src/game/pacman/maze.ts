import { DOOR_CHAR, MAZE_MAP, TILE_CHARS } from "./mazeData";

/**
 * Codes: 0 wall, 1 pellet, 2 empty, 3 power, 4 gate, 5 house, 6 void
 */
const CODES: Record<string, number> = {
  "#": 0,
  ".": 1,
  " ": 2,
  o: 3,
  _: 5,
  "~": 6,
};

function encode(ch: string): number {
  if (ch === DOOR_CHAR) return 4;
  if (TILE_CHARS.includes(ch)) return 0;
  const code = CODES[ch];
  if (code === undefined) throw new Error(`unknown maze char: ${ch}`);
  return code;
}

for (const row of MAZE_MAP) {
  if (row.length !== 28) {
    throw new Error(`maze row length ${row.length}: ${row}`);
  }
}

export const MAZE: number[][] = MAZE_MAP.map((row) =>
  row.split("").map(encode),
);

export const COLS = 28;
export const ROWS = MAZE.length;

/**
 * Actors straddle two columns rather than sitting in one. The board draws at
 * (x + 0.5) * cell, so a half tile here lands dead centre on the 28-wide maze.
 */
export const PAC_START = { x: 13.5, y: 23 };
export const FRUIT_POS = { x: 13.5, y: 17 };

export const GHOST_STARTS = [
  {
    id: "blinky",
    nickname: "SHADOW",
    color: "#ff0000",
    x: 13.5,
    y: 11,
    inHouse: false,
  },
  {
    id: "pinky",
    nickname: "SPEEDY",
    color: "#ffb8ff",
    x: 13.5,
    y: 14,
    inHouse: true,
  },
  {
    id: "inky",
    nickname: "BASHFUL",
    color: "#00ffff",
    x: 11.5,
    y: 14,
    inHouse: true,
  },
  {
    id: "clyde",
    nickname: "POKEY",
    color: "#ffb852",
    x: 15.5,
    y: 14,
    inHouse: true,
  },
];

export function wrapX(x: number): number {
  if (x < 0) return COLS - 1;
  if (x >= COLS) return 0;
  return x;
}

export function canEnter(
  x: number,
  y: number,
  opts?: { allowGate?: boolean; allowHouse?: boolean },
): boolean {
  const wx = wrapX(x);
  if (y < 0 || y >= ROWS) return false;
  if (x !== wx && y !== 14) return false;
  const t = MAZE[y][wx];
  if (t === 0 || t === 6) return false;
  // Gate (4): eyes going home. House pen (5): entering / leaving / pacing only.
  if (t === 4 && !opts?.allowGate) return false;
  if (t === 5 && !opts?.allowHouse) return false;
  return true;
}
