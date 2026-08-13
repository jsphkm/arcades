import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { COLS } from "../game/constants";
import type { Snake } from "../game/snake";
import { useTheme } from "../theme-context";

type Props = {
  snake: Snake;
  food: { x: number; y: number };
  frame: number;
  boardSize: number;
  /** Pulse head opacity (game over) */
  flickerHead?: boolean;
};

export function GameBoard({
  snake,
  food,
  frame,
  boardSize,
  flickerHead = false,
}: Props) {
  const { colors } = useTheme();
  const cell = boardSize / COLS;
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
          useNativeDriver: true,
        }),
        Animated.timing(headOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      headOpacity.setValue(1);
    };
  }, [flickerHead, headOpacity]);

  const headIndex = snake.body.length - 1;

  return (
    <View style={[styles.grid, { width: boardSize, height: boardSize }]}>
      <View
        key={`f-${frame}-${food.x}-${food.y}`}
        style={{
          position: "absolute",
          left: food.x * cell,
          top: food.y * cell,
          width: cell,
          height: cell,
          backgroundColor: "#ff0000",
        }}
      />
      {snake.body.map((part, i) => {
        const isHead = i === headIndex;
        const box = {
          position: "absolute" as const,
          left: part.x * cell,
          top: part.y * cell,
          width: cell,
          height: cell,
          backgroundColor: colors.button,
        };
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
