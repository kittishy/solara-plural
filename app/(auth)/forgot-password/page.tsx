"use client";

import { useState } from "react";
import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
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
        setError(json.error ?? t("auth.forgot.sendFailed"));
        return;
      }

      setSent(true);
    } catch {
      setError(t("auth.forgot.sendFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-title-1 text-foreground">{t("auth.forgot.title")}</h1>
        <p className="text-subheadline text-muted-foreground mt-1">
          {t("auth.forgot.helper")}
        </p>
      </div>

      {sent ? (
        <GlassCard className="w-full text-center" padding="lg">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-ios-green/12 flex items-center justify-center">
              <span className="text-3xl">✉️</span>
            </div>
            <p className="text-body text-foreground">
              {t("auth.forgot.sent")}
            </p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">
                {t("auth.forgot.backToLogin")}
              </Link>
            </Button>
          </div>
        </GlassCard>
      ) : (
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

            {error && (
              <p className="text-subheadline text-ios-red text-center">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.forgot.sending") : t("auth.forgot.send")}
            </Button>
          </form>
        </GlassCard>
      )}

      <Link
        href="/login"
        className="flex items-center gap-1 text-ios-blue text-subheadline hover:opacity-80 ios-transition"
      >
        <ArrowLeft size={16} />
        {t("auth.forgot.backToLogin")}
      </Link>
    </div>
  );
}
