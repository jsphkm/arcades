import { ArcadeScoreboard } from "../../../components/ArcadeScoreboard";

export default function HighScoresScreen() {
  return (
    <ArcadeScoreboard
      game="snake"
      title="Snake"
      backHref="/games/snake"
      backLabel="Back to Snake"
      highScoresHref="/games/snake/high-scores"
    />
  );
}
