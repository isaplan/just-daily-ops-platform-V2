/**
 * Settings Themes ViewModel Layer
 * Business logic for theme settings
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getThemeSettings, saveThemeSettings } from "@/lib/services/settings/themes.service";
import { Theme, ThemeSettings } from "@/models/settings/themes.model";

export function useThemesViewModel() {
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() =>
    getThemeSettings()
  );

  useEffect(() => {
    // Apply theme on mount and when it changes
    const root = document.documentElement;
    if (themeSettings.theme === "dark") {
      root.classList.add("dark");
    } else if (themeSettings.theme === "light") {
      root.classList.remove("dark");
    } else {
      // System theme
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [themeSettings.theme]);

  const handleThemeChange = useCallback((theme: Theme) => {
    const newSettings = { ...themeSettings, theme };
    setThemeSettings(newSettings);
    saveThemeSettings(newSettings);
  }, [themeSettings]);

  return {
    theme: themeSettings.theme,
    handleThemeChange,
  };
}




