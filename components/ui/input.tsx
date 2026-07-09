import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full h-[46px] rounded-ios bg-[var(--ios-bg-secondary)] dark:bg-[var(--ios-bg-secondary)] px-4 text-body text-foreground",
          "border border-border/70 placeholder:text-muted-foreground/70",
          "focus:outline-none focus:ring-2 focus:ring-ios-blue/60 focus:border-ios-blue/50",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "transition-all duration-150",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
