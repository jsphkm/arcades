import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { COLS } from "../../game/snake/constants";
import type { Snake } from "../../game/snake/snake";
import { palette } from "../../theme";
import { USE_NATIVE_DRIVER } from "../../platform";

type Props = {
  snake: Snake;
  food: { x: number; y: number };
  frame: number;
  boardSize: number;
  /** Pulse head opacity (game over) */
  flickerHead?: boolean;
};

/** Dark-mode snake fill — board is always the dark arcade stage. */
const SNAKE_COLOR = palette.dark.button;
const FOOD_COLOR = "#ff0000";

function cellBox(
  x: number,
  y: number,
  cell: number,
  backgroundColor: string,
) {
  return {
    position: "absolute" as const,
    left: x * cell,
    top: y * cell,
    width: cell,
    height: cell,
    backgroundColor,
  };
}

export function GameBoard({
  snake,
  food,
  frame,
  boardSize,
  flickerHead = false,
}: Props) {
  // Integer cell size so snake segments and food are identical squares.
  const cell = Math.max(1, Math.floor(boardSize / COLS));
  const gridSize = cell * COLS;
  const headOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!flickerHead) {
      headOpacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(headOpacity, {
          toValue: 0.15,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(headOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      headOpacity.setValue(1);
    };
  }, [flickerHead, headOpacity]);

  const headIndex = snake.body.length - 1;

  return (
    <View style={[styles.grid, { width: gridSize, height: gridSize }]}>
      <View
        key={`f-${frame}-${food.x}-${food.y}`}
        style={cellBox(food.x, food.y, cell, FOOD_COLOR)}
      />
      {snake.body.map((part, i) => {
        const isHead = i === headIndex;
        const box = cellBox(part.x, part.y, cell, SNAKE_COLOR);
        if (isHead && flickerHead) {
          return (
            <Animated.View
              key={`s-${frame}-${i}-${part.x}-${part.y}`}
              style={[box, { opacity: headOpacity }]}
            />
          );
        }
        return (
          <View key={`s-${frame}-${i}-${part.x}-${part.y}`} style={box} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    position: "relative",
  },
});
