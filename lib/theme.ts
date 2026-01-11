/**
 * Theme Management Service with Context
 * Handles theme persistence and system theme detection globally
 */

import { useColorScheme as useRNColorScheme, ColorSchemeName, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useContext, createContext, useCallback, ReactNode } from "react";
import { logger } from "./logger";

const THEME_KEY = "app:theme";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  themeMode: ThemeMode;
  colorScheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Get stored theme preference
 */
export async function getStoredTheme(): Promise<ThemeMode> {
  try {
    const stored = await AsyncStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    return "system"; // Default
  } catch {
    return "system";
  }
}

/**
 * Save theme preference
 */
export async function setStoredTheme(theme: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    logger.error("[Theme] Failed to save", error);
  }
}

/**
 * Resolve actual color scheme based on theme mode and system preference
 */
export function resolveColorScheme(
  themeMode: ThemeMode,
  systemScheme: ColorSchemeName
): "light" | "dark" {
  if (themeMode === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }
  return themeMode;
}

/**
 * Theme Provider Component - wrap your app with this
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [isLoading, setIsLoading] = useState(true);

  // Load stored theme on mount
  useEffect(() => {
    getStoredTheme().then((stored) => {
      setThemeModeState(stored);

      // IMPORTANT:
      // If the stored mode is "system", do NOT force a specific scheme here.
      // Forcing (e.g., to the current system scheme) can lock the app and prevent
      // later OS theme changes from propagating.
      if (stored === "system") {
        Appearance.setColorScheme(null);
      } else {
        Appearance.setColorScheme(stored);
      }

      setIsLoading(false);
    });
  }, []);

  // Compute actual color scheme - updates when themeMode or systemScheme changes
  const colorScheme = resolveColorScheme(themeMode, systemScheme);

  // Update Appearance whenever theme mode changes
  useEffect(() => {
    if (themeMode === "system") {
      // Let the system control the theme - pass null to follow system settings
      Appearance.setColorScheme(null);
    } else {
      // Explicitly set light or dark
      Appearance.setColorScheme(themeMode);
    }
  }, [themeMode]);

  // Update theme mode and persist
  const setTheme = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await setStoredTheme(mode);
  }, []);

  const value: ThemeContextType = {
    themeMode,
    colorScheme,
    setTheme,
    isLoading,
  };

  return React.createElement(
    ThemeContext.Provider,
    { value },
    children
  );
}

/**
 * Custom hook for theme management with real-time updates
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
