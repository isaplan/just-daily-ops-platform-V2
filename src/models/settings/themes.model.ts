/**
 * Settings Themes Model Layer
 * Type definitions for theme settings
 */

export type Theme = "light" | "dark" | "system";

export interface ThemeSettings {
  theme: Theme;
  accentColor?: string;
}




