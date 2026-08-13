import { ArcadeScoreboard } from "../../../components/ArcadeScoreboard";

export default function PacmanHighScoresScreen() {
  return (
    <ArcadeScoreboard
      game="pacman"
      title="Pac-Man"
      backHref="/games/pacman"
      backLabel="Back to Pac-Man"
      highScoresHref="/games/pacman/high-scores"
    />
  );
}
