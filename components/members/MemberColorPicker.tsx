"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface MemberColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

// Quick palette using m-* tailwind tokens
const QUICK_PALETTE = [
  "#8B5CF6", // m-violet
  "#A855F7", // m-purple
  "#D946EF", // m-fuchsia
  "#EC4899", // m-pink
  "#F43F5E", // m-rose
  "#EF4444", // m-red
  "#F97316", // m-orange
  "#F59E0B", // m-amber
  "#EAB308", // m-yellow
  "#84CC16", // m-lime
  "#22C55E", // m-green
  "#10B981", // m-emerald
  "#14B8A6", // m-teal
  "#06B6D4", // m-cyan
  "#0EA5E9", // m-sky
  "#3B82F6", // m-blue
  "#6366F1", // m-indigo
  "#64748B", // m-slate
  "#737373", // m-neutral
  "#78716C", // m-stone
];

function hexToHsv(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function MemberColorPicker({ value, onChange }: MemberColorPickerProps) {
  const { t } = useLanguage();
  const initial = isValidHex(value) ? value : "#8B5CF6";
  const [hex, setHex] = useState(initial);
  const [hexInput, setHexInput] = useState(initial);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const [h, s, v] = hexToHsv(hex);
  const [r, g, b] = hexToRgb(hex);

  useEffect(() => {
    if (isValidHex(value) && value !== hex) {
      setHex(value);
      setHexInput(value);
    }
  }, [value]); // eslint-disable-line

  function commit(newHex: string) {
    setHex(newHex);
    setHexInput(newHex);
    onChange(newHex);
  }

  function handleSvPointer(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1 && e.type !== "pointerdown") return;
    const target = svRef.current;
    if (!target) return;
    target.setPointerCapture(e.pointerId);
    const rect = target.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    commit(hsvToHex(h, nx, 1 - ny));
  }

  function handleHuePointer(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1 && e.type !== "pointerdown") return;
    const target = hueRef.current;
    if (!target) return;
    target.setPointerCapture(e.pointerId);
    const rect = target.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    commit(hsvToHex(nx * 360, s || 1, v || 1));
  }

  function handleRgbChange(channel: "r" | "g" | "b", val: string) {
    const num = Math.max(0, Math.min(255, parseInt(val) || 0));
    const newRgb = { r, g, b, [channel]: num };
    const newHex = `#${newRgb.r.toString(16).padStart(2, "0")}${newRgb.g
      .toString(16)
      .padStart(2, "0")}${newRgb.b.toString(16).padStart(2, "0")}`;
    commit(newHex);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quick palette */}
      <div className="grid grid-cols-10 gap-1.5">
        {QUICK_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => commit(color)}
            className={cn(
              "aspect-square rounded-full ios-press ios-transition border-2",
              hex.toLowerCase() === color.toLowerCase()
                ? "border-foreground scale-110"
                : "border-transparent"
            )}
            style={{ background: color }}
            aria-label={`Cor ${color}`}
          />
        ))}
      </div>

      {/* SV Picker */}
      <div
        ref={svRef}
        onPointerDown={handleSvPointer}
        onPointerMove={handleSvPointer}
        className="relative w-full h-40 rounded-ios-sm cursor-crosshair overflow-hidden touch-none"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(
            h,
            1,
            1
          )})`,
        }}
        role="slider"
        aria-label={t("members.colorSatBright")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(s * 100)}
      >
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${s * 100}%`,
            top: `${(1 - v) * 100}%`,
            background: hex,
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        onPointerDown={handleHuePointer}
        onPointerMove={handleHuePointer}
        className="relative w-full h-4 rounded-full cursor-pointer touch-none"
        style={{
          background:
            "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
        role="slider"
        aria-label={t("members.colorHue")}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(h)}
      >
        <div
          className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2 top-1/2"
          style={{
            left: `${(h / 360) * 100}%`,
            background: hsvToHex(h, 1, 1),
          }}
        />
      </div>

      {/* Hex + RGB inputs */}
      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-1">
          <label className="text-caption-1 text-muted-foreground font-semibold uppercase tracking-wide">
            Hex
          </label>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => {
              setHexInput(e.target.value);
              if (isValidHex(e.target.value)) commit(e.target.value);
            }}
            className="w-full mt-1 h-9 px-2 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body font-mono text-center focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
        </div>
        {(["r", "g", "b"] as const).map((channel) => (
          <div key={channel}>
            <label className="text-caption-1 text-muted-foreground font-semibold uppercase tracking-wide">
              {channel.toUpperCase()}
            </label>
            <input
              type="number"
              min={0}
              max={255}
              value={{ r, g, b }[channel]}
              onChange={(e) => handleRgbChange(channel, e.target.value)}
              className="w-full mt-1 h-9 px-2 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body text-center focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
