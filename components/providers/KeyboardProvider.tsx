"use client";

import { useEffect } from "react";

/**
 * KeyboardProvider — the web translation of "react-native-keyboard-controller".
 *
 * The on-screen keyboard on mobile does NOT resize the layout viewport, so
 * fixed footers (chat composer, sticky CTAs) end up hidden behind it. We use
 * the visualViewport API to measure the keyboard's height and publish it as
 * the CSS variable `--keyboard-inset`. Anything anchored to the bottom can
 * add `padding-bottom: var(--keyboard-inset)` / translate by it to ride up
 * with the keyboard. Also sets `data-keyboard-open` on <html> for styling.
 *
 * Plus a gentle "scroll to dismiss" gesture: an upward content scroll blurs
 * the focused field, matching the iMessage/Telegram feel.
 *
 * Renders nothing. Mounted once in the root layout.
 */
export function KeyboardProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const root = document.documentElement;

    const setInset = (px: number) => {
      root.style.setProperty("--keyboard-inset", `${Math.max(0, Math.round(px))}px`);
      root.toggleAttribute("data-keyboard-open", px > 60);
    };

    if (!vv) {
      // No visualViewport (older browsers): nothing to track, inset stays 0.
      return;
    }

    const update = () => {
      // Keyboard height = how much of the layout viewport the visual viewport
      // no longer covers from the bottom.
      const inset = window.innerHeight - vv.height - vv.offsetTop;
      setInset(inset);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    // Scroll-to-dismiss: an upward swipe on the page lets go of the keyboard.
    let lastY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!root.hasAttribute("data-keyboard-open")) return;
      const y = e.touches[0]?.clientY ?? 0;
      // Dragging content upward (finger moves up) by a clear margin dismisses.
      if (lastY - y > 24) {
        const active = document.activeElement as HTMLElement | null;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          active.blur();
        }
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      setInset(0);
    };
  }, []);

  return null;
}
