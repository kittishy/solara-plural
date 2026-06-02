import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Lucide icon shown inside the soft gradient badge. */
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional CTA — usually a <Button> or <Link asChild>. */
  action?: React.ReactNode;
  /** Tint the illustration. Accepts any CSS color (e.g. a member color). */
  tint?: string;
  className?: string;
}

/**
 * EmptyState — Solara's illustrated "nothing here yet" screen. Replaces bare
 * one-liners with a friendly, explanatory layout: a haloed icon, a warm
 * title, a short why, and an optional next step. Animates in softly.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tint = "var(--ios-blue)",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-8 py-12 animate-fade-in",
        className
      )}
    >
      {/* Haloed icon — layered glow rings for a soft, hand-made feel. */}
      <div className="relative mb-5">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-20"
          style={{ background: tint }}
          aria-hidden
        />
        <div
          className="relative w-20 h-20 rounded-ios-2xl flex items-center justify-center shadow-ios"
          style={{
            background: `color-mix(in srgb, ${tint} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${tint} 22%, transparent)`,
          }}
        >
          <Icon size={34} strokeWidth={1.6} style={{ color: tint }} />
        </div>
      </div>

      <h3 className="text-title-3 text-foreground">{title}</h3>
      {description && (
        <p className="text-subheadline text-muted-foreground mt-1.5 max-w-[18rem] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
