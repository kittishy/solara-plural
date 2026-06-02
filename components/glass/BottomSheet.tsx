"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    // A soft tactile "lift" as the sheet rises into view.
    haptic("medium");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className={cn(
          "relative w-full sm:max-w-md mx-auto sm:mb-0 rounded-t-ios-2xl sm:rounded-ios-2xl",
          "bg-[var(--ios-bg-secondary)] shadow-ios-lg dark:shadow-ios-dark",
          "animate-slide-up max-h-[90vh] overflow-hidden flex flex-col",
          "safe-bottom",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h2 className="text-headline font-semibold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center ios-press"
              aria-label={t("common.close")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
