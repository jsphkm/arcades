import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { POWER_BLINK_FRAMES } from "../../game/pacman/engine";
import { COLS, ROWS } from "../../game/pacman/maze";
import type { Ghost, PacmanSnapshot } from "../../game/pacman/types";
import { useTheme } from "../../theme-context";
import {
  ACTOR_FRUIT,
  ACTOR_GHOST,
  ACTOR_PAC,
  LIFE_PAC,
  TILE_PX,
  boardLayout,
} from "./boardLayout";
import { rasterizeMaze } from "./mazeRaster";
import { rgbaToPngDataUri } from "./pngRgba";
import { SheetSprite } from "./SheetSprite";
import {
  FRUITS_SHEET,
  FRUIT_SHEET_COLS,
  FRUIT_SHEET_ROWS,
  GHOSTS_SHEET,
  GHOST_SHEET_COLS,
  GHOST_SHEET_ROWS,
  PAC_SHEET,
  PAC_SHEET_COLS,
  PAC_SHEET_ROWS,
  PELLETS_SHEET,
  PELLET_SHEET_COLS,
  PELLET_SHEET_ROWS,
  fruitSheetCell,
  ghostSheetCell,
  lifeSheetCell,
  pacSheetCell,
  pelletSheetCell,
} from "./spriteSheets";

type Props = {
  snap: PacmanSnapshot;
  cssW: number;
  cssH: number;
};

const mazeUri = (() => {
  const px = rasterizeMaze(TILE_PX, 1);
  return rgbaToPngDataUri(px.data, px.width, px.height);
})();

export function PacmanViewBoard({ snap, cssW, cssH }: Props) {
  const { typography } = useTheme();
  const { cell, mazeW, mazeH, ox, oy, lifeY } = boardLayout(cssW, cssH, 1);
  const font = Math.max(8, Math.round(cell));
  const powerOn = snap.frame % POWER_BLINK_FRAMES < POWER_BLINK_FRAMES / 2;
  const pelletSig = pelletSignature(snap.pellets, snap.powers);

  if (cssW < 2 || cssH < 2) return null;

  return (
    <View
      collapsable={false}
      pointerEvents="none"
      style={[styles.root, { width: cssW, height: cssH }]}
    >
      <Image
        source={{ uri: mazeUri }}
        style={{
          position: "absolute",
          left: ox,
          top: oy,
          width: mazeW,
          height: mazeH,
        }}
        contentFit="fill"
        cachePolicy="memory"
        transition={0}
      />
      <PelletLayer
        sig={pelletSig}
        pellets={snap.pellets}
        powers={snap.powers}
        powerOn={powerOn}
        cell={cell}
        ox={ox}
        oy={oy}
      />
      {snap.fruit ? (
        <FruitView
          x={ox + (snap.fruit.x + 0.5) * cell}
          y={oy + (snap.fruit.y + 0.5) * cell}
          cell={cell}
          id={snap.fruit.kind.id}
        />
      ) : null}
      {snap.phase !== "dying" && !snap.showPlayerOne
        ? snap.ghosts.map((ghost) => (
            <GhostView
              key={ghost.id}
              ghost={ghost}
              cell={cell}
              ox={ox}
              oy={oy}
              frightFlash={snap.frightFlash}
              frame={snap.frame}
            />
          ))
        : null}
      {snap.phase === "dying" ? (
        <PacView
          x={ox + (snap.pac.x + 0.5) * cell}
          y={oy + (snap.pac.y + 0.5) * cell}
          cell={cell}
          dir={snap.pac.dir}
          mouth={snap.pac.mouth}
          dying
          deathT={snap.deathT}
        />
      ) : !snap.eatPopup?.hidePac && !snap.showPlayerOne ? (
        <PacView
          x={ox + (snap.pac.x + 0.5) * cell}
          y={oy + (snap.pac.y + 0.5) * cell}
          cell={cell}
          dir={snap.pac.dir}
          mouth={snap.pac.mouth}
        />
      ) : null}
      {snap.eatPopup ? (
        <Text
          style={[
            styles.banner,
            {
              fontFamily: typography.pixelFamily,
              fontSize: font,
              color: snap.eatPopup.hidePac ? "#00ffff" : "#fff4dc",
              left: ox + (snap.eatPopup.x + 0.5) * cell - font * 2,
              top: oy + (snap.eatPopup.y + 0.5) * cell - font / 2,
              width: font * 4,
            },
          ]}
        >
          {snap.eatPopup.points}
        </Text>
      ) : null}
      {snap.phase === "ready" || snap.phase === "dead" ? (
        <>
          {snap.phase === "ready" && snap.showPlayerOne ? (
            <Text
              style={[
                styles.banner,
                {
                  fontFamily: typography.pixelFamily,
                  fontSize: font,
                  color: "#00ffff",
                  left: ox,
                  top: oy + 11 * cell,
                  width: mazeW,
                },
              ]}
            >
              PLAYER ONE
            </Text>
          ) : null}
          <Text
            style={[
              styles.banner,
              {
                fontFamily: typography.pixelFamily,
                fontSize: font,
                color: snap.phase === "ready" ? "#ffff00" : "#ff0000",
                left: ox,
                top: oy + 17 * cell,
                width: mazeW,
              },
            ]}
          >
            {snap.phase === "ready" ? "READY!" : "GAME OVER"}
          </Text>
        </>
      ) : null}
      {Array.from({ length: snap.lives }, (_, i) => {
        const size = LIFE_PAC * cell;
        return (
          <SheetSprite
            key={`life-${i}`}
            source={PAC_SHEET}
            cols={PAC_SHEET_COLS}
            rows={PAC_SHEET_ROWS}
            cell={lifeSheetCell()}
            x={ox + cell * 0.35 + size / 2 + i * size * 1.2}
            y={oy + lifeY}
            size={size}
          />
        );
      })}
      {(snap.footerFruits ?? []).map((icon, i) => {
        const fx = mazeW - cell * 0.85 - i * cell * 2;
        return (
          <FruitView
            key={`${icon.id}-${i}`}
            x={ox + fx}
            y={oy + lifeY}
            cell={cell}
            id={icon.id}
          />
        );
      })}
    </View>
  );
}

const PelletLayer = memo(function PelletLayer({
  pellets,
  powers,
  powerOn,
  cell,
  ox,
  oy,
}: {
  sig: string;
  pellets: boolean[][];
  powers: boolean[][];
  powerOn: boolean;
  cell: number;
  ox: number;
  oy: number;
}) {
  const size = ACTOR_PAC * cell;
  const nodes = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (pellets[y]?.[x]) {
        nodes.push(
          <SheetSprite
            key={`d-${x}-${y}`}
            source={PELLETS_SHEET}
            cols={PELLET_SHEET_COLS}
            rows={PELLET_SHEET_ROWS}
            cell={pelletSheetCell("dot")}
            x={ox + (x + 0.5) * cell}
            y={oy + (y + 0.5) * cell}
            size={size}
          />,
        );
      }
      if (powers[y]?.[x] && powerOn) {
        nodes.push(
          <SheetSprite
            key={`p-${x}-${y}`}
            source={PELLETS_SHEET}
            cols={PELLET_SHEET_COLS}
            rows={PELLET_SHEET_ROWS}
            cell={pelletSheetCell("energizer")}
            x={ox + (x + 0.5) * cell}
            y={oy + (y + 0.5) * cell}
            size={size}
          />,
        );
      }
    }
  }
  return <>{nodes}</>;
}, (a, b) => (
  a.sig === b.sig &&
  a.powerOn === b.powerOn &&
  a.cell === b.cell &&
  a.ox === b.ox &&
  a.oy === b.oy
));

function PacView({
  x,
  y,
  cell,
  dir,
  mouth,
  dying,
  deathT = 0,
}: {
  x: number;
  y: number;
  cell: number;
  dir: { x: number; y: number };
  mouth: number;
  dying?: boolean;
  deathT?: number;
}) {
  return (
    <SheetSprite
      source={PAC_SHEET}
      cols={PAC_SHEET_COLS}
      rows={PAC_SHEET_ROWS}
      cell={pacSheetCell(mouth, dir, dying, deathT)}
      x={x}
      y={y}
      size={ACTOR_PAC * cell}
    />
  );
}

function GhostView({
  ghost,
  cell,
  ox,
  oy,
  frightFlash,
  frame,
}: {
  ghost: Ghost;
  cell: number;
  ox: number;
  oy: number;
  frightFlash: boolean;
  frame: number;
}) {
  return (
    <SheetSprite
      source={GHOSTS_SHEET}
      cols={GHOST_SHEET_COLS}
      rows={GHOST_SHEET_ROWS}
      cell={ghostSheetCell(ghost, frame, frightFlash)}
      x={ox + (ghost.x + 0.5) * cell}
      y={oy + (ghost.y + 0.5) * cell}
      size={ACTOR_GHOST * cell}
    />
  );
}

function FruitView({
  x,
  y,
  cell,
  id,
}: {
  x: number;
  y: number;
  cell: number;
  id: string;
}) {
  return (
    <SheetSprite
      source={FRUITS_SHEET}
      cols={FRUIT_SHEET_COLS}
      rows={FRUIT_SHEET_ROWS}
      cell={fruitSheetCell(id)}
      x={x}
      y={y}
      size={ACTOR_FRUIT * cell}
    />
  );
}

function pelletSignature(pellets: boolean[][], powers: boolean[][]): string {
  let count = 0;
  let hash = 0;
  for (let y = 0; y < pellets.length; y += 1) {
    const row = pellets[y];
    for (let x = 0; x < row.length; x += 1) {
      if (row[x]) {
        count += 1;
        hash = (hash * 33 + x + y * COLS) | 0;
      }
      if (powers[y]?.[x]) {
        count += 1000;
        hash = (hash * 33 + x + 7) | 0;
      }
    }
  }
  return `${count}:${hash}`;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#000",
    overflow: "visible",
  },
  banner: {
    position: "absolute",
    textAlign: "center",
  },
});
