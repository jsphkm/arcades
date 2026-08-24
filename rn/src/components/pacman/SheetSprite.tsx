import { View, type ImageSourcePropType } from "react-native";
import { Image, type ImageSource } from "expo-image";
import type { SheetCell } from "./spriteSheets";

type Props = {
  source: ImageSourcePropType;
  cols: number;
  rows: number;
  cell: SheetCell;
  x: number;
  y: number;
  size: number;
};

export function SheetSprite({ source, cols, rows, cell, x, y, size }: Props) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        overflow: "hidden",
        transform: [
          { rotate: `${cell.rotateDeg}deg` },
          { scaleX: cell.flipX ? -1 : 1 },
        ],
      }}
    >
      <Image
        source={source as ImageSource}
        style={{
          position: "absolute",
          left: -cell.col * size,
          top: -cell.row * size,
          width: size * cols,
          height: size * rows,
        }}
        contentFit="fill"
        cachePolicy="memory"
        transition={0}
        recyclingKey={`${cell.col},${cell.row}`}
      />
    </View>
  );
}
