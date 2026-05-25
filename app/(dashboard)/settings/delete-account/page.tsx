"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { localizePathname } from "@/lib/i18n";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DeleteAccountPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { language } = useLanguage();
  const [confirmation, setConfirmation] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const accountEmail = session?.user?.email?.trim().toLowerCase() ?? "";
  const canSubmit =
    confirmation.trim().toUpperCase() === "EXCLUIR" &&
    confirmEmail.trim().toLowerCase() === accountEmail &&
    acknowledged &&
    accountEmail.length > 0;

  async function handleDelete() {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/deletion", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmEmail,
          acknowledgeRecoveryWindow: acknowledged,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Erro ao processar exclusao");
        return;
      }
      await signOut({ callbackUrl: localizePathname("/login", language) });
    } finally {
      setSubmitting(false);
    }
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
            Excluir conta
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        <GlassCard padding="lg" className="bg-ios-red/5 border-ios-red/20">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-ios-red/15 flex items-center justify-center">
              <AlertTriangle size={24} className="text-ios-red" />
            </div>
            <h2 className="text-title-3 text-foreground">Atencao</h2>
            <p className="text-body text-muted-foreground">
              Isso vai agendar a exclusao da sua conta, todos os membros, notas,
              historico de front, parcerias, amizades e qualquer dado associado.
              <br />
              <br />
              <strong className="text-foreground">
                Voce tera 72 horas para cancelar antes da remocao permanente.
              </strong>
            </p>
          </div>
        </GlassCard>

        <GlassCard padding="lg" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmEmail">Confirme seu email</Label>
            <Input
              id="confirmEmail"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={session?.user?.email ?? "email@exemplo.com"}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmation">
              Digite <strong className="text-ios-red">EXCLUIR</strong> para confirmar
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="EXCLUIR"
            />
          </div>

          <label className="flex items-start gap-3 rounded-ios-sm bg-secondary p-3 ios-press">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 accent-ios-red"
            />
            <span className="text-subheadline text-muted-foreground">
              Entendo que a conta fica em recuperacao por 72 horas e depois
              pode ser removida permanentemente.
            </span>
          </label>

          {error && (
            <p className="text-subheadline text-ios-red text-center">{error}</p>
          )}

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canSubmit || submitting}
            className="w-full"
          >
            {submitting ? "Agendando..." : "Agendar exclusao da conta"}
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push("/settings")}
            className="w-full"
          >
            Cancelar
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}
