"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";

function getResetPasswordErrorMessage(code: unknown) {
  if (code === "RATE_LIMITED") return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (code === "INVALID_TOKEN") return "Link invalido ou expirado. Solicite uma nova redefinicao.";
  if (code === "WEAK_PASSWORD") return "Use uma senha com pelo menos 8 caracteres.";
  return "Erro ao redefinir senha";
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const password = data.get("password") as string;
    const confirm = data.get("confirm") as string;

    if (password !== confirm) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        setError(json?.error ?? getResetPasswordErrorMessage(json?.code));
        return;
      }

      setDone(true);
    } catch {
      setError("Erro ao redefinir. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <GlassCard className="w-full text-center" padding="lg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-ios-green/12 flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
          <p className="text-body text-foreground">
            Senha redefinida com sucesso!
          </p>
          <Button asChild size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="w-full" padding="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ios-transition p-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            placeholder="Repita a senha"
            minLength={8}
            required
          />
        </div>

        {error && (
          <p className="text-subheadline text-ios-red text-center">{error}</p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !token}
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </GlassCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-title-1 text-foreground">Nova senha</h1>
        <p className="text-subheadline text-muted-foreground mt-1">
          Escolha uma senha segura
        </p>
      </div>

      <Suspense
        fallback={
          <GlassCard className="w-full" padding="lg">
            <div className="h-40 flex items-center justify-center text-muted-foreground text-subheadline">
              Carregando...
            </div>
          </GlassCard>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
