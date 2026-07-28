"use client";

import { useState } from "react";
import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
import { useLocalizedRouter } from "@/components/navigation/useLocalizedRouter";
import { Eye, EyeOff, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/glass/GlassCard";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useLocalizedRouter();
  const { t } = useLanguage();
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
        setError(json.error ?? t("auth.register.genericError"));
        return;
      }

      const { signIn } = await import("next-auth/react");
      await signIn("credentials", {
        email: data.get("email"),
        password: data.get("password"),
        callbackUrl: "/",
      });
    } catch {
      setError(t("auth.register.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-title-1 text-foreground">{t("auth.register.title")}</h1>
        <p className="text-subheadline text-muted-foreground mt-1">
          {t("auth.register.tagline")}
        </p>
      </div>

      <GlassCard className="w-full" padding="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                {t("auth.register.pluralSystem")}
              </span>
              <span className="text-caption-1 text-muted-foreground text-center leading-tight">
                {t("auth.register.pluralSystemHelp")}
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
                {t("auth.register.singlet")}
              </span>
              <span className="text-caption-1 text-muted-foreground text-center leading-tight">
                {t("auth.register.singletHelp")}
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              {accountType === "singlet" ? t("auth.register.displayName") : t("auth.register.systemName")}
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={
                accountType === "singlet"
                  ? t("auth.register.displayNamePlaceholder")
                  : t("auth.register.systemNamePlaceholder")
              }
              autoComplete="name"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("auth.register.email")}</Label>
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
            <Label htmlFor="password">{t("auth.register.password")}</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.register.passwordPlaceholder")}
                autoComplete="new-password"
                minLength={8}
                required
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground ios-transition"
                aria-label={t(showPassword ? "auth.hidePassword" : "auth.showPassword")}
                aria-pressed={showPassword}
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
            {loading ? t("auth.register.creating") : t("auth.register.create")}
          </Button>
        </form>
      </GlassCard>

      <p className="text-subheadline text-muted-foreground">
        {t("auth.register.alreadyHave")}{" "}
        <Link
          href="/login"
          className="text-ios-blue font-semibold hover:opacity-80 ios-transition"
        >
          {t("auth.register.signIn")}
        </Link>
      </p>
    </div>
  );
}
