export const SOLARA_THEME_STORAGE_KEY = 'solara.theme';
export const SOLARA_APPEARANCE_STORAGE_KEY = 'solara.appearance';

export type SolaraThemeId = 'night' | 'sunrise' | 'forest' | 'ocean' | 'mist';

export type SolaraTheme = {
  id: SolaraThemeId;
  label: string;
  description: string;
  colors: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    borderSoft: string;
    text: string;
    muted: string;
    subtle: string;
    primary: string;
    primarySoft: string;
    primaryGlow: string;
    front: string;
    frontSoft: string;
  };
};

export const SOLARA_THEMES: SolaraTheme[] = [
  {
    id: 'night',
    label: 'Night Bloom',
    description: 'Cozy violet default',
    colors: {
      bg: '#1a1625',
      surface: '#231d33',
      surfaceAlt: '#2d2640',
      border: '#3d3454',
      borderSoft: '#2d2640',
      text: '#e8e0f0',
      muted: '#9d91b5',
      subtle: '#6b5f85',
      primary: '#a78bfa',
      primarySoft: '#7c3aed',
      primaryGlow: '#c4b5fd',
      front: '#f9a8d4',
      frontSoft: '#831843',
    },
  },
  {
    id: 'sunrise',
    label: 'Sunrise Hearth',
    description: 'Warm amber glow',
    colors: {
      bg: '#231a14',
      surface: '#2d2219',
      surfaceAlt: '#3a2c20',
      border: '#5a4532',
      borderSoft: '#4a3729',
      text: '#f4e5d6',
      muted: '#c9ac8e',
      subtle: '#9d7f64',
      primary: '#f59e0b',
      primarySoft: '#d97706',
      primaryGlow: '#fbbf24',
      front: '#fda4af',
      frontSoft: '#9f1239',
    },
  },
  {
    id: 'forest',
    label: 'Forest Quiet',
    description: 'Calm green atmosphere',
    colors: {
      bg: '#141f1b',
      surface: '#1b2a24',
      surfaceAlt: '#23352d',
      border: '#355147',
      borderSoft: '#2b4238',
      text: '#ddeee4',
      muted: '#a2c2b1',
      subtle: '#799887',
      primary: '#34d399',
      primarySoft: '#059669',
      primaryGlow: '#6ee7b7',
      front: '#93c5fd',
      frontSoft: '#1d4ed8',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean Drift',
    description: 'Deep blue comfort',
    colors: {
      bg: '#111a26',
      surface: '#172336',
      surfaceAlt: '#1f2f46',
      border: '#334d6f',
      borderSoft: '#2a405c',
      text: '#e0ebff',
      muted: '#9db6d8',
      subtle: '#7591b8',
      primary: '#60a5fa',
      primarySoft: '#2563eb',
      primaryGlow: '#93c5fd',
      front: '#c4b5fd',
      frontSoft: '#6d28d9',
    },
  },
  {
    id: 'mist',
    label: 'Mist Gray',
    description: 'Warm gray quiet',
    colors: {
      bg: '#191b1b',
      surface: '#222625',
      surfaceAlt: '#2c3130',
      border: '#46504c',
      borderSoft: '#37403c',
      text: '#ebe8df',
      muted: '#b9b4aa',
      subtle: '#8f887e',
      primary: '#c8d0c4',
      primarySoft: '#5f6d64',
      primaryGlow: '#e3e8dc',
      front: '#e8b7c4',
      frontSoft: '#7b4151',
    },
  },
];

export const DEFAULT_SOLARA_THEME: SolaraThemeId = 'night';

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
  return SOLARA_THEMES.some((theme) => theme.id === value);
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
  document.documentElement.setAttribute('data-solara-theme', themeId);
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
    root.style.setProperty('--theme-primary', safe.accentColor);
    root.style.setProperty('--theme-primary-rgb', hexToRgbTriplet(safe.accentColor));
    root.style.setProperty('--theme-primary-glow', safe.accentColor);
    root.style.setProperty('--theme-primary-glow-rgb', hexToRgbTriplet(safe.accentColor));
  } else {
    root.style.removeProperty('--theme-primary');
    root.style.removeProperty('--theme-primary-rgb');
    root.style.removeProperty('--theme-primary-glow');
    root.style.removeProperty('--theme-primary-glow-rgb');
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
