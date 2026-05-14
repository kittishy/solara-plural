export const SOLARA_THEME_STORAGE_KEY = 'solara.theme';
export const SOLARA_APPEARANCE_STORAGE_KEY = 'solara.appearance';

export type SolaraThemeId = 'light' | 'dark';

export type SolaraTheme = {
  id: SolaraThemeId;
  label: string;
  description: string;
};

export const SOLARA_THEMES: SolaraTheme[] = [
  { id: 'light', label: 'Light', description: 'Light mode' },
  { id: 'dark', label: 'Dark', description: 'Dark mode' },
];

export const DEFAULT_SOLARA_THEME: SolaraThemeId = 'light';

export type SolaraAppearance = {
  accentColor: string;
  wallpaperUrl: string;
  wallpaperDim: number;
  wallpaperBlur: number;
  reduceTexture: boolean;
};

export const DEFAULT_SOLARA_APPEARANCE: SolaraAppearance = {
  accentColor: '',
  wallpaperUrl: '',
  wallpaperDim: 72,
  wallpaperBlur: 0,
  reduceTexture: false,
};

export function isSolaraThemeId(value: string | null | undefined): value is SolaraThemeId {
  if (!value) return false;
  return value === 'light' || value === 'dark';
}

export function readStoredSolaraTheme(): SolaraThemeId {
  if (typeof window === 'undefined') return DEFAULT_SOLARA_THEME;
  try {
    const raw = localStorage.getItem(SOLARA_THEME_STORAGE_KEY);
    if (isSolaraThemeId(raw)) return raw;
  } catch {
    // Storage access can fail in private contexts.
  }
  return DEFAULT_SOLARA_THEME;
}

export function applySolaraTheme(themeId: SolaraThemeId) {
  if (typeof document === 'undefined') return;
  if (themeId === 'dark') {
    document.documentElement.setAttribute('data-solara-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-solara-theme');
  }
}

export function persistSolaraTheme(themeId: SolaraThemeId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOLARA_THEME_STORAGE_KEY, themeId);
  } catch {
    // Storage persistence is optional.
  }
}

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
    localStorage.setItem(SOLARA_APPEARANCE_STORAGE_KEY, JSON.stringify(sanitizeSolaraAppearance(appearance)));
  } catch {
    // Appearance persistence is optional.
  }
}

export function applySolaraAppearance(appearance: SolaraAppearance) {
  if (typeof document === 'undefined') return;
  const safe = sanitizeSolaraAppearance(appearance);
  const root = document.documentElement;

  if (safe.accentColor) {
    const soft = darkenHex(safe.accentColor, 0.85);
    const rgb = hexToRgbTriplet(safe.accentColor);
    const softRgb = hexToRgbTriplet(soft);
    root.style.setProperty('--theme-primary', safe.accentColor);
    root.style.setProperty('--theme-primary-rgb', rgb);
    root.style.setProperty('--theme-primary-soft', soft);
    root.style.setProperty('--theme-primary-soft-rgb', softRgb);
    root.style.setProperty('--theme-primary-glow', safe.accentColor);
    root.style.setProperty('--theme-primary-glow-rgb', rgb);
    root.style.setProperty('--theme-front', safe.accentColor);
    root.style.setProperty('--theme-front-rgb', rgb);
    root.style.setProperty('--theme-gold', safe.accentColor);
    root.style.setProperty('--theme-gold-rgb', rgb);
    root.style.setProperty('--theme-nav-active-bg', safe.accentColor);
  } else {
    root.style.removeProperty('--theme-primary');
    root.style.removeProperty('--theme-primary-rgb');
    root.style.removeProperty('--theme-primary-soft');
    root.style.removeProperty('--theme-primary-soft-rgb');
    root.style.removeProperty('--theme-primary-glow');
    root.style.removeProperty('--theme-primary-glow-rgb');
    root.style.removeProperty('--theme-front');
    root.style.removeProperty('--theme-front-rgb');
    root.style.removeProperty('--theme-gold');
    root.style.removeProperty('--theme-gold-rgb');
    root.style.removeProperty('--theme-nav-active-bg');
  }

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
  const record = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const accentColor = typeof record.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(record.accentColor)
    ? record.accentColor
    : '';
  const wallpaperUrl = typeof record.wallpaperUrl === 'string' && isSafeWallpaperSource(record.wallpaperUrl)
    ? record.wallpaperUrl.trim()
    : '';
  const wallpaperDim = typeof record.wallpaperDim === 'number'
    ? clamp(Math.round(record.wallpaperDim), 35, 92)
    : DEFAULT_SOLARA_APPEARANCE.wallpaperDim;
  const wallpaperBlur = typeof record.wallpaperBlur === 'number'
    ? clamp(Math.round(record.wallpaperBlur), 0, 12)
    : DEFAULT_SOLARA_APPEARANCE.wallpaperBlur;

  return {
    accentColor,
    wallpaperUrl,
    wallpaperDim,
    wallpaperBlur,
    reduceTexture: record.reduceTexture === true,
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

function darkenHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  const r = Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function cssEscapeUrl(value: string): string {
  return value.replace(/["\\\n\r]/g, '');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
