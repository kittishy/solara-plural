"use client";

import { useRef, useState } from "react";
import { LocalizedLink as Link } from "@/components/navigation/LocalizedLink";
import { ArrowLeft, Upload, Check, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function ImportSettingsPage() {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setResult(null);
    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        setResult({ success: false, message: t("settings.invalidJson") });
        return;
      }
      const res = await fetch("/api/import", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const respJson = await res.json();
      if (!res.ok || !respJson.success) {
        setResult({
          success: false,
          message: respJson.error ?? t("settings.importError"),
        });
        return;
      }
      setResult({
        success: true,
        message: t("settings.importSuccess"),
      });
    } catch {
      setResult({ success: false, message: t("settings.fileReadError") });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="animate-fade-in pb-8">
      <div className="sticky top-0 z-40 glass border-b border-border/40 pt-[var(--safe-top)]">
        <div className="flex items-center px-4 h-11">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("settings.title")}</span>
          </Link>
          <h1 className="text-headline font-semibold absolute left-1/2 -translate-x-1/2">
            {t("settings.importTitle")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        <GlassCard padding="lg">
          <p className="text-body text-foreground mb-3">
            {t("settings.importDesc")}
          </p>
          <p className="text-subheadline text-muted-foreground">
            {t("settings.importMerge")}
          </p>
        </GlassCard>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />

        <Button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          <Upload size={16} />
          {uploading ? t("settings.importing") : t("settings.chooseJsonFile")}
        </Button>

        {result && (
          <GlassCard
            padding="md"
            className={result.success ? "bg-ios-green/5" : "bg-ios-red/5"}
          >
            <div className="flex items-center gap-3">
              {result.success ? (
                <Check size={20} className="text-ios-green flex-shrink-0" />
              ) : (
                <AlertCircle size={20} className="text-ios-red flex-shrink-0" />
              )}
              <p
                className={`text-body ${result.success ? "text-ios-green" : "text-ios-red"}`}
              >
                {result.message}
              </p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
