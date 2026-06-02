"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { haptic, type HapticPattern } from "@/lib/haptics";

type PressScale = "subtle" | "default" | "deep";

const SCALE_MAP: Record<PressScale, string> = {
  subtle: "0.98",
  default: "0.96",
  deep: "0.93",
};

export interface PressableProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Render the single child as the pressable element (e.g. a Next <Link>). */
  asChild?: boolean;
  /** Press depth. Bigger elements feel best subtler; small ones deeper. */
  scale?: PressScale;
  /** Haptic fired on press. Pass null to stay silent. Default "light". */
  haptic?: HapticPattern | null;
}

/**
 * Pressable — every tappable thing in Solara (buttons, cards, avatars, rows)
 * can wrap in this to get one consistent spring-press animation plus a haptic
 * tick. This is the web translation of React Native's "Pressto".
 *
 * Usage:
 *   <Pressable onClick={...}>Tap</Pressable>
 *   <Pressable asChild scale="subtle" haptic="selection">
 *     <Link href="/members/x">…</Link>
 *   </Pressable>
 */
export const Pressable = React.forwardRef<HTMLButtonElement, PressableProps>(
  (
    {
      asChild = false,
      scale = "default",
      haptic: pattern = "light",
      className,
      style,
      onPointerDown,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      // Fire on press-down (not click) so the buzz lands the instant the
      // finger touches — matching native feel. Skip secondary buttons.
      if (pattern && e.button === 0 && !props.disabled) haptic(pattern);
      onPointerDown?.(e);
    };

    return (
      <Comp
        ref={ref}
        className={cn("solara-pressable", className)}
        style={{ ["--press-scale" as string]: SCALE_MAP[scale], ...style }}
        onPointerDown={handlePointerDown}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Pressable.displayName = "Pressable";
