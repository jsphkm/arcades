import type { Dir } from "../dir";

export type GamePhase = 
    | "menu"
    | "ready"
    | "playing"
    | "paused"
    | "dying"
    | "dead"
    | "won";

export type GhostMode =
  | "scatter"
  | "chase"
  | "frightened"
  | "eaten" // eyes → door
  | "entering" // eyes down into pen
  | "house" // regenerated, pacing
  | "leaving"; // body up through door

export type Ghost = {
  id: string;
  nickname: string;
  color: string;
  /** tile-space floats */
  x: number;
  y: number;
  dir: Dir;
  mode: GhostMode;
  releaseIn: number;
  /** Superfast sigReverse — turn around at next tile center */
  sigReverse: boolean;
};

export type FruitKind = {
  id: string;
  label: string;
  points: number;
  color: string;
};

/** Floating score shown when a ghost or fruit is eaten. */
export type EatPopup = {
  x: number;
  y: number;
  points: number;
  left: number;
  /** Ghost-eat only: hide Pac while the 200–1600 is up. */
  hidePac?: boolean;
};

export type PacmanSnapshot = {
  phase: GamePhase;
  score: number;
  highScore: number;
  lives: number;
  stage: number;
  pac: { x: number; y: number; dir: Dir; mouth: number };
  ghosts: Ghost[];
  pellets: boolean[][];
  powers: boolean[][];
  fruit: { kind: FruitKind; x: number; y: number; left: number } | null;
  frightenedUntil: number;
  frightFlash: boolean;
  ghostEatStreak: number;
  eatPopup: EatPopup | null;
  frame: number;
  showInfo: boolean;
  /** 0–1 while dying; used to draw the collapse. */
  deathT: number;
  footerFruits: FruitKind[];
};

export const DIRS: Dir[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function opposite(d: Dir): Dir {
  return { x: -d.x, y: -d.y };
}

export function sameDir(a: Dir, b: Dir): boolean {
  return a.x === b.x && a.y === b.y;
}

const CHERRY: FruitKind = { id: "cherry", label: "Cherry", points: 100, color: "#ff2d55" };
const STRAWBERRY: FruitKind = { id: "strawberry", label: "Strawberry", points: 300, color: "#ff375f" };
const ORANGE: FruitKind = { id: "orange", label: "Orange", points: 500, color: "#ff9f0a" };
const APPLE: FruitKind = { id: "apple", label: "Apple", points: 700, color: "#ff3b30" };
const MELON: FruitKind = { id: "melon", label: "Melon", points: 1000, color: "#30d158" };
const GALAXIAN: FruitKind = { id: "galaxian", label: "Galaxian", points: 2000, color: "#ff9f0a" };
const BELL: FruitKind = { id: "bell", label: "Bell", points: 3000, color: "#ffd60a" };
const KEY: FruitKind = { id: "key", label: "Key", points: 5000, color: "#64d2ff" };

/** Unique kinds (info panel). Level 3–4 share orange, 5–6 apple, etc. */
export const FRUIT_TABLE: FruitKind[] = [
  CHERRY,
  STRAWBERRY,
  ORANGE,
  APPLE,
  MELON,
  GALAXIAN,
  BELL,
  KEY,
];

const FRUIT_BY_LEVEL: FruitKind[] = [
  CHERRY,
  STRAWBERRY,
  ORANGE,
  ORANGE,
  APPLE,
  APPLE,
  MELON,
  MELON,
  GALAXIAN,
  GALAXIAN,
  BELL,
  BELL,
  KEY,
];

export function fruitForStage(stage: number): FruitKind {
  const i = Math.min(FRUIT_BY_LEVEL.length - 1, Math.max(0, stage - 1));
  return FRUIT_BY_LEVEL[i];
}

const MAX_FOOTER_FRUITS = 7;
export function fruitsForFooter(stage: number): FruitKind[] {
  const n = Math.max(1, Math.floor(stage));
  const list: FruitKind[] = [];
  for (let s = 1; s <= n; s += 1) list.push(fruitForStage(s));
  return list.slice(-MAX_FOOTER_FRUITS);
}

/** Cabinet bonus numerals: 100 white, 300 pink, 500 cyan, ghosts cyan. */
export function bonusPointsColor(points: number): string {
  switch (points) {
    case 100:
    case 1000:
    case 5000:
      return "#ffffff";
    case 300:
    case 700:
    case 2000:
      return "#ffb8ff";
    default:
      return "#00ffff";
  }
}
