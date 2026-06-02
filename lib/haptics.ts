"use client";

import { useCallback } from "react";

/**
 * Solara haptics — the web-native answer to React Native "Pulsar".
 *
 * Uses the Web Vibration API (navigator.vibrate), which works on Android
 * Chrome / installed PWAs / TWAs. iOS Safari does not expose it, so every
 * call degrades to a silent no-op there — never throws, never blocks.
 *
 * Patterns are *semantic*: callers ask for the meaning of the moment
 * ("success", "select", "impact") and this module owns the exact ms shape,
 * so the whole app feels consistent. Mirrors the vocabulary of iOS
 * UIFeedbackGenerator (selection / impact / notification).
 */

export type HapticPattern =
  | "selection" // light tick — toggles, tab switches, picking an item
  | "light" // soft tap — generic button press
  | "medium" // firmer tap — primary actions, opening sheets
  | "heavy" // strong tap — significant commits
  | "success" // task done, request accepted
  | "warning" // reversible caution
  | "error" // destructive / failed
  | "send"; // message sent — a quick confident pulse

// ms shapes. A single number is a one-shot buzz; an array alternates
// vibrate/pause/vibrate for textured feedback.
const PATTERNS: Record<HapticPattern, number | number[]> = {
  selection: 8,
  light: 10,
  medium: 18,
  heavy: 28,
  success: [14, 40, 22],
  warning: [20, 60, 20],
  error: [30, 50, 30, 50, 30],
  send: 12,
};

const STORAGE_KEY = "solara.haptics.enabled";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** User can disable haptics in settings; default on. */
export function hapticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* storage blocked — preference simply won't persist */
  }
}

/**
 * Fire a haptic. Safe to call anywhere (SSR, unsupported browsers, during
 * render-adjacent handlers). Returns true if a vibration was actually issued.
 */
export function haptic(pattern: HapticPattern = "light"): boolean {
  if (typeof window === "undefined") return false;
  if (!("vibrate" in navigator) || typeof navigator.vibrate !== "function") {
    return false;
  }
  if (!hapticsEnabled()) return false;
  // Respect the OS "reduce motion" setting for everything except hard
  // error feedback, which is an accessibility signal in its own right.
  if (prefersReducedMotion() && pattern !== "error") return false;
  try {
    return navigator.vibrate(PATTERNS[pattern]);
  } catch {
    return false;
  }
}

/** React hook form — stable callback, ergonomic in components. */
export function useHaptics() {
  const trigger = useCallback((pattern: HapticPattern = "light") => {
    haptic(pattern);
  }, []);

  return {
    haptic: trigger,
    selection: useCallback(() => haptic("selection"), []),
    impact: useCallback(
      (strength: "light" | "medium" | "heavy" = "medium") => haptic(strength),
      []
    ),
    success: useCallback(() => haptic("success"), []),
    warning: useCallback(() => haptic("warning"), []),
    error: useCallback(() => haptic("error"), []),
    send: useCallback(() => haptic("send"), []),
  };
}
