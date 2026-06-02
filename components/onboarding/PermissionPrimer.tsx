"use client";

import * as React from "react";
import { type LucideIcon, Check } from "lucide-react";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface PermissionPrimerProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user accepts — trigger the real system prompt here. */
  onAllow: () => void;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Short reasons we want the permission — builds trust before the popup. */
  benefits?: string[];
  allowLabel?: string;
  laterLabel?: string;
  tint?: string;
}

/**
 * PermissionPrimer — explains WHY Solara wants a sensitive permission
 * (notifications, contacts, calendar…) *before* the irreversible OS prompt
 * appears. iOS/Android only let you ask the system once, so a denied prompt
 * is costly; a warm pre-prompt dramatically lifts opt-in rates and respects
 * the user. Reusable for any permission.
 */
export function PermissionPrimer({
  open,
  onClose,
  onAllow,
  icon: Icon,
  title,
  description,
  benefits = [],
  allowLabel,
  laterLabel,
  tint = "var(--ios-blue)",
}: PermissionPrimerProps) {
  const { t } = useLanguage();

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center pt-2 pb-1">
        {/* Haloed icon */}
        <div className="relative mb-4">
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-25"
            style={{ background: tint }}
            aria-hidden
          />
          <div
            className="relative w-16 h-16 rounded-ios-2xl flex items-center justify-center shadow-ios"
            style={{
              background: `color-mix(in srgb, ${tint} 16%, transparent)`,
              border: `1px solid color-mix(in srgb, ${tint} 24%, transparent)`,
            }}
          >
            <Icon size={28} strokeWidth={1.8} style={{ color: tint }} />
          </div>
        </div>

        <h2 className="text-title-3 text-foreground">{title}</h2>
        <p className="text-subheadline text-muted-foreground mt-1.5 max-w-[20rem] leading-relaxed">
          {description}
        </p>

        {benefits.length > 0 && (
          <ul className="w-full mt-5 flex flex-col gap-2.5 text-left">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `color-mix(in srgb, ${tint} 16%, transparent)` }}
                >
                  <Check size={12} strokeWidth={3} style={{ color: tint }} />
                </span>
                <span className="text-subheadline text-foreground leading-snug">
                  {b}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="w-full flex flex-col gap-2 mt-6">
          <Button
            haptic="medium"
            className="w-full"
            onClick={() => {
              onAllow();
              onClose();
            }}
          >
            {allowLabel ?? t("common.confirm")}
          </Button>
          <Button variant="ghost" haptic="selection" className="w-full" onClick={onClose}>
            {laterLabel ?? t("common.cancel")}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
