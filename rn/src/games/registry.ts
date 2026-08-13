import type { Href } from "expo-router";

export type ArcadeGame = {
  id: string;
  title: string;
  blurb: string;
  href: Href;
  /** Motif accent on the launcher row */
  accent: string;
};

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    id: "snake",
    title: "Snake",
    blurb: "Eat, grow, don’t hit the wall.",
    href: "/games/snake",
    accent: "#3d8c40",
  },
  {
    id: "pacman",
    title: "Pac-Man",
    blurb: "Clear the maze. Outrun the ghosts.",
    href: "/games/pacman",
    accent: "#e8eaed",
  },
];
