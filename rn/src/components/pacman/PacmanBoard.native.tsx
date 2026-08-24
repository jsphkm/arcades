import { PACMAN_BOARD_EXTRA } from "./boardLayout";
import { PacmanViewBoard } from "./PacmanViewBoard";
import type { PacmanSnapshot } from "../../game/pacman/types";

export { PACMAN_BOARD_EXTRA };

type Props = {
  snap: PacmanSnapshot;
  boardW: number;
  boardH: number;
  getSnap?: () => PacmanSnapshot;
};

export function PacmanBoard({ snap, boardW, boardH }: Props) {
  const cssW = Math.max(1, Math.floor(boardW));
  const cssH = Math.max(1, Math.floor(boardH + PACMAN_BOARD_EXTRA));
  return <PacmanViewBoard snap={snap} cssW={cssW} cssH={cssH} />;
}
