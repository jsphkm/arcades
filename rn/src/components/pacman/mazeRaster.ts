import { COLS, ROWS } from "../../game/pacman/maze";
import { MAZE_MAP, TILE_CHARS, TILES } from "../../game/pacman/mazeData";
import { TILE_PX } from "./boardLayout";

const WALL = [0x2c, 0x35, 0xda, 0xff] as const;
const GATE = [0xff, 0xb8, 0xff, 0xff] as const;

export type MazePixels = {
  width: number;
  height: number;
  data: Uint8Array;
};

function fillRect(
  data: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgba: readonly [number, number, number, number],
) {
  const left = Math.max(0, Math.min(x0, x1));
  const right = Math.min(width, Math.max(x0, x1));
  const top = Math.max(0, Math.min(y0, y1));
  const bottom = Math.min(height, Math.max(y0, y1));
  for (let y = top; y < bottom; y += 1) {
    let i = (y * width + left) * 4;
    for (let x = left; x < right; x += 1) {
      data[i] = rgba[0];
      data[i + 1] = rgba[1];
      data[i + 2] = rgba[2];
      data[i + 3] = rgba[3];
      i += 4;
    }
  }
}

let cached: { key: string; pixels: MazePixels } | null = null;

/** Device-pixel maze atlas. Transparent where there is no wall art. */
export function rasterizeMaze(cell: number, dpr: number): MazePixels {
  const width = Math.max(1, Math.round(COLS * cell * dpr));
  const height = Math.max(1, Math.round(ROWS * cell * dpr));
  const key = `${width}x${height}`;
  if (cached?.key === key) return cached.pixels;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < MAZE_MAP.length; y += 1) {
    const row = MAZE_MAP[y];
    const y0 = Math.round((y * height) / ROWS);
    const y1 = Math.round(((y + 1) * height) / ROWS);
    const th = Math.max(1, y1 - y0);
    for (let x = 0; x < row.length; x += 1) {
      const tile = TILES[TILE_CHARS.indexOf(row[x])];
      if (!tile) continue;
      const x0 = Math.round((x * width) / COLS);
      const x1 = Math.round(((x + 1) * width) / COLS);
      const tw = Math.max(1, x1 - x0);
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
          const px0 = x0 + Math.round((tx * tw) / TILE_PX);
          const px1 = x0 + Math.round((end * tw) / TILE_PX);
          const py0 = y0 + Math.round((ty * th) / TILE_PX);
          const py1 = y0 + Math.round(((ty + 1) * th) / TILE_PX);
          fillRect(
            data,
            width,
            height,
            px0,
            py0,
            Math.max(px0 + 1, px1),
            Math.max(py0 + 1, py1),
            ch === "=" ? GATE : WALL,
          );
          tx = end;
        }
      }
    }
  }

  const pixels = { width, height, data };
  cached = { key, pixels };
  return pixels;
}
