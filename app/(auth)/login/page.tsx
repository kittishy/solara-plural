"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const { signIn } = await import("next-auth/react");
      await signIn("credentials", {
        email: data.get("email"),
        password: data.get("password"),
        callbackUrl: "/",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-ios-xl bg-ios-blue flex items-center justify-center shadow-ios-md">
          <span className="text-4xl font-bold text-white select-none">S</span>
        </div>
        <div className="text-center">
          <h1 className="text-title-1 text-foreground">Solara</h1>
          <p className="text-subheadline text-muted-foreground mt-0.5">
            Para sistemas plurais
          </p>
        </div>
      </div>

      {/* Form */}
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
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

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-subheadline text-ios-blue hover:opacity-80 ios-transition"
            >
              Esqueci a senha
            </Link>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </GlassCard>

      <p className="text-subheadline text-muted-foreground">
        Não tem uma conta?{" "}
        <Link
          href="/register"
          className="text-ios-blue font-semibold hover:opacity-80 ios-transition"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
