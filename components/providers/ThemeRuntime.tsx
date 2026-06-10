"use client";
import { useEffect } from "react";
import {
  readStoredCustomTheme,
  applyCustomTheme,
  clearCustomTheme,
  isCustomTheme,
  readStoredSolaraAppearance,
  applySolaraAppearance,
} from "@/lib/theme";

export function ThemeRuntime() {
  useEffect(() => {
    const colors = readStoredCustomTheme();

    if (isCustomTheme(colors)) {
      applyCustomTheme(colors);
    } else {
      // No customization: make sure stale inline overrides never linger so
      // the light/dark palettes from globals.css are the source of truth.
      clearCustomTheme();
    }

    const appearance = readStoredSolaraAppearance();
    applySolaraAppearance(appearance);
  }, []);

  return null;
}
