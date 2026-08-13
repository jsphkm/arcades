import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { TICK_MS } from "../game/constants";
import {
  drawGame,
  getWorld,
  setHighScore,
  startGame as worldStartGame,
  type GameState,
  type Point,
} from "../game/world";
import type { Snake } from "../game/snake";

export type Dir = { x: number; y: number };

const HIGH_SCORE_KEY = "snake-high-score";

function dirFromKey(code: string, key: string): Dir | null {
  if (code === "ArrowLeft" || key === "ArrowLeft") return { x: -1, y: 0 };
  if (code === "ArrowRight" || key === "ArrowRight") return { x: 1, y: 0 };
  if (code === "ArrowDown" || key === "ArrowDown") return { x: 0, y: 1 };
  if (code === "ArrowUp" || key === "ArrowUp") return { x: 0, y: -1 };
  return null;
}

function readStoredHighScore(): number {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return 0;
  const raw =
    localStorage.getItem(HIGH_SCORE_KEY) ??
    localStorage.getItem("snake-hi-score");
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function writeStoredHighScore(value: number) {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
  localStorage.setItem(HIGH_SCORE_KEY, String(value));
}

export function useSnakeGame(opts?: {
  onGameOver?: (finalScore: number) => void;
}) {
  const [status, setStatus] = useState<GameState>("menu");
  const [snake, setSnake] = useState<Snake | undefined>();
  const [food, setFood] = useState<Point | undefined>();
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(0);
  const [activeDir, setActiveDir] = useState<Dir | null>(null);
  const [steerBlocked, setSteerBlocked] = useState(false);
  const [frame, setFrame] = useState(0);
  const statusRef = useRef(status);
  const activeDirRef = useRef(activeDir);
  const onGameOverRef = useRef(opts?.onGameOver);
  onGameOverRef.current = opts?.onGameOver;
  statusRef.current = status;
  activeDirRef.current = activeDir;

  useEffect(() => {
    const stored = readStoredHighScore();
    if (stored > 0) {
      setHighScore(stored);
      setHighScoreState(stored);
    }
  }, []);

  const syncFromWorld = useCallback(() => {
    const world = getWorld();
    const prev = statusRef.current;
    setStatus(world.state);
    setSnake(world.snake);
    setFood(world.food ? { ...world.food } : undefined);
    setScore(world.score);
    setHighScoreState((hs) => {
      if (world.highScore > hs) writeStoredHighScore(world.highScore);
      return world.highScore;
    });
    setFrame((f) => f + 1);
    if (world.state !== "playing") {
      setActiveDir(null);
      setSteerBlocked(false);
    }
    if (prev === "playing" && world.state === "dead") {
      onGameOverRef.current?.(world.score);
    }
  }, []);

  const start = useCallback(() => {
    worldStartGame();
    setActiveDir(null);
    setSteerBlocked(false);
    syncFromWorld();
  }, [syncFromWorld]);

  const setDirection = useCallback((x: number, y: number) => {
    if (statusRef.current !== "playing") return;
    const result = getWorld().snake?.setDir(x, y);
    if (result === "ok") {
      setActiveDir({ x, y });
      setSteerBlocked(false);
    } else if (result === "blocked") {
      setActiveDir({ x, y });
      setSteerBlocked(true);
    }
  }, []);

  const clearActiveDir = useCallback(() => {
    setActiveDir(null);
    setSteerBlocked(false);
  }, []);

  useEffect(() => {
    if (status !== "playing") return;

    const id = setInterval(() => {
      drawGame();
      syncFromWorld();
    }, TICK_MS);

    return () => clearInterval(id);
  }, [status, syncFromWorld]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const keyPressed = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const current = statusRef.current;
      const key = e.key;
      const code = e.code;

      if (current === "menu" || current === "dead") {
        if (
          code === "Enter" ||
          code === "Space" ||
          key === "Enter" ||
          key === " "
        ) {
          e.preventDefault();
          start();
        }
        return;
      }

      if (current === "playing") {
        const dir = dirFromKey(code, key);
        if (!dir) return;
        e.preventDefault();
        setDirection(dir.x, dir.y);
      }
    };

    const keyReleased = (e: KeyboardEvent) => {
      if (statusRef.current !== "playing") return;
      const dir = dirFromKey(e.code, e.key);
      if (!dir) return;
      e.preventDefault();
      const active = activeDirRef.current;
      if (active && active.x === dir.x && active.y === dir.y) {
        clearActiveDir();
      }
    };

    window.addEventListener("keydown", keyPressed);
    window.addEventListener("keyup", keyReleased);
    return () => {
      window.removeEventListener("keydown", keyPressed);
      window.removeEventListener("keyup", keyReleased);
    };
  }, [start, setDirection, clearActiveDir]);

  return {
    state: status,
    snake,
    food,
    frame,
    score,
    highScore,
    activeDir,
    steerBlocked,
    startGame: start,
    setDirection,
    clearActiveDir,
  };
}
