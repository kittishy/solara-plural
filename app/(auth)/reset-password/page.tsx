"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n";

const ERROR_KEY_MAP: Record<string, TranslationKey> = {
  RATE_LIMITED: "auth.reset.rateLimited",
  INVALID_TOKEN: "auth.reset.invalid",
  WEAK_PASSWORD: "auth.register.passwordShort",
};

function ResetPasswordForm() {
  const { t } = useLanguage();
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
      setError(t("auth.reset.mismatch"));
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
        const errorKey = ERROR_KEY_MAP[json?.code as string];
        setError(json?.error ?? (errorKey ? t(errorKey) : t("auth.reset.invalid")));
        return;
      }

      setDone(true);
    } catch {
      setError(t("auth.reset.invalid"));
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
            {t("auth.reset.success")}
          </p>
          <Button asChild size="sm">
            <Link href="/login">{t("auth.reset.signIn")}</Link>
          </Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="w-full" padding="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t("auth.reset.newPassword")}</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.register.passwordPlaceholder")}
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
          <Label htmlFor="confirm">{t("auth.register.confirmPassword")}</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            placeholder={t("auth.register.confirmPlaceholder")}
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
          {loading ? t("auth.reset.saving") : t("auth.reset.save")}
        </Button>
      </form>
    </GlassCard>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-title-1 text-foreground">{t("auth.reset.title")}</h1>
        <p className="text-subheadline text-muted-foreground mt-1">
          {t("auth.reset.helper")}
        </p>
      </div>

      <Suspense
        fallback={
          <GlassCard className="w-full" padding="lg">
            <div className="h-40 flex items-center justify-center text-muted-foreground text-subheadline">
              {t("common.loading")}
            </div>
          </GlassCard>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
