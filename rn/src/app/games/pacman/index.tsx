import { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { useIdentityAuth } from "identity-sdk";
import { ArcadeShell } from "../../../components/ArcadeShell";
import {
  GamepadControls,
  GamepadStick,
} from "../../../components/GamepadControls";
import { Menu } from "../../../components/Menu";
import {
  PacmanBoard,
  PACMAN_BOARD_EXTRA,
} from "../../../components/pacman/PacmanBoard";
import { PacmanInfo } from "../../../components/pacman/PacmanInfo";
import { ScoreHud } from "../../../components/ScoreHud";
import { arcade } from "../../../arcadeTheme";
import { usePacmanGame } from "../../../hooks/usePacmanGame";
import { useTheme } from "../../../theme-context";
import { COLS, ROWS } from "../../../game/pacman/maze";
import { detectDevice, submitScore } from "../../../scores/api";
import { arcadesAuthConfig } from "../../../auth/config";

const SCORE_HUD = 54;
const CONTROL_SLOT_PORTRAIT = 120;
const CONTROL_SLOT_LANDSCAPE = 120;
/** Matches PacmanBoard life band + actor edge pad. */
const LIFE_BAND = PACMAN_BOARD_EXTRA;
const HIGH_SCORES_HREF = "/games/pacman/high-scores";

function GameBody({
  onGameOver,
}: {
  onGameOver?: (finalScore: number) => void;
}) {
  const { typography } = useTheme();
  const pixel = typography.pixelFamily;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isMobile = width < 640;
  const [area, setArea] = useState({ w: 0, h: 0 });

  const handleGameOver = useCallback(
    (finalScore: number) => {
      onGameOver?.(finalScore);
    },
    [onGameOver],
  );

  const {
    phase,
    score,
    highScore,
    lives,
    stage,
    pac,
    ghosts,
    pellets,
    powers,
    fruit,
    frightenedUntil,
    frightFlash,
    ghostEatStreak,
    eatPopup,
    frame,
    showInfo,
    deathT,
    activeDir,
    getSnap,
    startGame,
    setDirection,
    clearActiveDir,
    onStart,
    onSelect,
  } = usePacmanGame({ onGameOver: handleGameOver });

  const snap = useMemo(
    () => ({
      phase,
      score,
      highScore,
      lives,
      stage,
      pac,
      ghosts,
      pellets,
      powers,
      fruit,
      frightenedUntil,
      frightFlash,
      ghostEatStreak,
      eatPopup,
      frame,
      showInfo,
      deathT,
    }),
    [
      phase,
      score,
      highScore,
      lives,
      stage,
      pac,
      ghosts,
      pellets,
      powers,
      fruit,
      frightenedUntil,
      frightFlash,
      ghostEatStreak,
      eatPopup,
      frame,
      showInfo,
      deathT,
    ],
  );

  const pagePad = isMobile ? (isLandscape ? 4 : 0) : 8;

  const onAreaLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (
      w > 0 &&
      h > 0 &&
      (Math.abs(w - area.w) > 1 || Math.abs(h - area.h) > 1)
    ) {
      setArea({ w, h });
    }
  };

  const { boardW, boardH } = useMemo(() => {
    const contentW = Math.max(200, area.w || width - pagePad * 2);
    const contentH = Math.max(200, area.h || height * 0.8);
    const aspect = COLS / ROWS; // width / height of maze

    if (isLandscape) {
      // Fill vertical space; width follows maze aspect, capped by side slots.
      const maxH = Math.max(160, contentH - SCORE_HUD - 8 - LIFE_BAND);
      const maxW = Math.max(160, contentW - CONTROL_SLOT_LANDSCAPE * 2);
      let h = maxH;
      let w = h * aspect;
      if (w > maxW) {
        w = maxW;
        h = w / aspect;
      }
      return { boardW: w, boardH: h };
    }

    // Portrait: fill height under HUD / above controls.
    const maxW = contentW;
    const maxH = Math.max(
      160,
      contentH - CONTROL_SLOT_PORTRAIT - SCORE_HUD - 8 - LIFE_BAND,
    );
    let h = maxH;
    let w = h * aspect;
    if (w > maxW) {
      w = maxW;
      h = w / aspect;
    }
    return { boardW: w, boardH: h };
  }, [width, height, isLandscape, pagePad, area.w, area.h]);

  const playing = phase === "playing";
  const paused = phase === "paused";
  const showBoard =
    phase === "ready" ||
    phase === "playing" ||
    phase === "paused" ||
    phase === "dying" ||
    phase === "dead" ||
    phase === "won";

  const hud = (
    <ScoreHud
      stage={stage}
      score={score}
      highScore={highScore}
      width={boardW}
    />
  );

  const board = (
    <View
      style={[
        styles.boardWrap,
        {
          width: boardW,
          height: boardH + LIFE_BAND,
          backgroundColor: "#000",
          alignSelf: "center",
        },
      ]}
    >
      {phase === "menu" || !showBoard ? (
        <View style={styles.menuStack}>
          <Text
            style={{
              fontFamily: pixel,
              color: arcade.gold,
              fontSize: isMobile ? 16 : 20,
              letterSpacing: 2,
              marginBottom: 18,
            }}
          >
            PAC-MAN
          </Text>
          <Menu onStart={startGame} label="New Game" />
        </View>
      ) : (
        <>
          <PacmanBoard
            snap={snap}
            boardW={boardW}
            boardH={boardH}
            getSnap={getSnap}
          />
          {phase === "dead" || phase === "won" ? (
            <View style={styles.overlayMenu} pointerEvents="box-none">
              <Menu
                onStart={startGame}
                label={phase === "won" ? "Play Again" : "Try Again"}
              />
            </View>
          ) : null}
          {paused && !showInfo ? (
            <View style={styles.overlay}>
              <Text
                style={{
                  fontFamily: pixel,
                  color: arcade.gold,
                  fontSize: 14,
                  marginBottom: 12,
                  letterSpacing: 1,
                }}
              >
                PAUSED
              </Text>
              <Menu onStart={onStart} label="Resume" />
            </View>
          ) : null}
          {showInfo ? <PacmanInfo onClose={onSelect} /> : null}
        </>
      )}
    </View>
  );

  const faceEnabled =
    playing ||
    paused ||
    showInfo ||
    phase === "menu" ||
    phase === "ready" ||
    phase === "dead";

  return (
    <View
      style={[
        styles.page,
        {
          backgroundColor: arcade.bg,
          padding: pagePad,
        },
      ]}
      onLayout={onAreaLayout}
    >
      {isLandscape ? (
        <View style={styles.landscapeWrap}>
          <View style={styles.hudRow}>{hud}</View>
          <View style={styles.landscapeRow}>
            <View style={[styles.side, { height: boardH + LIFE_BAND }]}>
              <GamepadStick
                enabled={playing || phase === "ready"}
                activeDir={activeDir}
                travelDir={pac.dir}
                onDirection={setDirection}
                onRelease={clearActiveDir}
              />
            </View>
            {board}
            <View style={[styles.side, { height: boardH + LIFE_BAND }]}>
              <GamepadControls
                mode="landscape"
                enabled={faceEnabled}
                activeDir={activeDir}
                travelDir={pac.dir}
                onDirection={setDirection}
                onRelease={clearActiveDir}
                onPrimary={onStart}
                onSecondary={onSelect}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.portraitWrap}>
          {hud}
          {board}
          <View style={styles.portraitControls}>
            <GamepadControls
              mode="portrait"
              enabled={faceEnabled}
              activeDir={activeDir}
              travelDir={pac.dir}
              onDirection={setDirection}
              onRelease={clearActiveDir}
              onPrimary={onStart}
              onSecondary={onSelect}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function PacmanGame({
  onGameOver,
}: {
  onGameOver?: (finalScore: number) => void;
}) {
  return (
    <ArcadeShell highScoresHref={HIGH_SCORES_HREF}>
      <GameBody onGameOver={onGameOver} />
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
            "pacman",
          );
        } catch {
          /* keep playing offline */
        }
      })();
    },
    [auth],
  );
  return <PacmanGame onGameOver={onGameOver} />;
}

export default function PacmanGameScreen() {
  if (arcadesAuthConfig()) return <AuthenticatedGame />;
  return <PacmanGame />;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "flex-start",
    userSelect: "none",
    width: "100%",
  },
  portraitWrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  landscapeWrap: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  hudRow: { alignItems: "center", marginBottom: 4, flexShrink: 0 },
  landscapeRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
  },
  side: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  boardWrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  portraitControls: {
    marginTop: 4,
    width: "100%",
    alignItems: "center",
    flexShrink: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 5,
  },
  overlayMenu: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
    zIndex: 5,
  },
  menuStack: {
    alignItems: "center",
    justifyContent: "center",
  },
});
