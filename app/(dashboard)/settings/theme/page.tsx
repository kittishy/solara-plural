"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sun, Moon, Smartphone, Palette, Save } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { GlassCard, GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { MemberColorPicker } from "@/components/members/MemberColorPicker";
import { cn } from "@/lib/utils";

const ACCENT_STORAGE_KEY = "solara.accentColor";
const DEFAULT_ACCENT = "#007AFF";

export default function ThemeSettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (stored) {
      setAccent(stored);
      applyAccent(stored);
    }
  }, []);

  function applyAccent(color: string) {
    document.documentElement.style.setProperty("--ios-blue", color);
  }

  function handleAccentChange(color: string) {
    setAccent(color);
    applyAccent(color);
    localStorage.setItem(ACCENT_STORAGE_KEY, color);
  }

  function resetAccent() {
    handleAccentChange(DEFAULT_ACCENT);
  }

  const modes = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Smartphone },
  ] as const;

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="flex items-center px-4 h-11">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">Config</span>
          </Link>
          <h1 className="text-headline font-semibold absolute left-1/2 -translate-x-1/2">
            Aparência
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Mode */}
        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Modo
          </p>
          <div className="grid grid-cols-3 gap-2">
            {modes.map((m) => {
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
                  <span className="text-caption-1 font-semibold">
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent color */}
        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Cor de destaque
          </p>
          <GroupedSection>
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] active:bg-muted/50 ios-transition"
            >
              <Palette size={18} className="text-ios-blue flex-shrink-0" />
              <span className="flex-1 text-left text-body text-foreground">
                Personalizar cor
              </span>
              <div
                className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                style={{ background: accent }}
              />
            </button>
            {accent !== DEFAULT_ACCENT && (
              <button
                onClick={resetAccent}
                className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] active:bg-muted/50 ios-transition"
              >
                <span className="w-8" />
                <span className="flex-1 text-left text-body text-ios-blue">
                  Restaurar azul padrão
                </span>
              </button>
            )}
          </GroupedSection>

          {showPicker && (
            <GlassCard padding="lg" className="mt-3 animate-slide-up">
              <MemberColorPicker value={accent} onChange={handleAccentChange} />
            </GlassCard>
          )}
        </div>

        {/* Preview */}
        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Pré-visualização
          </p>
          <GlassCard padding="lg" className="flex flex-col gap-3">
            <Button className="w-full">Botão primário</Button>
            <p className="text-body text-foreground">
              Este é o texto principal. Os links{" "}
              <a className="text-ios-blue font-semibold">aparecem assim</a>.
            </p>
            <div className="flex gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-ios-blue/12 text-ios-blue text-caption-1 font-semibold">
                Badge
              </span>
            </div>
          </GlassCard>
        </div>

        <p className="text-caption-1 text-muted-foreground text-center px-4">
          As preferências são salvas neste dispositivo.
        </p>
      </div>
    </div>
  );
}
