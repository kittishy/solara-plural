"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, BellRing, BellOff } from "lucide-react";
import { GlassCard, GroupedSection, GroupedRow } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { requestAndSavePushToken } from "@/lib/notifications/browser";

export default function NotificationsSettingsPage() {
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  async function enable() {
    setEnabling(true);
    setError("");
    const result = await requestAndSavePushToken();
    if (!result.success) {
      const messages: Record<string, string> = {
        notifications_unsupported: "Não suportado neste navegador",
        push_unsupported: "Push não disponível",
        permission_not_granted: "Você precisa permitir nas configurações",
        web_push_not_configured: "Push não configurado no servidor",
        subscription_save_failed: "Falha ao salvar",
      };
      setError(messages[result.reason] ?? "Erro desconhecido");
    } else {
      setPermission("granted");
    }
    setEnabling(false);
  }

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
            Notificações
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        <GlassCard padding="lg">
          <div className="flex flex-col items-center gap-3 text-center">
            {permission === "granted" ? (
              <BellRing size={32} className="text-ios-green" />
            ) : permission === "denied" ? (
              <BellOff size={32} className="text-ios-red" />
            ) : (
              <Bell size={32} className="text-muted-foreground" />
            )}
            <div>
              <h2 className="text-title-3 text-foreground">
                {permission === "granted"
                  ? "Notificações ativas"
                  : permission === "denied"
                    ? "Notificações bloqueadas"
                    : permission === "unsupported"
                      ? "Não suportado"
                      : "Push desativado"}
              </h2>
              <p className="text-subheadline text-muted-foreground mt-1">
                {permission === "granted"
                  ? "Você recebe alertas em tempo real"
                  : permission === "denied"
                    ? "Habilite nas configurações do navegador"
                    : permission === "unsupported"
                      ? "Seu navegador não suporta push"
                      : "Ative para receber alertas"}
              </p>
            </div>
            {permission === "default" && (
              <Button onClick={enable} disabled={enabling}>
                {enabling ? "Ativando..." : "Ativar push"}
              </Button>
            )}
            {error && (
              <p className="text-subheadline text-ios-red">{error}</p>
            )}
          </div>
        </GlassCard>

        <div>
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Tipos de notificação
          </p>
          <GroupedSection>
            <GroupedRow label="Mudanças de frente" value="Ativo" />
            <GroupedRow label="Pedidos de amizade" value="Ativo" />
            <GroupedRow label="Pedidos de parceria" value="Ativo" />
            <GroupedRow label="Lembretes de check-in" value="Ativo" />
          </GroupedSection>
          <p className="text-caption-1 text-muted-foreground mt-2 px-1">
            Todos os tipos são enviados quando push está ativo.
          </p>
        </div>
      </div>
    </div>
  );
}
