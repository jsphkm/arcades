import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { useFonts } from "expo-font";
import {
  palette,
  resolveScheme,
  space,
  typography,
  type ThemeColors,
  type ThemeMode,
  type ResolvedScheme,
} from "./theme";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  scheme: ResolvedScheme;
  colors: ThemeColors;
  typography: typeof typography;
  space: typeof space;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);
  const [loaded] = useFonts({
    JetBrainsMonoNL: require("../assets/fonts/JetBrainsMonoNL-Regular.ttf"),
    PressStart2P: require("../assets/fonts/PressStart2P-Regular.ttf"),
  });

  useEffect(() => {
      setMounted(true);
  }, []);

  const value = useMemo(() => {
    const scheme = resolveScheme(mode, system);
    return {
      mode,
      setMode,
      scheme,
      colors: palette[scheme],
      typography,
      space,
    };
  }, [mode, system]);

  if (!loaded || !mounted) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
