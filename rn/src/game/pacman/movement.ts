import { COLS, canEnter, wrapX } from "./maze";
import { opposite, sameDir } from "./types";
import type { Dir } from "../dir";


export function snapCenter(
    x: number,
    y: number,
    dir: Dir,
): { x: number; y: number} {
    if (dir.x !== 0) return { x: Math.round(x), y };
    if (dir.y !== 0) return { x, y: Math.round(y) };
    return { x: Math.round(x), y: Math.round(y) };
}

export const CENTER_EPS = 0.05;
export function nearCenter(x: number, y: number, dir: Dir): boolean {
    if (dir.x !== 0) return Math.abs(x - Math.round(x)) <= CENTER_EPS;
    if (dir.y !== 0) return Math.abs(y - Math.round(y)) <= CENTER_EPS;
    return (
        Math.abs(x - Math.round(x)) <= CENTER_EPS &&
        Math.abs(y - Math.round(y)) <= CENTER_EPS
    );
}

export function distToNextCenter(pos: number, axis: number): number {
    const next = axis > 0 ? Math.floor(pos) + 1 : Math.ceil(pos) - 1;
    const d = Math.abs(next - pos);
    return d < 1e-9 ? 1 : d;
}

export type MoveOpts = {
    allowGate ?: boolean;
    allowHouse ?: boolean;
    turnAtCenter ?: boolean;
    chooseDir ?: (tx: number, ty: number, dir: Dir) => Dir;
};

export function moveActor(
    x: number,
    y: number,
    dir: Dir,
    queued: Dir | null,
    dist: number,
    opts ?: MoveOpts,
): {
    x: number; y: number; dir: Dir; queued: Dir | null
} {
    let cx = x;
    let cy = y;
    let cd = dir;
    let q = queued;
    let remaining = dist;
    const turnAtCenter = opts?.turnAtCenter !== false;
    if (q && sameDir(q, opposite(cd)) && !opts?.chooseDir) {
        cd = q;
        q = null;
    }
    while (remaining > 1e-6) {
      const tx = Math.round(cx);
      const ty = Math.round(cy);
      const atCenter = nearCenter(cx, cy, cd);
      if (atCenter && turnAtCenter) {
        const snapped = snapCenter(cx, cy, cd);
        cx = snapped.x;
        cy = snapped.y;
        if (opts?.chooseDir) {
          cd = opts.chooseDir(tx, ty, cd);
        } else if (q && !sameDir(q, cd)) {
          if (canEnter(tx + q.x, ty + q.y, opts)) {
            cd = q;
            q = null;
          }
        }
        if (!canEnter(tx + cd.x, ty + cd.y, opts)) {
          return { x: cx, y: cy, dir: cd, queued: q };
        }
      }
      let toCenter: number;
      if (cd.x !== 0) toCenter = distToNextCenter(cx, cd.x);
      else if (cd.y !== 0) toCenter = distToNextCenter(cy, cd.y);
      else return { x: cx, y: cy, dir: cd, queued: q };
      const step = Math.min(remaining, toCenter);
      const nx = cx + cd.x * step;
      const ny = cy + cd.y * step;
      if (atCenter && !canEnter(tx + cd.x, ty + cd.y, opts)) {
        return { x: cx, y: cy, dir: cd, queued: q };
      }
      cx = nx;
      cy = ny;
      remaining -= step;
      if (cx < -0.5) cx += COLS;
      if (cx >= COLS - 0.5) cx -= COLS;
    }
    return { x: cx, y: cy, dir: cd, queued: q };
}
