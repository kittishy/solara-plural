export const SOLARA_CUSTOM_THEME_KEY = 'solara.customTheme';
export const SOLARA_APPEARANCE_STORAGE_KEY = 'solara.appearance';

// ─── HSL helpers ──────────────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100;
  const ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function withLightness(hex: string, targetL: number, maxS = 55): string {
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, Math.min(s, maxS), targetL);
}

export type SolaraCustomColors = {
  bg: string;
  surface: string;
  primary: string;
  front: string;
  text: string;
  border: string;
};

export const DEFAULT_SOLARA_COLORS: SolaraCustomColors = {
  bg: '#09070f',
  surface: '#100c1e',
  primary: '#f472b6',
  front: '#c084fc',
  text: '#f2ecff',
  border: '#2a2248',
};

export type SolaraAppearance = {
  wallpaperUrl: string;
  wallpaperDim: number;
  wallpaperBlur: number;
  reduceTexture: boolean;
  autoAdaptTheme: boolean;
};

export const DEFAULT_SOLARA_APPEARANCE: SolaraAppearance = {
  wallpaperUrl: '',
  wallpaperDim: 72,
  wallpaperBlur: 0,
  reduceTexture: false,
  autoAdaptTheme: false,
};

// ─── Color math ───────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexToRgbTriplet(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

function mixColors(hex1: string, hex2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const r = clamp(Math.round(r1 + (r2 - r1) * t), 0, 255);
  const g = clamp(Math.round(g1 + (g2 - g1) * t), 0, 255);
  const b = clamp(Math.round(b1 + (b2 - b1) * t), 0, 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function isHex6(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

// ─── Custom theme ─────────────────────────────────────────────────────────────

export function sanitizeCustomColors(value: unknown): SolaraCustomColors {
  const rec = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return {
    bg: isHex6(rec.bg) ? rec.bg : DEFAULT_SOLARA_COLORS.bg,
    surface: isHex6(rec.surface) ? rec.surface : DEFAULT_SOLARA_COLORS.surface,
    primary: isHex6(rec.primary) ? rec.primary : DEFAULT_SOLARA_COLORS.primary,
    front: isHex6(rec.front) ? rec.front : DEFAULT_SOLARA_COLORS.front,
    text: isHex6(rec.text) ? rec.text : DEFAULT_SOLARA_COLORS.text,
    border: isHex6(rec.border) ? rec.border : DEFAULT_SOLARA_COLORS.border,
  };
}

export function readStoredCustomTheme(): SolaraCustomColors {
  if (typeof window === 'undefined') return DEFAULT_SOLARA_COLORS;
  try {
    const raw = localStorage.getItem(SOLARA_CUSTOM_THEME_KEY);
    if (!raw) return DEFAULT_SOLARA_COLORS;
    return sanitizeCustomColors(JSON.parse(raw));
  } catch {
    return DEFAULT_SOLARA_COLORS;
  }
}

export function persistCustomTheme(colors: SolaraCustomColors) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOLARA_CUSTOM_THEME_KEY, JSON.stringify(sanitizeCustomColors(colors)));
  } catch {
    // Storage persistence is optional.
  }
}

export function applyCustomTheme(colors: SolaraCustomColors) {
  if (typeof document === 'undefined') return;
  const c = sanitizeCustomColors(colors);
  const W = '#ffffff';
  const B = '#000000';
  const root = document.documentElement;

  const derived: Record<string, string> = {
    '--theme-bg': c.bg,
    '--theme-surface': c.surface,
    '--theme-surface-alt': mixColors(c.surface, W, 0.10),
    '--theme-surface-raised': mixColors(c.surface, W, 0.20),
    '--theme-border': c.border,
    '--theme-border-soft': mixColors(c.border, c.bg, 0.42),
    '--theme-border-strong': mixColors(c.border, W, 0.20),
    '--theme-text': c.text,
    '--theme-muted': mixColors(c.text, c.bg, 0.38),
    '--theme-subtle': mixColors(c.text, c.bg, 0.60),
    '--theme-primary': c.primary,
    '--theme-primary-soft': mixColors(c.primary, B, 0.28),
    '--theme-primary-glow': mixColors(c.primary, W, 0.18),
    '--theme-front': c.front,
    '--theme-front-soft': mixColors(c.front, B, 0.52),
  };

  for (const [name, hex] of Object.entries(derived)) {
    root.style.setProperty(name, hex);
    root.style.setProperty(`${name}-rgb`, hexToRgbTriplet(hex));
  }
}

// ─── Appearance (wallpaper, blur, texture) ────────────────────────────────────

export function readStoredSolaraAppearance(): SolaraAppearance {
  if (typeof window === 'undefined') return DEFAULT_SOLARA_APPEARANCE;
  try {
    const raw = localStorage.getItem(SOLARA_APPEARANCE_STORAGE_KEY);
    if (!raw) return DEFAULT_SOLARA_APPEARANCE;
    return sanitizeSolaraAppearance(JSON.parse(raw));
  } catch {
    return DEFAULT_SOLARA_APPEARANCE;
  }
}

export function persistSolaraAppearance(appearance: SolaraAppearance) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      SOLARA_APPEARANCE_STORAGE_KEY,
      JSON.stringify(sanitizeSolaraAppearance(appearance))
    );
  } catch {
    // Storage persistence is optional.
  }
}

export function applySolaraAppearance(appearance: SolaraAppearance) {
  if (typeof document === 'undefined') return;
  const safe = sanitizeSolaraAppearance(appearance);
  const root = document.documentElement;

  if (safe.wallpaperUrl) {
    root.style.setProperty('--solara-wallpaper-image', `url("${cssEscapeUrl(safe.wallpaperUrl)}")`);
  } else {
    root.style.removeProperty('--solara-wallpaper-image');
  }

  root.style.setProperty('--solara-wallpaper-dim', String(safe.wallpaperDim / 100));
  root.style.setProperty('--solara-wallpaper-blur', `${safe.wallpaperBlur}px`);
  root.toggleAttribute('data-solara-reduce-texture', safe.reduceTexture);
}

export function resetSolaraAppearance() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SOLARA_APPEARANCE_STORAGE_KEY);
    } catch {
      // Storage persistence is optional.
    }
  }
  applySolaraAppearance(DEFAULT_SOLARA_APPEARANCE);
}

function sanitizeSolaraAppearance(value: unknown): SolaraAppearance {
  const record =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

  const wallpaperUrl =
    typeof record.wallpaperUrl === 'string' && isSafeWallpaperSource(record.wallpaperUrl)
      ? record.wallpaperUrl.trim()
      : '';
  const wallpaperDim =
    typeof record.wallpaperDim === 'number'
      ? clamp(Math.round(record.wallpaperDim), 35, 92)
      : DEFAULT_SOLARA_APPEARANCE.wallpaperDim;
  const wallpaperBlur =
    typeof record.wallpaperBlur === 'number'
      ? clamp(Math.round(record.wallpaperBlur), 0, 12)
      : DEFAULT_SOLARA_APPEARANCE.wallpaperBlur;

  return {
    wallpaperUrl,
    wallpaperDim,
    wallpaperBlur,
    reduceTexture: record.reduceTexture === true,
    autoAdaptTheme: record.autoAdaptTheme === true,
  };
}

function isSafeWallpaperSource(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function cssEscapeUrl(value: string): string {
  return value.replace(/["\\\n\r]/g, '');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Wallpaper palette extraction ─────────────────────────────────────────────

export async function extractPaletteFromWallpaper(
  imageUrl: string,
): Promise<SolaraCustomColors> {
  const { Vibrant } = await import('node-vibrant/browser');
  const palette = await Vibrant.from(imageUrl).getPalette();

  const vibrant = palette.Vibrant?.hex ?? DEFAULT_SOLARA_COLORS.primary;
  const lightVibrant = palette.LightVibrant?.hex ?? vibrant;
  const darkMuted = palette.DarkMuted?.hex ?? '#1a1030';
  const darkVibrant = palette.DarkVibrant?.hex ?? darkMuted;

  return {
    bg: withLightness(darkMuted, 5),
    surface: withLightness(darkMuted, 9),
    primary: vibrant,
    front: lightVibrant,
    text: '#f2ecff',
    border: withLightness(darkVibrant, 20),
  };
}
