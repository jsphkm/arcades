import {
  COLS,
  FRUIT_POS,
  GHOST_STARTS,
  MAZE,
  PAC_START,
  ROWS,
  canEnter,
  wrapX,
} from "./maze";
import {
  FRUIT_TABLE,
  fruitForStage,
  opposite,
  sameDir,
  DIRS,
  type EatPopup,
  type FruitKind,
  type GamePhase,
  type Ghost,
  type PacmanSnapshot,
} from "./types";
import type { Dir } from "../dir";

const TILE_PX = 16;
const pxSpeed = (pxPerSec: number) => pxPerSec / TILE_PX;
const READY_SEC = 5;
const DYING_SEC = 2.5; // ~150 frames @ 60fps
const SPEED_PAC = pxSpeed(120); // 7.5
const SPEED_GHOST = pxSpeed(80); // 5
const SPEED_PAC_FRIGHT = SPEED_PAC;
const SPEED_GHOST_FRIGHT = pxSpeed(55); // 3.4375
const SPEED_GHOST_TUNNEL = pxSpeed(45); // 2.8125
const SPEED_GHOST_EATEN = pxSpeed(280); // 17.5
const MOUTH_FPS = 15;
const MOUTH_FRAMES = 3;

const SPEED_RATIO = [
  1, 1.02, 1.04, 1.06, 1.11, 1.16, 1.2, 1.24, 1.3, 1.35, 1.4, 1.45, 1.5, 1.52,
  1.55,
];

const ENERGIZER_SEC = [
  6, 5, 4.5, 4, 3.7, 3, 3.5, 3, 3, 2, 2, 1, 1, 1, 1, 1, 1, 1,
];

const FRUIT_AT = [25, 100, 180];
const FRUIT_LIFE = 9;
const GHOST_EAT_POINTS = [200, 400, 800, 1600];
export const POWER_BLINK_FRAMES = 20;
const POINTS_FREEZE_SEC = 1;
const EAT_PAUSE_PELLET = 1 / 60;
const EAT_PAUSE_POWER = 3 / 60;
const FRIGHT_FLASH_INTERVAL = 14 / 60;
const FRIGHT_FLASHES = [5, 5, 5, 5, 5, 5, 5, 5, 3, 5, 5, 3, 3, 5, 3, 3, 0, 3];
const CENTER_EPS = 0.05;
const COLLIDE_R2 = 0.45 * 0.45;
const DOOR = { x: 13, y: 11 };
const HOME = { x: 14, y: 14 };

type Engine = {
  phase: GamePhase;
  score: number;
  highScore: number;
  lives: number;
  stage: number;
  pacX: number;
  pacY: number;
  pacDir: Dir;
  queued: Dir | null;
  mouth: number;
  ghosts: Ghost[];
  pellets: boolean[][];
  powers: boolean[][];
  pelletLeft: number;
  pelletsEaten: number;
  fruit: { kind: FruitKind; x: number; y: number; left: number } | null;
  fruitIndex: number;
  frightenedLeft: number;
  ghostEatStreak: number;
  showInfo: boolean;
  time: number;
  waveT: number;
  /** Pac briefly pauses after eating a pellet */
  eatPauseLeft: number;
  /** After eating a ghost, freeze everyone except eyes */
  freezeLeft: number;
  eatPopup: EatPopup | null;
    readyLeft: number;
    dyingLeft: number;
    deathT: number;
};

let eng: Engine | null = null;

function emptyGrid(fill: boolean): boolean[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => fill),
  );
}

function buildPellets() {
  const pellets = emptyGrid(false);
  const powers = emptyGrid(false);
  let count = 0;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const t = MAZE[y][x];
      if (t === 1) {
        pellets[y][x] = true;
        count += 1;
      } else if (t === 3) {
        powers[y][x] = true;
        count += 1;
      }
    }
  }
  return { pellets, powers, count };
}

function speedRatio(stage: number): number {
  return SPEED_RATIO[Math.min(SPEED_RATIO.length - 1, Math.max(0, stage - 1))];
}

function resetGhosts(stage: number): Ghost[] {
  const delay = Math.max(0.4, 1.4 - stage * 0.08);
  return GHOST_STARTS.map((g, i) => ({
    id: g.id,
    nickname: g.nickname,
    color: g.color,
    x: g.x,
    y: g.y,
    dir: { x: g.inHouse ? 0 : -1, y: 0 } as Dir,
    mode: (g.inHouse ? "house" : "scatter") as Ghost["mode"],
    releaseIn: g.inHouse ? delay + i * delay : 0,
    sigReverse: false,
  }));
}

function resetPositions(e: Engine, keepPellets: boolean) {
  e.pacX = PAC_START.x;
  e.pacY = PAC_START.y;
  e.pacDir = { x: -1, y: 0 };
  e.queued = null;
  e.ghosts = resetGhosts(e.stage);
  e.frightenedLeft = 0;
  e.ghostEatStreak = 0;
  e.fruit = null;
  e.waveT = 0;
  e.eatPauseLeft = 0;
  e.freezeLeft = 0;
  e.eatPopup = null;
  if (!keepPellets) {
    const { pellets, powers, count } = buildPellets();
    e.pellets = pellets;
    e.powers = powers;
    e.pelletLeft = count;
    e.pelletsEaten = 0;
    e.fruitIndex = 0;
  }
}

function baseEngine(highScore: number): Engine {
  const { pellets, powers, count } = buildPellets();
  return {
    phase: "menu",
    score: 0,
    highScore,
    lives: 4,
    stage: 1,
    pacX: PAC_START.x,
    pacY: PAC_START.y,
    pacDir: { x: -1, y: 0 },
    queued: null,
    mouth: 0,
    ghosts: resetGhosts(1),
    pellets,
    powers,
    pelletLeft: count,
    pelletsEaten: 0,
    fruit: null,
    fruitIndex: 0,
    frightenedLeft: 0,
    ghostEatStreak: 0,
    showInfo: false,
    time: 0,
    waveT: 0,
    eatPauseLeft: 0,
    freezeLeft: 0,
    eatPopup: null,
        readyLeft: 0,
        dyingLeft: 0,
        deathT: 0,
  };
}

export function startPacman() {
  const high = eng?.highScore ?? 0;
  eng = baseEngine(high);
  eng.lives = 4;
  resetPositions(eng, false);
    beginReady(eng);
}

function beginReady(e: Engine) {
    e.phase = "ready";
    e.readyLeft = READY_SEC;
    e.dyingLeft = 0;
    e.deathT = 0;
}

export function setHighScore(value: number) {
  if (!eng) {
    eng = baseEngine(Math.max(0, Math.floor(value)));
    return;
  }
  if (Number.isFinite(value) && value > eng.highScore) {
    eng.highScore = Math.floor(value);
  }
}

export function queueDir(dir: Dir) {
  if (!eng || (eng.phase !== "playing" &&
        eng.phase !== "ready")) return;
  eng.queued = dir;
}

export function pressSelect() {
  if (!eng) return;
  eng.showInfo = !eng.showInfo;
  if (eng.showInfo && eng.phase === "playing") eng.phase = "paused";
  else if (!eng.showInfo && eng.phase === "paused") eng.phase = "playing";
}

export function pressStart() {
  if (!eng) {
    startPacman();
    return;
  }
  if (eng.showInfo) {
    eng.showInfo = false;
    if (eng.phase === "paused") eng.phase = "playing";
    return;
  }
  if (eng.phase === "menu" || eng.phase === "dead" || eng.phase === "won") {
    startPacman();
    return;
  }
  if (eng.phase === "playing") eng.phase = "paused";
  else if (eng.phase === "paused") eng.phase = "playing";
}

export function pressA() {
  pressStart();
}
export function pressB() {
  pressSelect();
}

function addScore(e: Engine, n: number) {
  e.score += n;
  if (e.score > e.highScore) e.highScore = e.score;
}

function tileOf(x: number, y: number): { x: number; y: number } {
  return { x: Math.round(x), y: Math.round(y) };
}

function nearCenter(x: number, y: number): boolean {
  return (
    Math.abs(x - Math.round(x)) <= CENTER_EPS &&
    Math.abs(y - Math.round(y)) <= CENTER_EPS
  );
}

function snapCenter(x: number, y: number): { x: number; y: number } {
  return { x: Math.round(x), y: Math.round(y) };
}

function isTunnelTile(tx: number, ty: number): boolean {
  return ty === 14 && (tx <= 5 || tx >= COLS - 6);
}

function penOpts(mode: Ghost["mode"]): {
  allowGate?: boolean;
  allowHouse?: boolean;
} {
  // Eyes may cross the gate but must not seep in through side tunnels.
  if (mode === "eaten") return { allowGate: true, allowHouse: false };
  if (mode === "entering" || mode === "leaving" || mode === "house") {
    return { allowGate: true, allowHouse: true };
  }
  return {};
}

function ghostOptions(
  tx: number,
  ty: number,
  dir: Dir,
  mode: Ghost["mode"],
): Dir[] {
  const pass = penOpts(mode);
  const opts: Dir[] = [];
  for (const d of DIRS) {
    // Never reverse on the first pass (eyes included — prevents home path loops).
    if (sameDir(d, opposite(dir))) continue;
    if (canEnter(tx + d.x, ty + d.y, pass)) opts.push(d);
  }
  if (opts.length === 0) {
    for (const d of DIRS) {
      if (canEnter(tx + d.x, ty + d.y, pass)) opts.push(d);
    }
  }
  return opts;
}

function atDoorTile(g: Ghost): boolean {
  const tx = Math.round(g.x);
  const ty = Math.round(g.y);
  // Gate column is x=13..14; door row is the open tile above the gate.
  return ty === DOOR.y && (tx === 13 || tx === 14);
}

/**
 * Shortest-path next step toward the ghost door (eyes). Greedy targeting
 * oscillates when reverse is allowed; BFS matches Superfast getExitDir intent.
 */
function bfsStepToDoor(tx: number, ty: number): Dir | null {
  if (ty === DOOR.y && (tx === 13 || tx === 14)) return null;
  const pass = { allowGate: true, allowHouse: false };
  const q: { x: number; y: number }[] = [{ x: tx, y: ty }];
  const came = new Map<string, { x: number; y: number; d: Dir }>();
  const startKey = `${tx},${ty}`;
  came.set(startKey, { x: tx, y: ty, d: { x: 0, y: 0 } });
  let head = 0;
  let found: { x: number; y: number } | null = null;
  while (head < q.length) {
    const cur = q[head++];
    if (cur.y === DOOR.y && (cur.x === 13 || cur.x === 14)) {
      found = cur;
      break;
    }
    for (const d of DIRS) {
      if (!canEnter(cur.x + d.x, cur.y + d.y, pass)) continue;
      const nx = wrapX(cur.x + d.x);
      const ny = cur.y + d.y;
      const key = `${nx},${ny}`;
      if (came.has(key)) continue;
      came.set(key, { x: cur.x, y: cur.y, d });
      q.push({ x: nx, y: ny });
    }
  }
  if (!found) return null;
  // Walk back to the step leaving the start tile.
  let cx = found.x;
  let cy = found.y;
  let step: Dir | null = null;
  for (;;) {
    const key = `${cx},${cy}`;
    const prev = came.get(key);
    if (!prev || (cx === tx && cy === ty)) break;
    step = prev.d;
    if (prev.x === tx && prev.y === ty) return step;
    cx = prev.x;
    cy = prev.y;
  }
  return step;
}

function pickGhostDir(
  g: Ghost,
  tx: number,
  ty: number,
  dir: Dir,
  target: { x: number; y: number },
): Dir {
  // Apply reverse at tile center, then keep that heading.
  if (g.sigReverse) {
    g.sigReverse = false;
    const rev = opposite(dir);
    if (canEnter(tx + rev.x, ty + rev.y, penOpts(g.mode))) {
      return rev;
    }
  }

  if (g.mode === "eaten") {
    const step = bfsStepToDoor(tx, ty);
    if (step) return step;
  }

  const opts = ghostOptions(tx, ty, dir, g.mode);
  if (opts.length === 0) return dir;
  if (g.mode === "frightened") {
    return opts[Math.floor(Math.random() * opts.length)];
  }
  let best = opts[0];
  let bestDist = Infinity;
  for (const d of opts) {
    const nx = wrapX(tx + d.x);
    const ny = ty + d.y;
    const dist = (nx - target.x) ** 2 + (ny - target.y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

function ghostTarget(g: Ghost, e: Engine): { x: number; y: number } {
  const pt = tileOf(e.pacX, e.pacY);
  if (g.mode === "eaten") return { ...DOOR };
  if (g.mode === "entering") return { ...HOME };
  if (g.mode === "leaving") return { ...DOOR };
  if (g.mode === "house") return { ...HOME };
  if (g.mode === "scatter") {
    if (g.id === "blinky") return { x: COLS - 2, y: 0 };
    if (g.id === "pinky") return { x: 2, y: 0 };
    if (g.id === "inky") return { x: COLS - 1, y: ROWS - 2 };
    return { x: 0, y: ROWS - 2 };
  }
  if (g.id === "pinky") {
    return { x: pt.x + e.pacDir.x * 4, y: pt.y + e.pacDir.y * 4 };
  }
  if (g.id === "inky") {
    const ax = pt.x + e.pacDir.x * 2;
    const ay = pt.y + e.pacDir.y * 2;
    const blinky = e.ghosts.find((x) => x.id === "blinky");
    if (blinky) {
      const bt = tileOf(blinky.x, blinky.y);
      return { x: ax * 2 - bt.x, y: ay * 2 - bt.y };
    }
  }
  if (g.id === "clyde") {
    const gt = tileOf(g.x, g.y);
    const dist = (gt.x - pt.x) ** 2 + (gt.y - pt.y) ** 2;
    if (dist < 64) return { x: 0, y: ROWS - 2 };
  }
  return pt;
}

function ghostSpeed(g: Ghost, e: Engine): number {
  const ratio = speedRatio(e.stage);
  if (g.mode === "eaten" || g.mode === "entering")
    return SPEED_GHOST_EATEN * ratio;
  if (g.mode === "house" || g.mode === "leaving")
    return SPEED_GHOST_TUNNEL * ratio;
  const t = tileOf(g.x, g.y);
  if (isTunnelTile(t.x, t.y)) return SPEED_GHOST_TUNNEL * ratio;
  if (g.mode === "frightened") return SPEED_GHOST_FRIGHT * ratio;
  return SPEED_GHOST * ratio;
}

function outsideMode(e: Engine): Ghost["mode"] {
  return e.waveT % 27 < 7 ? "scatter" : "chase";
}

/** Advance one ghost through the house FSM + movement. */
function tickGhost(g: Ghost, e: Engine, t: number) {
  // Door reached → lerp straight down into the pen (no grid steering).
  if (g.mode === "eaten" && atDoorTile(g)) {
    g.mode = "entering";
    g.x = HOME.x;
    g.y = DOOR.y;
    g.dir = { x: 0, y: 1 };
    g.releaseIn = 0; // reuse as enter/leave progress 0→1
  }

  if (g.mode === "entering") {
    const enterSec = 0.28;
    g.releaseIn = Math.min(1, g.releaseIn + t / enterSec);
    g.x = HOME.x;
    g.y = DOOR.y + (HOME.y - DOOR.y) * g.releaseIn;
    g.dir = { x: 0, y: 1 };
    if (g.releaseIn >= 1) {
      g.mode = "house";
      g.x = HOME.x;
      g.y = HOME.y;
      g.dir = { x: 0, y: -1 };
      g.releaseIn = 0.4;
    }
    return;
  }

  if (g.mode === "house") {
    g.releaseIn -= t;
    const bob = Math.sin(e.time * 6 + g.x) * 0.12;
    // Keep lateral house slots (inky/clyde); regenerated eyes already at HOME.x.
    g.y = HOME.y + bob;
    if (g.releaseIn <= 0) {
      g.mode = "leaving";
      g.x = HOME.x;
      g.y = HOME.y;
      g.dir = { x: 0, y: -1 };
      g.releaseIn = 0; // leave progress
    }
    return;
  }

  if (g.mode === "leaving") {
    const leaveSec = 0.28;
    g.releaseIn = Math.min(1, g.releaseIn + t / leaveSec);
    g.x = HOME.x;
    g.y = HOME.y + (DOOR.y - HOME.y) * g.releaseIn;
    g.dir = { x: 0, y: -1 };
    if (g.releaseIn >= 1) {
      g.x = HOME.x;
      g.y = DOOR.y;
      g.mode = e.frightenedLeft > 0 ? "frightened" : outsideMode(e);
      g.dir = { x: -1, y: 0 };
      g.sigReverse = false;
      g.releaseIn = 0;
    }
    return;
  }

  if (
    e.frightenedLeft <= 0 &&
    (g.mode === "scatter" || g.mode === "chase")
  ) {
    g.mode = outsideMode(e);
  }

  const target = ghostTarget(g, e);
  const gm = moveActor(g.x, g.y, g.dir, null, ghostSpeed(g, e) * t, {
    ...penOpts(g.mode),
    turnAtCenter: true,
    chooseDir: (tx, ty, dir) => pickGhostDir(g, tx, ty, dir, target),
  });
  g.x = gm.x;
  g.y = gm.y;
  g.dir = gm.dir;
}

/**
 * Axis-aligned move with center turns / wall stops — no sub-tile jitter.
 */
function moveActor(
  x: number,
  y: number,
  dir: Dir,
  queued: Dir | null,
  dist: number,
  opts?: {
    allowGate?: boolean;
    turnAtCenter?: boolean;
    /** Ghost AI: pick a new heading whenever a tile center is reached. */
    chooseDir?: (tx: number, ty: number, dir: Dir) => Dir;
  },
): { x: number; y: number; dir: Dir; queued: Dir | null } {
  let cx = x;
  let cy = y;
  let cd = dir;
  let q = queued;
  let remaining = dist;
  const turnAtCenter = opts?.turnAtCenter !== false;

  // Classic Pac-Man: reverse is allowed immediately, not only at centers.
  if (q && sameDir(q, opposite(cd)) && !opts?.chooseDir) {
    cd = q;
    q = null;
  }

  while (remaining > 1e-6) {
    const tx = Math.round(cx);
    const ty = Math.round(cy);
    const atCenter = nearCenter(cx, cy);

    if (atCenter && turnAtCenter) {
      const snapped = snapCenter(cx, cy);
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
        // Stop flush on center when blocked.
        return { x: cx, y: cy, dir: cd, queued: q };
      }
    }

    // Distance to next tile center along current axis.
    let toCenter: number;
    if (cd.x !== 0) {
      const next = cd.x > 0 ? Math.floor(cx) + 1 : Math.ceil(cx) - 1;
      toCenter = Math.abs(next - cx);
      if (toCenter < 1e-9) toCenter = 1;
    } else if (cd.y !== 0) {
      const next = cd.y > 0 ? Math.floor(cy) + 1 : Math.ceil(cy) - 1;
      toCenter = Math.abs(next - cy);
      if (toCenter < 1e-9) toCenter = 1;
    } else {
      return { x: cx, y: cy, dir: cd, queued: q };
    }

    const step = Math.min(remaining, toCenter);
    const nx = cx + cd.x * step;
    const ny = cy + cd.y * step;

    // Before leaving current center toward a blocked tile, halt.
    if (atCenter && !canEnter(tx + cd.x, ty + cd.y, opts)) {
      return { x: cx, y: cy, dir: cd, queued: q };
    }

    cx = nx;
    cy = ny;
    remaining -= step;

    // Tunnel wrap
    if (cx < -0.5) cx += COLS;
    if (cx >= COLS - 0.5) cx -= COLS;
  }

  return { x: cx, y: cy, dir: cd, queued: q };
}

function eatAt(e: Engine) {
  const t = tileOf(e.pacX, e.pacY);
  if (e.pellets[t.y]?.[t.x]) {
    e.pellets[t.y][t.x] = false;
    e.pelletLeft -= 1;
    e.pelletsEaten += 1;
    addScore(e, 10);
    e.eatPauseLeft = Math.max(e.eatPauseLeft, EAT_PAUSE_PELLET);
    maybeSpawnFruit(e);
  }
  if (e.powers[t.y]?.[t.x]) {
    e.powers[t.y][t.x] = false;
    e.pelletLeft -= 1;
    e.pelletsEaten += 1;
    addScore(e, 50);
    e.eatPauseLeft = Math.max(e.eatPauseLeft, EAT_PAUSE_POWER);
    const idx = Math.min(ENERGIZER_SEC.length - 1, e.stage - 1);
    e.frightenedLeft = ENERGIZER_SEC[idx];
    e.ghostEatStreak = 0;
    for (const g of e.ghosts) {
      if (
        g.mode !== "eaten" &&
        g.mode !== "entering" &&
        g.mode !== "house" &&
        g.mode !== "leaving"
      ) {
        g.mode = "frightened";
        // Superfast onEnergized: reverse at next center, don't hard-stop.
        g.sigReverse = true;
      }
    }
  }
  if (
    e.fruit &&
    Math.abs(e.fruit.x - e.pacX) < 0.55 &&
    Math.abs(e.fruit.y - e.pacY) < 0.55
  ) {
    addScore(e, e.fruit.kind.points);
    e.fruit = null;
  }
}

function collide(e: Engine) {
  for (const g of e.ghosts) {
    const dx = g.x - e.pacX;
    const dy = g.y - e.pacY;
    if (dx * dx + dy * dy > COLLIDE_R2) continue;
    if (g.mode === "frightened") {
      g.mode = "eaten";
      g.sigReverse = false;
      g.dir = { x: 0, y: g.y < DOOR.y ? 1 : -1 };
      const pts =
        GHOST_EAT_POINTS[
          Math.min(e.ghostEatStreak, GHOST_EAT_POINTS.length - 1)
        ];
      e.ghostEatStreak += 1;
      addScore(e, pts);
      e.eatPopup = {
        x: g.x,
        y: g.y,
        points: pts,
        left: POINTS_FREEZE_SEC,
      };
      // Superfast: freeze Pac + living ghosts while points show.
      e.freezeLeft = POINTS_FREEZE_SEC;
    } else if (
      g.mode !== "eaten" &&
      g.mode !== "entering" &&
      g.mode !== "house" &&
      g.mode !== "leaving"
    ) {
      e.lives -= 1;
        e.phase = "dying";
            e.dyingLeft = DYING_SEC;
            e.deathT = 0;
            e.eatPopup = null;
            e.freezeLeft = 0;
      return;
    }
  }
}

function maybeSpawnFruit(e: Engine) {
  // Superfast: RF_FRUIT_GEN_DOT_LIMIT_LIST.includes(map.dotsEaten)
  if (e.fruit || !FRUIT_AT.includes(e.pelletsEaten)) return;
  if (e.fruitIndex >= FRUIT_AT.length) return;
  // Skip if this threshold was already used (e.g. after a missed frame).
  const slot = FRUIT_AT.indexOf(e.pelletsEaten);
  if (slot < e.fruitIndex) return;
  e.fruit = {
    kind: fruitForStage(e.stage),
    x: FRUIT_POS.x,
    y: FRUIT_POS.y,
    left: FRUIT_LIFE,
  };
  e.fruitIndex = slot + 1;
}

function advanceStage(e: Engine) {
  e.stage += 1;
  resetPositions(e, false);
    beginReady(e);
}

function frightFlash(e: Engine): boolean {
  if (e.frightenedLeft <= 0) return false;
  const flashes =
    FRIGHT_FLASHES[Math.min(FRIGHT_FLASHES.length - 1, e.stage - 1)] ?? 5;
  if (flashes <= 0) return false;
  const band = Math.floor(e.frightenedLeft / FRIGHT_FLASH_INTERVAL);
  // Flash only in the final 2*flashes-1 bands.
  if (band > 2 * flashes - 1) return false;
  return band % 2 === 0;
}

/** Continuous sim step — call from rAF with dt seconds. */
export function tickPacman(dt = 1 / 60): GamePhase {
  if (!eng) return "menu";
  if (
        eng.phase !== "playing" &&
        eng.phase !== "ready" &&
        eng.phase !== "dying"
    ) return eng.phase;

  const e = eng;
  const t = Math.min(0.05, Math.max(0, dt));
  e.time += t;

    if (e.phase === "ready") {
        e.readyLeft -= t;
        if (e.readyLeft <= 0) e.phase = "playing";
        return e.phase;
    }
    if (e.phase === "dying") {
        e.dyingLeft -= t;
        e.deathT = 1 - Math.max(0, e.dyingLeft) / DYING_SEC;
        if (e.dyingLeft <= 0) {
            if (e.lives <= 0) e.phase = "dead";
            else {
                    resetPositions(e, true);
                    beginReady(e);
            }
        }
        return e.phase;
    }
  if (e.eatPopup) {
    e.eatPopup.left -= t;
    if (e.eatPopup.left <= 0) e.eatPopup = null;
  }

  // Points freeze: only eyes / entering move.
  if (e.freezeLeft > 0) {
    e.freezeLeft -= t;
    for (const g of e.ghosts) {
      if (g.mode === "eaten" || g.mode === "entering") {
        tickGhost(g, e, t);
      }
    }
    return e.phase;
  }

  e.waveT += t;

  if (e.frightenedLeft > 0) {
    e.frightenedLeft -= t;
    if (e.frightenedLeft <= 0) {
      e.frightenedLeft = 0;
      e.ghostEatStreak = 0;
      for (const g of e.ghosts) {
        if (g.mode === "frightened") g.mode = "chase";
      }
    }
  }
  if (e.fruit) {
    e.fruit.left -= t;
    if (e.fruit.left <= 0) e.fruit = null;
  }

  if (e.eatPauseLeft > 0) {
    e.eatPauseLeft -= t;
  } else {
    const ratio = speedRatio(e.stage);
    const pacSp =
      (e.frightenedLeft > 0 ? SPEED_PAC_FRIGHT : SPEED_PAC) * ratio;
    const moved = moveActor(
      e.pacX,
      e.pacY,
      e.pacDir,
      e.queued,
      pacSp * t,
    );
    e.pacX = moved.x;
    e.pacY = moved.y;
    e.pacDir = moved.dir;
    e.queued = moved.queued;
    // Pause munch when Pac is frozen/idle; advance only while moving.
    e.mouth = (e.mouth + t * MOUTH_FPS) % MOUTH_FRAMES;
    eatAt(e);
  }

  collide(e);
  if (e.phase !== "playing") return e.phase;

  for (const g of e.ghosts) {
    tickGhost(g, e, t);
  }
  collide(e);

  if (e.phase === "playing" && e.pelletLeft <= 0) {
    advanceStage(e);
  }
  return e.phase;
}

/** Whether frightened ghosts should draw white (end-of-fright flash). */
export function isFrightFlash(): boolean {
  return eng ? frightFlash(eng) : false;
}

export function getPacmanSnapshot(): PacmanSnapshot {
  if (!eng) {
    return {
            deathT: 0,
      phase: "menu",
      score: 0,
      highScore: 0,
      lives: 4,
      stage: 1,
      pac: { x: PAC_START.x, y: PAC_START.y, dir: { x: -1, y: 0 }, mouth: 0 },
      ghosts: resetGhosts(1),
      pellets: emptyGrid(false),
      powers: emptyGrid(false),
      fruit: null,
      frightenedUntil: 0,
      frightFlash: false,
      ghostEatStreak: 0,
      eatPopup: null,
      frame: 0,
      showInfo: false,
    };
  }
  return {
        deathT: eng?.deathT ?? 0,
    phase: eng.phase,
    score: eng.score,
    highScore: eng.highScore,
    lives: eng.lives,
    stage: eng.stage,
    pac: {
      x: eng.pacX,
      y: eng.pacY,
      dir: eng.pacDir,
      mouth: eng.mouth,
    },
    ghosts: eng.ghosts.map((g) => ({ ...g, dir: { ...g.dir } })),
    pellets: eng.pellets,
    powers: eng.powers,
    fruit: eng.fruit
      ? { ...eng.fruit, kind: { ...eng.fruit.kind } }
      : null,
    frightenedUntil: eng.frightenedLeft,
    frightFlash: frightFlash(eng),
    ghostEatStreak: eng.ghostEatStreak,
    eatPopup: eng.eatPopup ? { ...eng.eatPopup } : null,
    frame: Math.floor(eng.time * 60),
    showInfo: eng.showInfo,
  };
}

export { FRUIT_TABLE, SPEED_RATIO };
