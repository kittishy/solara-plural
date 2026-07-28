"use client";

import { ArrowLeft } from "lucide-react";
import { useLocalizedRouter } from "@/components/navigation/useLocalizedRouter";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface NavBarProps {
  title?: string;
  backHref?: string;
  backLabel?: string;
  right?: React.ReactNode;
  transparent?: boolean;
  className?: string;
}

export function NavBar({
  title,
  backHref,
  backLabel,
  right,
  transparent = false,
  className,
}: NavBarProps) {
  const router = useLocalizedRouter();
  const { t } = useLanguage();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center h-11 px-4 pt-[var(--safe-top)] box-content",
        !transparent && "glass-bar border-b border-[var(--tabbar-border)]",
        className
      )}
    >
      <div className="flex-1 flex items-center">
        {backHref && (
          <button
            onClick={() => (backHref === "back" ? router.back() : router.push(backHref))}
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1 pr-2 py-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{backLabel ?? t("common.back")}</span>
          </button>
        )}
      </div>

      {title && (
        <h1 className="text-headline font-semibold text-foreground absolute left-1/2 -translate-x-1/2">
          {title}
        </h1>
      )}

      <div className="flex-1 flex items-center justify-end">{right}</div>
    </header>
  );
}

interface LargeTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function LargeTitle({ children, className }: LargeTitleProps) {
  return (
    <h1
      className={cn(
        "large-title text-foreground px-4 pt-2 pb-3",
        className
      )}
    >
      {children}
    </h1>
  );
}
