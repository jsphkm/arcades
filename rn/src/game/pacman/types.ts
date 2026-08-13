export type Dir = { x: number; y: number };

export type GamePhase = "menu" | "playing" | "paused" | "dead" | "won";

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

/** Floating score shown when a ghost is eaten (200 → 1600). */
export type EatPopup = {
  x: number;
  y: number;
  points: number;
  left: number;
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
  /** End-of-fright white flash (Superfast energizer.isFlash). */
  frightFlash: boolean;
  ghostEatStreak: number;
  eatPopup: EatPopup | null;
  frame: number;
  showInfo: boolean;
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

/** Superfast RF_FRUIT_POINTS */
export const FRUIT_TABLE: FruitKind[] = [
  { id: "cherry", label: "Cherry", points: 1000, color: "#ff2d55" },
  { id: "strawberry", label: "Strawberry", points: 1200, color: "#ff375f" },
  { id: "orange", label: "Orange", points: 1500, color: "#ff9f0a" },
  { id: "apple", label: "Apple", points: 1800, color: "#ff3b30" },
  { id: "melon", label: "Melon", points: 2000, color: "#30d158" },
  { id: "grapes", label: "Grapes", points: 2300, color: "#bf5af2" },
  { id: "banana", label: "Banana", points: 2700, color: "#ffd60a" },
  { id: "donut", label: "Donut", points: 3000, color: "#ff9f0a" },
  { id: "rocket", label: "Key", points: 3300, color: "#64d2ff" },
  { id: "bell", label: "Bell", points: 3800, color: "#ffd60a" },
  { id: "key", label: "Key", points: 4000, color: "#64d2ff" },
  { id: "fox", label: "Fox", points: 4500, color: "#ff9f0a" },
];

export function fruitForStage(stage: number): FruitKind {
  const i = Math.min(FRUIT_TABLE.length - 1, Math.max(0, stage - 1));
  return FRUIT_TABLE[i];
}
