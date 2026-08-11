import { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useTheme } from "../theme-context";
import { useSnakeGame } from "../hooks/useSnakeGame";
import { Menu } from "../components/Menu";
import { GameBoard } from "../components/GameBoard";
import { Controls } from "../components/Controls";
import { ScoreHud } from "../components/ScoreHud";
import { TopBar } from "../components/TopBar";

const JOYSTICK_SLOT = 180;
const SCORE_HUD = 54;
const PAGE_PAD = 24;

export default function Index() {
  const { colors, space } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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
  } = useSnakeGame();

  const travelDir = snake ? snake.facing() : null;
  const showBoard = (state === "playing" || state === "dead") && !!snake && !!food;

  const boardSize = useMemo(() => {
    if (isLandscape) {
      const maxH = height - SCORE_HUD - PAGE_PAD * 2;
      const maxW = width - PAGE_PAD * 2 - JOYSTICK_SLOT;
      return Math.max(200, Math.min(space.board, maxW, maxH));
    }
    const maxW = width - PAGE_PAD * 2;
    const maxH = height - JOYSTICK_SLOT - SCORE_HUD - PAGE_PAD * 2;
    return Math.max(200, Math.min(space.board, maxW, maxH));
  }, [width, height, space.board, isLandscape]);

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
          backgroundColor: colors.board,
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
    <View style={[styles.root, { backgroundColor: colors.page }]}>
      <TopBar />
      <View style={[styles.page, { backgroundColor: colors.page }]}>
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
                { backgroundColor: colors.page, pointerEvents: "none" },
              ]}
            />
            <Menu onStart={startGame} label="Try Again" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  overlayScrim: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
});
