import { useCallback, useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useIdentityAuth } from "identity-sdk";
import { arcade } from "../../../arcadeTheme";
import { useTheme } from "../../../theme-context";
import { useSnakeGame } from "../../../hooks/useSnakeGame";
import { Menu } from "../../../components/Menu";
import { GameBoard } from "../../../components/GameBoard";
import { Controls } from "../../../components/Controls";
import { ScoreHud } from "../../../components/ScoreHud";
import {
  ArcadeShell,
  useArcadeShellLayout,
} from "../../../components/ArcadeShell";
import { detectDevice, submitScore } from "../../../scores/api";
import { arcadesAuthConfig } from "../../../auth/config";

const JOYSTICK_SLOT = 180;
const SCORE_HUD = 54;
const PAGE_PAD = 24;
const SHELL_CHROME = 72; // main card padding + toolbar
const HIGH_SCORES_HREF = "/games/snake/high-scores";

function GameScreenBody({
  onGameOver,
}: {
  onGameOver?: (finalScore: number) => void;
}) {
  const { space } = useTheme();
  const { width, height } = useWindowDimensions();
  const { sidebarW } = useArcadeShellLayout();
  const isLandscape = width > height;

  const handleGameOver = useCallback(
    (finalScore: number) => {
      onGameOver?.(finalScore);
    },
    [onGameOver],
  );

  const {
    state,
    snake,
    food,
    frame,
    score,
    highScore,
    activeDir,
    steerBlocked,
    startGame,
    setDirection,
    clearActiveDir,
  } = useSnakeGame({ onGameOver: handleGameOver });

  const travelDir = snake ? snake.facing() : null;
  const showBoard =
    (state === "playing" || state === "dead") && !!snake && !!food;

  const boardSize = useMemo(() => {
    const contentW = Math.max(280, width - sidebarW - SHELL_CHROME);
    const contentH = Math.max(280, height - SHELL_CHROME);
    if (isLandscape) {
      const maxH = contentH - SCORE_HUD - PAGE_PAD * 2;
      const maxW = contentW - PAGE_PAD * 2 - JOYSTICK_SLOT;
      return Math.max(180, Math.min(space.board, maxW, maxH));
    }
    const maxW = contentW - PAGE_PAD * 2;
    const maxH = contentH - JOYSTICK_SLOT - SCORE_HUD - PAGE_PAD * 2;
    return Math.max(180, Math.min(space.board, maxW, maxH));
  }, [width, height, space.board, isLandscape, sidebarW]);

  const controls = (
    <Controls
      enabled={state === "playing"}
      activeDir={activeDir}
      travelDir={travelDir}
      steerBlocked={steerBlocked}
      onDirection={setDirection}
      onRelease={clearActiveDir}
    />
  );

  const board = (
    <View
      style={[
        styles.board,
        {
          width: boardSize,
          height: boardSize,
          backgroundColor: arcade.surface,
          overflow: "hidden",
        },
      ]}
    >
      {state === "menu" || !showBoard ? (
        <Menu onStart={startGame} label="New Game" />
      ) : (
        <GameBoard
          snake={snake}
          food={food}
          frame={frame}
          boardSize={boardSize}
          flickerHead={state === "dead"}
        />
      )}
    </View>
  );

  const hud = (
    <ScoreHud score={score} highScore={highScore} width={boardSize} />
  );

  return (
    <View style={[styles.page, { backgroundColor: arcade.bg }]}>
      {isLandscape ? (
        <View style={styles.landscapeWrap}>
          <View style={styles.hudRow}>{hud}</View>
          <View style={styles.landscapeRow}>
            <View style={[styles.side, { height: boardSize }]}>{controls}</View>
            {board}
            <View style={[styles.side, { height: boardSize }]} />
          </View>
        </View>
      ) : (
        <>
          {hud}
          {board}
          <View style={styles.portraitControls}>{controls}</View>
        </>
      )}

      {state === "dead" ? (
        <View style={[styles.overlay, { pointerEvents: "box-none" }]}>
          <View
            style={[
              styles.overlayScrim,
              { backgroundColor: arcade.bg, pointerEvents: "none" },
            ]}
          />
          <Menu onStart={startGame} label="Try Again" />
        </View>
      ) : null}
    </View>
  );
}

function GameScreen({
  onGameOver,
}: {
  onGameOver?: (finalScore: number) => void;
}) {
  return (
    <ArcadeShell highScoresHref={HIGH_SCORES_HREF}>
      <GameScreenBody onGameOver={onGameOver} />
    </ArcadeShell>
  );
}

function AuthenticatedGame() {
  const auth = useIdentityAuth();
  const onGameOver = useCallback(
    (finalScore: number) => {
      if (!auth.session) return;
      void (async () => {
        try {
          const token = await auth.getAccessToken();
          if (!token) return;
          await submitScore(
            token,
            finalScore,
            detectDevice(),
            typeof navigator !== "undefined" ? navigator.userAgent : "",
            "snake",
          );
        } catch {
          /* keep playing offline */
        }
      })();
    },
    [auth],
  );
  return <GameScreen onGameOver={onGameOver} />;
}

export default function SnakeGameScreen() {
  if (arcadesAuthConfig()) return <AuthenticatedGame />;
  return <GameScreen />;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: PAGE_PAD,
    userSelect: "none",
  },
  landscapeWrap: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  hudRow: {
    alignItems: "center",
  },
  landscapeRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  side: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  portraitControls: {
    marginTop: 20,
  },
  board: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  overlayScrim: {
    ...StyleSheet.absoluteFill,
    opacity: 0.45,
  },
});
