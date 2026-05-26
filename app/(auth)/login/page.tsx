"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";
import { LanguageSelector } from "@/components/language/LanguageSelector";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function LoginPage() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", {
        email: data.get("email"),
        password: data.get("password"),
        redirect: false,
      });
      if (result?.error) {
        setError(t("auth.login.invalid"));
      } else {
        window.location.href = "/";
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      {/* Language selector top-right */}
      <div className="w-full flex justify-end">
        <LanguageSelector />
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-ios-xl bg-ios-blue flex items-center justify-center shadow-ios-md">
          <span className="text-4xl font-bold text-white select-none">S</span>
        </div>
        <div className="text-center">
          <h1 className="text-title-1 text-foreground">Solara</h1>
          <p className="text-subheadline text-muted-foreground mt-0.5">
            {t("auth.login.tagline")}
          </p>
        </div>
      </div>

      {/* Form */}
      <GlassCard className="w-full" padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("auth.login.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("auth.forgot.emailPlaceholder")}
              autoComplete="email"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("auth.login.password")}</Label>
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
              {t("auth.login.forgotPassword")}
            </Link>
          </div>

          {error && (
            <p className="text-subheadline text-ios-red text-center">{error}</p>
          )}

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? t("auth.login.signingIn") : t("auth.login.signIn")}
          </Button>
        </form>
      </GlassCard>

      <p className="text-subheadline text-muted-foreground">
        {t("auth.login.newHere")}{" "}
        <Link
          href="/register"
          className="text-ios-blue font-semibold hover:opacity-80 ios-transition"
        >
          {t("auth.register.create")}
        </Link>
      </p>
    </div>
  );
}
