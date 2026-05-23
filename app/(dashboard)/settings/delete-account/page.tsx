"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = confirmation === "EXCLUIR" && password.length > 0;

  async function handleDelete() {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/deletion", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Erro ao processar exclusão");
        return;
      }
      await signOut({ callbackUrl: "/login" });
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
            <h2 className="text-title-3 text-foreground">Atenção</h2>
            <p className="text-body text-muted-foreground">
              Isso vai excluir permanentemente sua conta, todos os membros, notas,
              histórico de front, parcerias, amizades e qualquer dado associado.
              <br />
              <br />
              <strong className="text-foreground">Esta ação não pode ser desfeita.</strong>
            </p>
          </div>
        </GlassCard>

        <GlassCard padding="lg" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Confirme sua senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {error && (
            <p className="text-subheadline text-ios-red text-center">{error}</p>
          )}

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canSubmit || submitting}
            className="w-full"
          >
            {submitting ? "Excluindo..." : "Excluir minha conta para sempre"}
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
