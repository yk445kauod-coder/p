import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { themes, type Theme, type ThemeMode } from "./theme";
import { useSettings } from "../store/settings";
import { useWebThemeColor } from "../pwa/themeColor";

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const { themeMode, setThemeMode } = useSettings();

  const mode: ThemeMode = themeMode === "system" ? (system === "dark" ? "dark" : "light") : themeMode;

  useWebThemeColor(themes[mode].colors.bg);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[mode],
      mode,
      toggle: () => setThemeMode(mode === "dark" ? "light" : "dark"),
    }),
    [mode, setThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx.theme;
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used inside ThemeProvider");
  return ctx;
}
