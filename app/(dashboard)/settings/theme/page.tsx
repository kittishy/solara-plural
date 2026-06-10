"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sun,
  Moon,
  Smartphone,
  ChevronRight,
  RefreshCw,
  Image as ImageIcon,
  Save,
} from "lucide-react";
import { useTheme } from "next-themes";
import { GlassCard, GroupedSection } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberColorPicker } from "@/components/members/MemberColorPicker";
import { BottomSheet } from "@/components/glass/BottomSheet";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  readStoredCustomTheme,
  persistCustomTheme,
  applyCustomTheme,
  clearCustomTheme,
  isCustomTheme,
  readStoredSolaraAppearance,
  persistSolaraAppearance,
  applySolaraAppearance,
  extractPaletteFromWallpaper,
  DEFAULT_SOLARA_COLORS,
  DEFAULT_SOLARA_APPEARANCE,
  type SolaraCustomColors,
  type SolaraAppearance,
} from "@/lib/theme";

type ColorField = keyof SolaraCustomColors;

export default function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const COLOR_ROWS: { field: ColorField; label: string }[] = [
    { field: "bg", label: t("theme.bg") },
    { field: "surface", label: t("theme.surface") },
    { field: "primary", label: t("theme.primary") },
    { field: "front", label: t("theme.front") },
    { field: "text", label: t("theme.text") },
    { field: "border", label: t("theme.border") },
  ];

  const MODES = [
    { value: "light", label: t("theme.light"), icon: Sun },
    { value: "dark", label: t("theme.dark"), icon: Moon },
    { value: "system", label: t("theme.system"), icon: Smartphone },
  ] as const;

  const [colors, setColors] = useState<SolaraCustomColors>(DEFAULT_SOLARA_COLORS);
  const [appearance, setAppearance] = useState<SolaraAppearance>(DEFAULT_SOLARA_APPEARANCE);
  const [pickerField, setPickerField] = useState<ColorField | null>(null);
  const [wallpaperInput, setWallpaperInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedColors = readStoredCustomTheme();
    const storedAppearance = readStoredSolaraAppearance();
    setColors(storedColors);
    setAppearance(storedAppearance);
    setWallpaperInput(storedAppearance.wallpaperUrl);
  }, []);

  const handleColorChange = useCallback((field: ColorField, value: string) => {
    setColors((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleRestoreColors = useCallback(() => {
    setColors(DEFAULT_SOLARA_COLORS);
  }, []);

  const handleWallpaperInputBlur = useCallback(() => {
    setAppearance((prev) => ({ ...prev, wallpaperUrl: wallpaperInput.trim() }));
  }, [wallpaperInput]);

  const handleRemoveWallpaper = useCallback(() => {
    setWallpaperInput("");
    setAppearance((prev) => ({ ...prev, wallpaperUrl: "" }));
  }, []);

  const handleAdaptTheme = useCallback(async () => {
    const url = appearance.wallpaperUrl || wallpaperInput.trim();
    if (!url) return;
    setExtracting(true);
    try {
      const palette = await extractPaletteFromWallpaper(url);
      setColors(palette);
    } catch {
      // extraction failed silently
    } finally {
      setExtracting(false);
    }
  }, [appearance.wallpaperUrl, wallpaperInput]);

  const handleAutoAdaptToggle = useCallback(() => {
    const next = !appearance.autoAdaptTheme;
    setAppearance((prev) => ({ ...prev, autoAdaptTheme: next }));
    if (next) {
      handleAdaptTheme();
    }
  }, [appearance.autoAdaptTheme, handleAdaptTheme]);

  const handleSave = useCallback(() => {
    const finalAppearance: SolaraAppearance = {
      ...appearance,
      wallpaperUrl: wallpaperInput.trim() || appearance.wallpaperUrl,
    };

    persistCustomTheme(colors);
    persistSolaraAppearance(finalAppearance);

    // Custom colours replace the light/dark palettes entirely; restoring the
    // defaults removes every override so the selected mode takes effect again.
    if (isCustomTheme(colors)) {
      applyCustomTheme(colors);
    } else {
      clearCustomTheme();
    }
    applySolaraAppearance(finalAppearance);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [colors, appearance, wallpaperInput]);

  const activePickerColor = pickerField ? colors[pickerField] : "#000000";

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40 pt-[var(--safe-top)]">
        <div className="flex items-center px-4 h-11">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("settings.title")}</span>
          </Link>
          <h1 className="text-headline font-semibold absolute left-1/2 -translate-x-1/2">
            {t("theme.appearance")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-6">
        {/* A) Mode toggle */}
        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("theme.mode")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => setTheme(m.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 py-4 rounded-ios-lg ios-press ios-transition",
                    theme === m.value
                      ? "bg-ios-blue text-white"
                      : "glass text-foreground"
                  )}
                >
                  <Icon size={24} />
                  <span className="text-caption-1 font-semibold">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* B) Custom colors */}
        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("theme.systemColors")}
          </p>
          <GroupedSection>
            {COLOR_ROWS.map(({ field, label }, idx) => (
              <button
                key={field}
                onClick={() => setPickerField(field)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 min-h-[44px] active:bg-muted/50 ios-transition",
                  idx < COLOR_ROWS.length - 1 && "border-b border-border/60"
                )}
              >
                <div
                  className="w-7 h-7 rounded-full border border-border/60 shadow-sm flex-shrink-0"
                  style={{ background: colors[field] }}
                />
                <span className="flex-1 text-left text-body text-foreground">{label}</span>
                <span className="text-caption-1 text-muted-foreground font-mono uppercase">
                  {colors[field]}
                </span>
                <ChevronRight size={16} className="text-muted-foreground/60 flex-shrink-0" />
              </button>
            ))}
          </GroupedSection>

          <button
            onClick={handleRestoreColors}
            className="mt-2 w-full flex items-center justify-center gap-2 py-3 text-ios-blue text-body ios-press ios-transition"
          >
            <RefreshCw size={15} />
            <span>{t("settings.restoreDefaults")}</span>
          </button>
          <p className="text-caption-2 text-muted-foreground px-1">
            {t("theme.customOverridesMode")}
          </p>
        </div>

        {/* C) Wallpaper */}
        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("theme.wallpaper")}
          </p>
          <GlassCard padding="md" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-caption-1 text-muted-foreground font-medium flex items-center gap-1.5">
                <ImageIcon size={13} />
                {t("theme.wallpaperUrl")}
              </label>
              <Input
                type="url"
                placeholder="https://example.com/wallpaper.jpg"
                value={wallpaperInput}
                onChange={(e) => setWallpaperInput(e.target.value)}
                onBlur={handleWallpaperInputBlur}
                className="text-body"
              />
              <p className="text-caption-2 text-muted-foreground px-0.5">
                {t("theme.wallpaperUrlHint")}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-caption-1 text-muted-foreground font-medium flex items-center gap-1.5">
                <ImageIcon size={13} />
                {t("theme.orUpload")}
              </label>
              <label className="flex items-center justify-center gap-2 py-3 rounded-ios-md bg-secondary ios-press cursor-pointer">
                <ImageIcon size={16} className="text-ios-blue" />
                <span className="text-body text-ios-blue font-medium">{t("theme.chooseFile")}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result as string;
                      setWallpaperInput(dataUrl);
                      setAppearance((prev) => ({ ...prev, wallpaperUrl: dataUrl }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <p className="text-caption-2 text-muted-foreground px-0.5">
                {t("theme.imageFormats")}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-caption-1 text-muted-foreground font-medium">
                    {t("theme.dim")}
                  </label>
                  <span className="text-caption-1 text-muted-foreground font-mono">
                    {appearance.wallpaperDim}%
                  </span>
                </div>
                <input
                  type="range"
                  min={35}
                  max={92}
                  value={appearance.wallpaperDim}
                  onChange={(e) =>
                    setAppearance((prev) => ({
                      ...prev,
                      wallpaperDim: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-ios-blue h-1 rounded-full cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-caption-1 text-muted-foreground font-medium">
                    {t("theme.blur")}
                  </label>
                  <span className="text-caption-1 text-muted-foreground font-mono">
                    {appearance.wallpaperBlur}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  value={appearance.wallpaperBlur}
                  onChange={(e) =>
                    setAppearance((prev) => ({
                      ...prev,
                      wallpaperBlur: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-ios-blue h-1 rounded-full cursor-pointer"
                />
              </div>
            </div>

            {(appearance.wallpaperUrl || wallpaperInput.trim()) && (
              <button
                onClick={handleRemoveWallpaper}
                className="flex items-center justify-center gap-1.5 py-2 text-destructive text-body ios-press ios-transition"
              >
                <span>{t("theme.removeWallpaper")}</span>
              </button>
            )}
          </GlassCard>
        </div>

        {/* D) Options */}
        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("theme.options")}
          </p>
          <GroupedSection>
            <div className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
              <span className="flex-1 text-body text-foreground">{t("theme.reduceTextures")}</span>
              <button
                role="switch"
                aria-checked={appearance.reduceTexture}
                onClick={() =>
                  setAppearance((prev) => ({
                    ...prev,
                    reduceTexture: !prev.reduceTexture,
                  }))
                }
                className={cn(
                  "relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  appearance.reduceTexture ? "bg-ios-blue" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                    appearance.reduceTexture ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 min-h-[44px] border-t border-border/60">
              <div className="flex-1">
                <p className="text-body text-foreground">{t("theme.highContrast")}</p>
                <p className="text-caption-1 text-muted-foreground mt-0.5">{t("theme.highContrastHint")}</p>
              </div>
              <button
                role="switch"
                aria-checked={appearance.highContrast}
                onClick={() =>
                  setAppearance((prev) => ({
                    ...prev,
                    highContrast: !prev.highContrast,
                  }))
                }
                className={cn(
                  "relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  appearance.highContrast ? "bg-ios-blue" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                    appearance.highContrast ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 min-h-[44px] border-t border-border/60">
              <div className="flex-1">
                <p className="text-body text-foreground">{t("theme.adaptToWallpaper")}</p>
                {extracting && (
                  <p className="text-caption-1 text-muted-foreground mt-0.5">{t("theme.extracting")}</p>
                )}
              </div>
              <button
                role="switch"
                aria-checked={appearance.autoAdaptTheme}
                onClick={handleAutoAdaptToggle}
                disabled={extracting}
                className={cn(
                  "relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                  appearance.autoAdaptTheme ? "bg-ios-blue" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                    appearance.autoAdaptTheme ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </GroupedSection>
        </div>

        {/* E) Preview */}
        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {t("theme.preview")}
          </p>
          <GlassCard padding="lg" className="flex flex-col gap-3">
            <Button className="w-full">{t("theme.primaryButton")}</Button>
            <p className="text-body text-foreground">
              {t("theme.primaryButton")}{" "}
              <a className="text-ios-blue font-semibold">{t("theme.primary")}</a>
            </p>
            <div className="flex gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-ios-blue/12 text-ios-blue text-caption-1 font-semibold">
                Badge
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-caption-1 font-semibold"
                style={{
                  background: colors.primary + "22",
                  color: colors.primary,
                }}
              >
                {t("theme.primaryColor")}
              </span>
            </div>
            <div className="flex gap-1.5 mt-1">
              {COLOR_ROWS.map(({ field }) => (
                <div
                  key={field}
                  title={field}
                  className="flex-1 h-6 rounded-md border border-border/40"
                  style={{ background: colors[field] }}
                />
              ))}
            </div>
          </GlassCard>
        </div>

        {/* F) Save button */}
        <Button
          onClick={handleSave}
          className={cn(
            "w-full gap-2 ios-transition",
            saved && "bg-green-500 hover:bg-green-500"
          )}
          size="lg"
        >
          <Save size={18} />
          {saved ? t("settings.saved") : t("settings.saveApply")}
        </Button>

        <p className="text-caption-1 text-muted-foreground text-center px-4 -mt-2">
          {t("theme.prefsDevice")}
        </p>
      </div>

      <BottomSheet
        open={pickerField !== null}
        onClose={() => setPickerField(null)}
        title={
          pickerField
            ? COLOR_ROWS.find((r) => r.field === pickerField)?.label
            : undefined
        }
      >
        {pickerField && (
          <MemberColorPicker
            value={activePickerColor}
            onChange={(val) => handleColorChange(pickerField, val)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
