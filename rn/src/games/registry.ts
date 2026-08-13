import type { Href } from "expo-router";

export type ArcadeGame = {
  id: string;
  title: string;
  href: Href;
};

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    id: "snake",
    title: "Snake",
    href: "/games/snake",
  },
];
