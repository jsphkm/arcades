/** Shared arcade stage look — muted monochrome, app-wide. */
export const arcade = {
  bg: "#010101",
  surface: "#121212",
  text: "#e8eaed",
  muted: "rgba(232,234,237,0.55)",
  dim: "rgba(232,234,237,0.32)",
  brand: "#c4c7c5",
  gold: "#e8eaed",
  silver: "#9aa0a6",
  border: "rgba(232,234,237,0.14)",
  hover: "rgba(232,234,237,0.06)",
  pressed: "rgba(232,234,237,0.12)",
  accentSoft: "rgba(232,234,237,0.06)",
  accentSoftHot: "rgba(232,234,237,0.12)",
  scrim: "rgba(0,0,0,0.55)",
  rail: "#0a0a0a",
  glowWhite: "rgba(232,234,237,0.22)",
  glowBrand: "rgba(232,234,237,0.2)",
} as const;

export function formatArcadeScore(n: number) {
  return n === 0 ? "00" : String(Math.floor(n));
}
