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
        "glass rounded-ios-lg shadow-ios dark:shadow-ios-dark",
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
        "rounded-ios-lg bg-[var(--ios-bg-secondary)] shadow-ios dark:shadow-ios-dark overflow-hidden divide-y divide-border/60",
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
}

export function GroupedRow({
  label,
  icon,
  value,
  chevron = false,
  className,
  ...props
}: GroupedRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 min-h-[44px] active:bg-muted/50 transition-colors",
        className
      )}
      {...props}
    >
      {icon && (
        <span className="w-8 h-8 flex items-center justify-center text-ios-blue flex-shrink-0">
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
