import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function GlassCard({
  className,
  padding = "md",
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "solara-surface rounded-ios shadow-ios",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Grouped section like iOS Settings rows
export function GroupedSection({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-ios bg-[var(--ios-bg-secondary)] border border-border/70 shadow-ios overflow-hidden divide-y divide-border/60",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Row inside GroupedSection
interface GroupedRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  icon?: React.ReactNode;
  value?: React.ReactNode;
  chevron?: boolean;
  /** Accent hex for the icon chip; gives each row its own personality. */
  tint?: string;
}

export function GroupedRow({
  label,
  icon,
  value,
  chevron = false,
  tint,
  className,
  ...props
}: GroupedRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 min-h-[48px] active:bg-muted/50 transition-colors",
        className
      )}
      {...props}
    >
      {icon && (
        <span
          className={cn(
            "w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0",
            !tint && "text-ios-blue bg-ios-blue/12"
          )}
          style={tint ? { color: tint, background: `${tint}1f` } : undefined}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 text-body text-foreground">{label}</span>
      {value && (
        <span className="text-body text-muted-foreground">{value}</span>
      )}
      {chevron && (
        <svg
          width="8"
          height="13"
          viewBox="0 0 8 13"
          fill="none"
          className="text-muted-foreground/60 flex-shrink-0"
        >
          <path
            d="M1 1L7 6.5L1 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
