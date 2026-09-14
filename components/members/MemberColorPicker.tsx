"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface MemberColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const QUICK_PALETTE = [
  "#8B5CF6", "#A855F7", "#D946EF", "#EC4899", "#F43F5E",
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
  "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
  "#3B82F6", "#6366F1", "#64748B", "#737373", "#78716C",
];

function isValidHex(hex: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function MemberColorPicker({ value, onChange }: MemberColorPickerProps) {
  const { t } = useLanguage();
  const initial = isValidHex(value) ? value : "#8B5CF6";
  const [hex, setHex] = useState(initial);
  const [hexInput, setHexInput] = useState(initial);

  useEffect(() => {
    if (!isValidHex(value)) return;
    const normalized = value.toUpperCase();
    setHex(normalized);
    setHexInput(normalized);
  }, [value]);

  function commit(color: string) {
    const normalized = color.toUpperCase();
    setHex(normalized);
    setHexInput(normalized);
    onChange(normalized);
  }

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3">
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
        {QUICK_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => commit(color)}
            className={cn(
              "aspect-square rounded-full border-2 ios-press ios-transition",
              hex.toLowerCase() === color.toLowerCase()
                ? "border-foreground scale-105"
                : "border-transparent"
            )}
            style={{ background: color }}
            aria-label={`Cor ${color}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-caption-1 font-semibold text-muted-foreground">
          HEX
        </span>
        <input
          type="text"
          value={hexInput}
          inputMode="text"
          maxLength={7}
          onChange={(event) => {
            const next = event.target.value;
            setHexInput(next);
            if (isValidHex(next)) commit(next);
          }}
          className="min-w-0 flex-1 h-9 px-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-subheadline font-mono focus:outline-none focus:ring-2 focus:ring-ios-blue"
          aria-label="HEX"
        />
        <input
          type="color"
          value={hex}
          onChange={(event) => commit(event.target.value)}
          aria-label={t("members.color")}
          className="h-9 w-11 shrink-0 rounded-ios-sm bg-transparent cursor-pointer"
        />
      </div>
    </div>
  );
}
