export type ThemeMode = "system" | "light" | "dark";
export type ResolvedScheme = "light" | "dark";

export const typography = {
  fontFamily: "JetBrainsMonoNL",
  /** Pixel face for arcade chrome (Press Start 2P). */
  pixelFamily: "PressStart2P",
  body: 16,
};

export const space = {
  board: 400,
  buttonW: 160,
  buttonH: 48,
};

export const palette = {
  light: {
    page: "#eeeeee",
    board: "#dcdcdc",
    button: "#000000",
    buttonPressed: "#282828",
    buttonLabel: "#ffffff",
    hint: "#000000",
    text: "#000000",
    muted: "#555555",
    border: "#c8c8c8",
    accent: "#3858e9",
    statusBar: "dark" as const,
  },
  dark: {
    page: "#222222",
    board: "#2a2a2a",
    button: "#ffffff",
    buttonPressed: "#d0d0d0",
    buttonLabel: "#000000",
    hint: "#eeeeee",
    text: "#eeeeee",
    muted: "#aaaaaa",
    border: "#3a3a3a",
    accent: "#a8c7fa",
    statusBar: "light" as const,
  },
};

export type ThemeColors = (typeof palette)["light"];

export function resolveScheme(
  mode: ThemeMode,
  system: ResolvedScheme | null | undefined
): ResolvedScheme {
  if (mode === "light" || mode === "dark") return mode;
  return system === "dark" ? "dark" : "light";
}
