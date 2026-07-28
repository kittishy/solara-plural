"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

// A stack of currently-open sheets so that, when sheets are layered (e.g. the
// role picker over the member picker), only the topmost one reacts to Escape
// and Tab. Without this, every open sheet's window listeners fire at once and
// fight over focus.
const openSheetStack: symbol[] = [];

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<symbol>(Symbol("bottom-sheet"));
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Register this sheet on the stack while it's open so the topmost-only
  // guards below can tell whether it owns the keyboard.
  useEffect(() => {
    if (!open) return;
    const id = idRef.current;
    openSheetStack.push(id);
    return () => {
      const i = openSheetStack.lastIndexOf(id);
      if (i !== -1) openSheetStack.splice(i, 1);
    };
  }, [open]);

  const isTopmost = () => openSheetStack[openSheetStack.length - 1] === idRef.current;

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

  // Focus management: move focus into the sheet on open, keep it trapped while
  // open, and return it to whatever was focused before (usually the trigger)
  // on close. Without this, keyboard/screen-reader users are left behind the
  // modal and Tab escapes to the page underneath.
  useEffect(() => {
    if (!open || !mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first focusable control, or the sheet itself as a fallback.
    const focusFirst = () => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = sheet.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? sheet).focus();
    };
    // Defer to the next frame so the animated element is in the DOM/visible.
    const raf = requestAnimationFrame(focusFirst);

    return () => {
      cancelAnimationFrame(raf);
      // Return focus only if it's still inside the sheet (don't yank it away
      // from wherever the user has since moved).
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      // Only the topmost sheet owns the keyboard when sheets are layered.
      if (!isTopmost()) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      // Wrap focus at the edges so Tab never leaves the modal.
      if (e.shiftKey && (active === first || !sheet.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={cn(
          "relative w-full sm:max-w-md mx-auto sm:mb-0 rounded-t-ios-lg sm:rounded-ios-lg",
          "bg-[var(--ios-bg-secondary)] border border-border/70 shadow-ios-lg",
          "animate-slide-up max-h-[90vh] overflow-hidden flex flex-col",
          "safe-bottom outline-none",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : t("common.dialog")}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h2 id={titleId} className="text-headline font-semibold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center ios-press"
              aria-label={t("common.close")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
