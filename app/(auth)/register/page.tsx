"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountType, setAccountType] = useState<"system" | "singlet">("system");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
          accountType,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Erro ao criar conta");
        return;
      }

      const { signIn } = await import("next-auth/react");
      await signIn("credentials", {
        email: data.get("email"),
        password: data.get("password"),
        callbackUrl: "/",
      });
    } catch {
      setError("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-title-1 text-foreground">Criar conta</h1>
        <p className="text-subheadline text-muted-foreground mt-1">
          Bem-vinde ao Solara
        </p>
      </div>

      <GlassCard className="w-full" padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Account type selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAccountType("system")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-ios-lg border-2 ios-transition",
                accountType === "system"
                  ? "border-ios-blue bg-ios-blue/10"
                  : "border-border/60 bg-secondary"
              )}
            >
              <Users size={22} className={accountType === "system" ? "text-ios-blue" : "text-muted-foreground"} />
              <span className={cn("text-subheadline font-semibold", accountType === "system" ? "text-ios-blue" : "text-foreground")}>
                Sistema
              </span>
              <span className="text-caption-1 text-muted-foreground text-center leading-tight">
                Membros, frente, notas e tudo mais
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("singlet")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-ios-lg border-2 ios-transition",
                accountType === "singlet"
                  ? "border-ios-blue bg-ios-blue/10"
                  : "border-border/60 bg-secondary"
              )}
            >
              <User size={22} className={accountType === "singlet" ? "text-ios-blue" : "text-muted-foreground"} />
              <span className={cn("text-subheadline font-semibold", accountType === "singlet" ? "text-ios-blue" : "text-foreground")}>
                Singlet
              </span>
              <span className="text-caption-1 text-muted-foreground text-center leading-tight">
                Conta simples para amizades de sistemas
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{accountType === "singlet" ? "Nome de exibição" : "Nome do sistema"}</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={accountType === "singlet" ? "Seu nome" : "Nome do seu sistema"}
              autoComplete="name"
              required
            />
          </div>

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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
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

          {error && (
            <p className="text-subheadline text-ios-red text-center">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>
      </GlassCard>

      <p className="text-subheadline text-muted-foreground">
        Já tem uma conta?{" "}
        <Link
          href="/login"
          className="text-ios-blue font-semibold hover:opacity-80 ios-transition"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
