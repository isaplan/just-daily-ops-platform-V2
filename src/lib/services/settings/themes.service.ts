/**
 * Settings Themes Service Layer
 * Data fetching for theme settings
 */

import { ThemeSettings } from "@/models/settings/themes.model";

/**
 * Fetch theme settings from localStorage
 */
export function getThemeSettings(): ThemeSettings {
  if (typeof window === "undefined") {
    return { theme: "system" };
  }

  const stored = localStorage.getItem("theme-settings");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { theme: "system" };
    }
  }

  return { theme: "system" };
}

/**
 * Save theme settings to localStorage
 */
export function saveThemeSettings(settings: ThemeSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("theme-settings", JSON.stringify(settings));
}




