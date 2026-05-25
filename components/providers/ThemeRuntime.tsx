"use client";
import { useEffect } from "react";
import {
  readStoredCustomTheme,
  applyCustomTheme,
  readStoredSolaraAppearance,
  applySolaraAppearance,
  DEFAULT_SOLARA_COLORS,
} from "@/lib/theme";

export function ThemeRuntime() {
  useEffect(() => {
    const colors = readStoredCustomTheme();
    const isCustomized = JSON.stringify(colors) !== JSON.stringify(DEFAULT_SOLARA_COLORS);

    if (isCustomized) {
      applyCustomTheme(colors);
      const root = document.documentElement;
      root.style.setProperty("--ios-bg", colors.bg);
      root.style.setProperty("--ios-bg-secondary", colors.surface);
      root.style.setProperty("--ios-blue", colors.primary);
      root.style.setProperty("--ios-bg-tertiary", colors.surface);
      root.style.setProperty("--ios-grouped-bg", colors.bg);
    }

    const appearance = readStoredSolaraAppearance();
    applySolaraAppearance(appearance);
  }, []);

  return null;
}
