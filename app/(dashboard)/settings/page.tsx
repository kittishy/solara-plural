"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  User,
  Bell,
  Shield,
  Download,
  Upload,
  Trash2,
  ChevronRight,
  Moon,
  Globe,
  LogOut,
} from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { LanguageSelector } from "@/components/language/LanguageSelector";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { LANGUAGES } from "@/lib/i18n";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [signingOut, setSigningOut] = useState(false);

  const themeLabel =
    theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema";
  const currentLang = LANGUAGES.find((l) => l.code === language);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  function cycleTheme() {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  }

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-14 pb-2">
        <LargeTitle className="px-0">Configurações</LargeTitle>
      </div>

      {/* Profile */}
      <div className="px-4 mb-6">
        <GroupedSection>
          <GroupedRow
            label={session?.user?.name ?? "Sistema"}
            icon={
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-caption-1 bg-ios-blue/20 text-ios-blue">
                  {(session?.user?.name ?? "S")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            }
            value={
              <span className="text-caption-1 text-muted-foreground">
                {session?.user?.email}
              </span>
            }
          />
        </GroupedSection>
      </div>

      {/* Appearance */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Aparência
        </p>
        <GroupedSection>
          <GroupedRow
            label="Tema"
            icon={<Moon size={18} />}
            value={themeLabel}
            chevron
            onClick={cycleTheme}
            className="cursor-pointer"
          />
        </GroupedSection>
      </div>

      {/* Account */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Conta
        </p>
        <GroupedSection>
          <GroupedRow
            label="Perfil"
            icon={<User size={18} />}
            chevron
            className="cursor-pointer"
          />
          <GroupedRow
            label="Notificações"
            icon={<Bell size={18} />}
            chevron
            className="cursor-pointer"
          />
          <div className="flex items-center gap-3 px-4 py-2 min-h-[44px]">
            <span className="w-8 h-8 flex items-center justify-center text-ios-blue flex-shrink-0">
              <Globe size={18} />
            </span>
            <span className="flex-1 text-body text-foreground">Idioma</span>
            <LanguageSelector />
          </div>
          <GroupedRow
            label="Privacidade"
            icon={<Shield size={18} />}
            chevron
            className="cursor-pointer"
          />
        </GroupedSection>
      </div>

      {/* Data */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Dados
        </p>
        <GroupedSection>
          <GroupedRow
            label="Exportar dados"
            icon={<Download size={18} />}
            chevron
            className="cursor-pointer"
            onClick={async () => {
              const res = await fetch("/api/export");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "solara-export.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
          <GroupedRow
            label="Importar dados"
            icon={<Upload size={18} />}
            chevron
            className="cursor-pointer"
          />
        </GroupedSection>
      </div>

      {/* Danger zone */}
      <div className="px-4 mb-6">
        <GroupedSection>
          <GroupedRow
            label="Excluir conta"
            icon={<Trash2 size={18} className="text-ios-red" />}
            chevron
            className="cursor-pointer"
          />
        </GroupedSection>
      </div>

      {/* Sign out */}
      <div className="px-4 mb-10">
        <Button
          variant="outline"
          className="w-full text-ios-red border-ios-red/30 hover:bg-ios-red/5"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut size={18} />
          {signingOut ? "Saindo..." : "Sair da conta"}
        </Button>
      </div>
    </div>
  );
}
