"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { haptic, type HapticPattern } from "@/lib/haptics";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 active:scale-[0.97] active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-ios-blue text-white shadow-ios hover:brightness-110 rounded-ios",
        destructive:
          "bg-ios-red text-white shadow-ios hover:brightness-110 rounded-ios",
        outline:
          "border border-border bg-transparent hover:bg-secondary text-foreground rounded-ios",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-ios",
        ghost: "hover:bg-secondary text-foreground rounded-ios",
        link: "text-ios-blue underline-offset-4 hover:underline",
        glass:
          "glass text-foreground hover:brightness-105 rounded-ios shadow-ios",
      },
      size: {
        default: "h-[50px] px-5 text-[17px]",
        sm: "h-9 px-4 text-[15px] rounded-ios-sm",
        lg: "h-14 px-6 text-[17px] rounded-ios-lg",
        icon: "h-10 w-10 rounded-ios-md",
        "icon-sm": "h-8 w-8 rounded-ios-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Haptic on press. Defaults to a variant-appropriate tap; null silences. */
  haptic?: HapticPattern | null;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, haptic: pattern, onPointerDown, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    // Destructive actions get a firmer "warning" tick; everything else a
    // light tap. Callers can override or pass null.
    const resolved: HapticPattern | null =
      pattern === undefined
        ? variant === "destructive"
          ? "warning"
          : "light"
        : pattern;

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (resolved && e.button === 0 && !props.disabled) haptic(resolved);
      onPointerDown?.(e);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onPointerDown={handlePointerDown}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
