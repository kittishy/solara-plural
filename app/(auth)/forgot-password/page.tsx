"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email") }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Erro ao enviar e-mail");
        return;
      }

      setSent(true);
    } catch {
      setError("Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-title-1 text-foreground">Recuperar senha</h1>
        <p className="text-subheadline text-muted-foreground mt-1">
          Enviaremos um link para o seu e-mail
        </p>
      </div>

      {sent ? (
        <GlassCard className="w-full text-center" padding="lg">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-ios-green/12 flex items-center justify-center">
              <span className="text-3xl">✉️</span>
            </div>
            <p className="text-body text-foreground">
              E-mail enviado! Verifique sua caixa de entrada.
            </p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">
                Voltar ao login
              </Link>
            </Button>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="w-full" padding="lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </div>

            {error && (
              <p className="text-subheadline text-ios-red text-center">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        </GlassCard>
      )}

      <Link
        href="/login"
        className="flex items-center gap-1 text-ios-blue text-subheadline hover:opacity-80 ios-transition"
      >
        <ArrowLeft size={16} />
        Voltar ao login
      </Link>
    </div>
  );
}
