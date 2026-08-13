/**
 * Classic Pac-Man maze (Superfast mapPacman playable rows).
 * Codes: 0 wall, 1 pellet, 2 empty, 3 power, 4 gate, 5 house, 6 void
 */
const RAW = [
  "||||||||||||||||||||||||||||",
  "|............||............|",
  "|.||||.|||||.||.|||||.||||.|",
  "|o||||.|||||.||.|||||.||||o|",
  "|.||||.|||||.||.|||||.||||.|",
  "|..........................|",
  "|.||||.||.||||||||.||.||||.|",
  "|.||||.||.||||||||.||.||||.|",
  "|......||....||....||......|",
  "||||||.||||| || |||||.||||||",
  "_____|.||||| || |||||.|_____",
  "_____|.||          ||.|_____",
  "_____|.|| |||--||| ||.|_____",
  "||||||.|| |______| ||.||||||",
  "      .   |______|   .      ",
  "||||||.|| |______| ||.||||||",
  "_____|.|| |||||||| ||.|_____",
  "_____|.||          ||.|_____",
  "_____|.|| |||||||| ||.|_____",
  "||||||.|| |||||||| ||.||||||",
  "|............||............|",
  "|.||||.|||||.||.|||||.||||.|",
  "|.||||.|||||.||.|||||.||||.|",
  "|o..||.......  .......||..o|",
  "|||.||.||.||||||||.||.||.|||",
  "|||.||.||.||||||||.||.||.|||",
  "|......||....||....||......|",
  "|.||||||||||.||.||||||||||.|",
  "|.||||||||||.||.||||||||||.|",
  "|..........................|",
  "||||||||||||||||||||||||||||",
];

function encode(ch: string, x: number, y: number): number {
  if (ch === "|") return 0;
  if (ch === ".") return 1;
  if (ch === "o") return 3;
  if (ch === "-") return 4;
  // Ghost-house interior
  if (y >= 13 && y <= 15 && x >= 11 && x <= 16) {
    if (ch === "_" || ch === " ") return 5;
  }
  if (ch === "_") return 6;
  return 2;
}

for (const row of RAW) {
  if (row.length !== 28) {
    throw new Error(`maze row length ${row.length}: ${row}`);
  }
}

export const MAZE: number[][] = RAW.map((row, y) =>
  row.split("").map((ch, x) => encode(ch, x, y)),
);

export const COLS = 28;
export const ROWS = MAZE.length;

export const PAC_START = { x: 14, y: 23 };
export const FRUIT_POS = { x: 14, y: 17 };

/** Classic arcade ghost colors (Namco palette). */
export const GHOST_STARTS = [
  {
    id: "blinky",
    nickname: "SHADOW",
    color: "#ff0000",
    x: 14,
    y: 11,
    inHouse: false,
  },
  {
    id: "pinky",
    nickname: "SPEEDY",
    color: "#ffb8ff",
    x: 14,
    y: 14,
    inHouse: true,
  },
  {
    id: "inky",
    nickname: "BASHFUL",
    color: "#00ffff",
    x: 12,
    y: 14,
    inHouse: true,
  },
  {
    id: "clyde",
    nickname: "POKEY",
    color: "#ffb852",
    x: 16,
    y: 14,
    inHouse: true,
  },
];

export function isWall(x: number, y: number): boolean {
  if (y < 0 || y >= ROWS) return true;
  if (x < 0 || x >= COLS) return false;
  const t = MAZE[y][x];
  return t === 0 || t === 6;
}

export function isGate(x: number, y: number): boolean {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  return MAZE[y][x] === 4;
}

export function isHouse(x: number, y: number): boolean {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  const t = MAZE[y][x];
  return t === 5 || t === 4;
}

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
