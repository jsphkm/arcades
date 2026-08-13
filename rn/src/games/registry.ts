import type { Href } from "expo-router";

export type ArcadeGame = {
  id: string;
  title: string;
  href: Href;
};

/** Games available in the Arcades lobby. Append here as new games ship. */
export const ARCADE_GAMES: ArcadeGame[] = [
  {
    id: "snake",
    title: "Snake",
    href: "/games/snake",
  },
];
