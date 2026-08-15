import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "expo-router";
import { Platform } from "react-native";
import {
  getPacmanSnapshot,
  pressSelect,
  pressStart,
  queueDir,
  setHighScore,
  startPacman,
  tickPacman,
} from "../game/pacman/engine";
import type { GamePhase, PacmanSnapshot } from "../game/pacman/types";
import type { Dir } from "../game/dir";

const HIGH_SCORE_KEY = "pacman-high-score";

function dirFromKey(code: string, key: string): Dir | null {
  if (code === "ArrowLeft" || key === "ArrowLeft" || key === "a" || key === "A")
    return { x: -1, y: 0 };
  if (
    code === "ArrowRight" ||
    key === "ArrowRight" ||
    key === "d" ||
    key === "D"
  )
    return { x: 1, y: 0 };
  if (code === "ArrowDown" || key === "ArrowDown" || key === "s" || key === "S")
    return { x: 0, y: 1 };
  if (code === "ArrowUp" || key === "ArrowUp" || key === "w" || key === "W")
    return { x: 0, y: -1 };
  return null;
}

function readStoredHighScore(): number {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return 0;
  const n = Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function writeStoredHighScore(value: number) {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
  localStorage.setItem(HIGH_SCORE_KEY, String(value));
}

export function usePacmanGame(opts?: {
  onGameOver?: (finalScore: number) => void;
}) {
  const pathname = usePathname();
  const screenActive = pathname === "/games/pacman";
  const screenActiveRef = useRef(screenActive);
  screenActiveRef.current = screenActive;
  const [snap, setSnap] = useState<PacmanSnapshot>(() => getPacmanSnapshot());
  const [activeDir, setActiveDir] = useState<Dir | null>(null);
  const phaseRef = useRef<GamePhase>(snap.phase);
  const snapRef = useRef(snap);
  const onGameOverRef = useRef(opts?.onGameOver);
  onGameOverRef.current = opts?.onGameOver;
  phaseRef.current = snap.phase;
  snapRef.current = snap;

  const getSnap = useCallback(() => snapRef.current, []);

  const sync = useCallback(() => {
    const next = getPacmanSnapshot();
    const prev = phaseRef.current;
    snapRef.current = next;
    setSnap(next);
    phaseRef.current = next.phase;
    if (next.highScore > 0) writeStoredHighScore(next.highScore);
    if (
      (next.phase === "dead" || next.phase === "won") &&
      prev !== "dead" &&
      prev !== "won"
    ) {
      onGameOverRef.current?.(next.score);
    }
    if (next.phase !== "playing" && next.phase !== "ready") {
      setActiveDir(null);
    }
  }, []);

  useEffect(() => {
    const stored = readStoredHighScore();
    if (stored > 0) {
      setHighScore(stored);
      sync();
    }
  }, [sync]);

  // One rAF for the screen lifetime. Restarting on phase change leaks a loop
  // (cleanup cancels the fired frame; that frame still schedules the next).
  useEffect(() => {
    if (typeof requestAnimationFrame === "undefined") return;
    let alive = true;
    let raf = 0;
    let last =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const frame = (now: number) => {
      if (!alive) return;
      const phase = phaseRef.current;
      if (
        screenActiveRef.current &&
        (phase === "playing" || phase === "ready" || phase === "dying")
      ) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        tickPacman(dt);
        sync();
      } else {
        last = now;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [sync]);

  const startGame = useCallback(() => {
    startPacman();
    sync();
  }, [sync]);

  const setDirection = useCallback((x: number, y: number) => {
    setActiveDir({ x, y });
    queueDir({ x, y });
  }, []);

  const clearActiveDir = useCallback(() => setActiveDir(null), []);

  const onStart = useCallback(() => {
    pressStart();
    sync();
  }, [sync]);

  const onSelect = useCallback(() => {
    pressSelect();
    sync();
  }, [sync]);

  useEffect(() => {
    if (!screenActive) return;
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pressStart();
        sync();
        return;
      }
      if (e.key === "i" || e.key === "I") {
        pressSelect();
        sync();
        return;
      }
      const dir = dirFromKey(e.code, e.key);
      if (!dir) return;
      e.preventDefault();
      setActiveDir(dir);
      queueDir(dir);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = dirFromKey(e.code, e.key);
      if (!dir) return;
      setActiveDir((cur) =>
        cur && cur.x === dir.x && cur.y === dir.y ? null : cur,
      );
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [screenActive, sync]);

  return {
    ...snap,
    activeDir,
    getSnap,
    startGame,
    setDirection,
    clearActiveDir,
    onStart,
    onSelect,
  };
}
