'use client';

import { useMemo, useRef } from 'react';

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type HsvColor = {
  h: number;
  s: number;
  v: number;
};

type MemberColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

const FALLBACK_COLOR = '#a78bfa';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function componentToHex(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

function rgbToHex({ r, g, b }: RgbColor) {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function hexToRgb(hex: string): RgbColor | null {
  const normalized = hex.trim().replace(/^#/, '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((part) => part + part).join('')
    : normalized;

  if (!/^[\da-f]{6}$/i.test(expanded)) {
    return null;
  }

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    if (max === green) h = 60 * ((blue - red) / delta + 2);
    if (max === blue) h = 60 * ((red - green) / delta + 4);
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) [red, green, blue] = [chroma, x, 0];
  else if (h < 120) [red, green, blue] = [x, chroma, 0];
  else if (h < 180) [red, green, blue] = [0, chroma, x];
  else if (h < 240) [red, green, blue] = [0, x, chroma];
  else if (h < 300) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  return {
    r: Math.round((red + m) * 255),
    g: Math.round((green + m) * 255),
    b: Math.round((blue + m) * 255),
  };
}

function getValidRgb(value: string) {
  return hexToRgb(value) ?? hexToRgb(FALLBACK_COLOR)!;
}

export default function MemberColorPicker({ value, onChange }: MemberColorPickerProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const rgb = useMemo(() => getValidRgb(value), [value]);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb]);
  const selectedHex = rgbToHex(rgb);
  const hueColor = rgbToHex(hsvToRgb({ h: hsv.h, s: 1, v: 1 }));

  function updateFromHsv(next: HsvColor) {
    onChange(rgbToHex(hsvToRgb({
      h: clamp(next.h, 0, 359),
      s: clamp(next.s, 0, 1),
      v: clamp(next.v, 0, 1),
    })));
  }

  function updateFromArea(clientX: number, clientY: number) {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;

    updateFromHsv({
      h: hsv.h,
      s: clamp((clientX - rect.left) / rect.width, 0, 1),
      v: 1 - clamp((clientY - rect.top) / rect.height, 0, 1),
    });
  }

  function updateRgb(channel: keyof RgbColor, nextValue: string) {
    const parsed = Number.parseInt(nextValue, 10);
    onChange(rgbToHex({
      ...rgb,
      [channel]: Number.isNaN(parsed) ? 0 : clamp(parsed, 0, 255),
    }));
  }

  function handleHexChange(nextValue: string) {
    const nextRgb = hexToRgb(nextValue);
    if (nextRgb) onChange(rgbToHex(nextRgb));
  }

  return (
    <div className="space-y-3">
      <label className="label">Color</label>

      <div
        ref={areaRef}
        role="slider"
        tabIndex={0}
        aria-label="Select member color saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext={`RGB ${rgb.r}, ${rgb.g}, ${rgb.b}`}
        className="relative h-36 overflow-hidden rounded-xl border border-border touch-none shadow-inner"
        style={{
          backgroundColor: hueColor,
          backgroundImage: 'linear-gradient(90deg, #fff, transparent), linear-gradient(0deg, #000, transparent)',
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromArea(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 1) return;
          updateFromArea(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.08 : 0.03;
          if (event.key === 'ArrowRight') updateFromHsv({ ...hsv, s: hsv.s + step });
          if (event.key === 'ArrowLeft') updateFromHsv({ ...hsv, s: hsv.s - step });
          if (event.key === 'ArrowUp') updateFromHsv({ ...hsv, v: hsv.v + step });
          if (event.key === 'ArrowDown') updateFromHsv({ ...hsv, v: hsv.v - step });
        }}
      >
        <span
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.75),0_2px_8px_rgba(0,0,0,0.45)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={359}
        value={Math.round(hsv.h)}
        aria-label="Color hue"
        onChange={(event) => updateFromHsv({ ...hsv, h: Number(event.target.value) })}
        className="h-4 w-full cursor-pointer appearance-none rounded-full border border-border/60 bg-[linear-gradient(90deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)] accent-primary"
      />

      <div className="grid grid-cols-[44px_1fr] gap-3">
        <div
          className="h-11 rounded-xl border border-border"
          style={{ backgroundColor: selectedHex }}
          aria-hidden="true"
        />
        <label className="min-w-0">
          <span className="label mb-1">HEX</span>
          <input
            className="input font-mono uppercase"
            value={selectedHex}
            maxLength={7}
            onChange={(event) => handleHexChange(event.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['r', 'g', 'b'] as const).map((channel) => (
          <label key={channel}>
            <span className="label mb-1 uppercase">{channel}</span>
            <input
              className="input"
              type="number"
              min={0}
              max={255}
              value={rgb[channel]}
              onChange={(event) => updateRgb(channel, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
