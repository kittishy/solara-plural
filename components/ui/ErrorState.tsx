"use client";

import { AlertCircle, RotateCw } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface ErrorStateProps {
  /** Called when the user taps "Try again" — usually SWR's `mutate`. */
  onRetry?: () => void;
  /** Whether a retry is currently in flight (spins the icon, disables the button). */
  retrying?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * ErrorState — the friendly counterpart to EmptyState for when a data load
 * fails. Instead of a frozen skeleton or a blank screen (which reads as
 * "broken"), the user gets a clear message and a one-tap retry. Shares
 * EmptyState's illustrated layout so failures feel like part of the product.
 */
export function ErrorState({ onRetry, retrying, title, description, className }: ErrorStateProps) {
  const { t } = useLanguage();

  return (
    <EmptyState
      icon={AlertCircle}
      tint="var(--ios-red)"
      title={title ?? t("common.loadError")}
      description={description ?? t("common.loadErrorDesc")}
      className={className}
      action={
        onRetry ? (
          <Button variant="outline" onClick={onRetry} disabled={retrying}>
            <RotateCw size={16} className={retrying ? "animate-spin" : undefined} />
            {t("common.retry")}
          </Button>
        ) : undefined
      }
    />
  );
}
