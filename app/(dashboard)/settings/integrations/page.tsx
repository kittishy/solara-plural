"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Key,
  RefreshCw,
  Check,
  AlertTriangle,
  Server,
  Download,
  Upload,
} from "lucide-react";
import { LargeTitle } from "@/components/layout/NavBar";
import { GlassCard, GroupedSection } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

type SyncOperation = {
  action: "create" | "update" | "skip" | "unchanged";
  name: string;
  reason: string;
  memberId: string | null;
  changedFields: string[];
};

type SyncResult = {
  remoteSystemId: string | null;
  applied: boolean;
  summary: {
    create: number;
    update: number;
    skip: number;
    unchanged: number;
  };
  operations: SyncOperation[];
  frontSync: {
    status: string;
    remoteFrontCount: number;
    appliedMemberCount: number;
    reason?: string;
  } | null;
};

export default function IntegrationsPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [direction, setDirection] = useState<"import" | "export">("import");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkConnection() {
    setCheckingConnection(true);
    try {
      const res = await fetch("/api/integrations/member-sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "pluralkit", direction: "import" }),
      });
      const json = await res.json();
      if (json.success && json.data?.remoteSystemId) {
        setIsConnected(true);
      }
    } catch {
      // Not connected — leave isConnected as false
    } finally {
      setCheckingConnection(false);
    }
  }

  async function handleTestConnection() {
    setError("");
    setResult(null);
    setSuccessMessage("");

    if (!token.trim()) {
      setError(t("integrations.tokenRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/integrations/member-sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "pluralkit",
          token: token.trim(),
          direction,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error ?? t("integrations.testFailed"));
        return;
      }

      setResult(json.data as SyncResult);
      setIsConnected(true);
    } catch {
      setError(t("integrations.connectFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleApplySync() {
    if (!result) return;

    setError("");
    setSuccessMessage("");
    setApplying(true);

    try {
      const res = await fetch("/api/integrations/member-sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "pluralkit",
          token: token.trim() || undefined,
          apply: true,
          direction,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error ?? t("integrations.applyFailed"));
        return;
      }

      setResult(json.data as SyncResult);
      setSuccessMessage(t("integrations.applySuccess"));
    } catch {
      setError(t("integrations.applyError"));
    } finally {
      setApplying(false);
    }
  }

  function handleDisconnect() {
    setToken("");
    setResult(null);
    setIsConnected(false);
    setSuccessMessage("");
    setError("");
  }

  function getActionLabel(action: string): string {
    switch (action) {
      case "create":
        return t("integrations.actionCreate");
      case "update":
        return t("integrations.actionUpdate");
      case "skip":
        return t("integrations.actionSkip");
      case "unchanged":
        return t("integrations.actionSame");
      default:
        return action;
    }
  }

  function getActionColor(action: string): string {
    switch (action) {
      case "create":
        return "text-green-500";
      case "update":
        return "text-ios-blue";
      case "skip":
        return "text-muted-foreground";
      case "unchanged":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Sticky nav bar */}
      <header className="sticky top-0 z-40 flex items-center h-11 px-4 pt-[var(--safe-top)] box-content glass border-b border-border/40">
        <div className="flex-1 flex items-center">
          <button
            onClick={() => router.push("/settings")}
            className="flex items-center gap-1 text-ios-blue ios-press -ml-1 pr-2 py-1"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span className="text-body">{t("settings.title")}</span>
          </button>
        </div>
      </header>

      {/* Title */}
      <div className="px-4 pt-6 pb-2">
        <LargeTitle className="px-0">{t("integrations.title")}</LargeTitle>
      </div>

      {/* Direction toggle */}
      <div className="px-4 mb-4">
        <div className="flex rounded-ios-md bg-secondary p-0.5">
          <button
            type="button"
            onClick={() => { setDirection("import"); setResult(null); setError(""); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-ios-sm text-subheadline font-medium ios-transition",
              direction === "import" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <Download size={15} />
            {t("integrations.importFromPK")}
          </button>
          <button
            type="button"
            onClick={() => { setDirection("export"); setResult(null); setError(""); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-ios-sm text-subheadline font-medium ios-transition",
              direction === "export" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <Upload size={15} />
            {t("integrations.exportToPK")}
          </button>
        </div>
      </div>

      {/* Connection status */}
      <div className="px-4 mb-6">
        <GroupedSection>
          {checkingConnection ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <RefreshCw
                size={18}
                className="text-muted-foreground animate-spin"
              />
              <span className="text-body text-muted-foreground">
                {t("integrations.checkingConnection")}
              </span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="w-8 h-8 flex items-center justify-center text-green-500 flex-shrink-0">
                <Check size={18} />
              </span>
              <span className="flex-1 text-body text-foreground">
                {t("integrations.connectedToPluralKit")}
              </span>
              <button
                onClick={handleDisconnect}
                className="text-subheadline text-ios-red ios-press"
              >
                {t("integrations.disconnect")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="w-8 h-8 flex items-center justify-center text-muted-foreground flex-shrink-0">
                <Server size={18} />
              </span>
              <span className="flex-1 text-body text-foreground">
                {t("integrations.notConnected")}
              </span>
            </div>
          )}
        </GroupedSection>
      </div>

      {/* Token input */}
      <div className="px-4 mb-6">
        <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {t("integrations.tokenHeader")}
        </p>
        <GroupedSection>
          <div className="px-4 py-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Key size={16} />
              </span>
              <Input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="pk_..."
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground ios-press p-1"
                aria-label={showToken ? t("integrations.hideToken") : t("integrations.showToken")}
              >
                {showToken ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-caption-1 text-muted-foreground mt-2">
              {t("integrations.tokenHelp")}
            </p>
          </div>
        </GroupedSection>
      </div>

      {/* Test / Apply */}
      <div className="px-4 mb-6 flex flex-col gap-3">
        <Button
          onClick={handleTestConnection}
          disabled={loading || !token.trim()}
          className={cn("w-full ios-press", loading && "opacity-70")}
          variant="glass"
        >
          <RefreshCw
            size={18}
            className={cn(loading && "animate-spin")}
          />
          {loading
            ? (direction === "import" ? t("integrations.testing") : t("integrations.previewing"))
            : (direction === "import" ? t("integrations.testConnection") : t("integrations.previewExport"))
          }
        </Button>

        {result && (
          <Button
            onClick={handleApplySync}
            disabled={applying}
            className="w-full ios-press"
          >
            <Check size={18} />
            {applying
              ? t("integrations.applying")
              : (direction === "import" ? t("integrations.applySync") : t("integrations.applyExport"))
            }
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 mb-6">
          <div className="flex items-start gap-3 p-4 rounded-ios-lg bg-ios-red/5 border border-ios-red/20">
            <AlertTriangle
              size={18}
              className="text-ios-red flex-shrink-0 mt-0.5"
            />
            <p className="text-subheadline text-ios-red">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="px-4 mb-6">
          <div className="flex items-start gap-3 p-4 rounded-ios-lg bg-green-500/5 border border-green-500/20">
            <Check
              size={18}
              className="text-green-500 flex-shrink-0 mt-0.5"
            />
            <p className="text-subheadline text-green-600 dark:text-green-400">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Result / Preview */}
      {result && (
        <div className="px-4 mb-10">
          <p className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {result.applied
              ? t("integrations.syncResult")
              : direction === "import"
                ? t("integrations.preview")
                : t("integrations.exportPreview")}
          </p>

          {direction === "import" && result.remoteSystemId && (
            <GlassCard className="mb-4">
              <div className="flex items-center gap-3">
                <Server size={18} className="text-ios-blue flex-shrink-0" />
                <div>
                  <p className="text-body font-semibold text-foreground">
                    {t("integrations.remoteSystem")}
                  </p>
                  <p className="text-caption-1 text-muted-foreground font-mono">
                    {result.remoteSystemId}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Summary counts */}
          <GlassCard className="mb-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-title-2 font-bold text-green-500">
                  {result.summary.create}
                </p>
                <p className="text-caption-1 text-muted-foreground">{t("integrations.actionCreate")}</p>
              </div>
              <div>
                <p className="text-title-2 font-bold text-ios-blue">
                  {result.summary.update}
                </p>
                <p className="text-caption-1 text-muted-foreground">{t("integrations.actionUpdate")}</p>
              </div>
              <div>
                <p className="text-title-2 font-bold text-muted-foreground">
                  {result.summary.skip}
                </p>
                <p className="text-caption-1 text-muted-foreground">{t("integrations.actionSkip")}</p>
              </div>
              <div>
                <p className="text-title-2 font-bold text-muted-foreground">
                  {result.summary.unchanged}
                </p>
                <p className="text-caption-1 text-muted-foreground">{t("integrations.actionSame")}</p>
              </div>
            </div>
          </GlassCard>

          {/* Operations list */}
          {result.operations.length > 0 && (
            <GroupedSection>
              {result.operations.map((op, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <span
                    className={cn(
                      "text-footnote font-semibold uppercase mt-0.5 flex-shrink-0 w-16",
                      getActionColor(op.action)
                    )}
                  >
                    {getActionLabel(op.action)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-foreground truncate">
                      {op.name}
                    </p>
                    <p className="text-caption-1 text-muted-foreground">
                      {op.reason}
                    </p>
                  </div>
                </div>
              ))}
            </GroupedSection>
          )}

          {/* Front sync status */}
          {result.frontSync && (
            <GlassCard className="mt-4">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    result.frontSync.status === "started"
                      ? "bg-green-500/20 text-green-500"
                      : result.frontSync.status === "ended"
                        ? "bg-orange-500/20 text-orange-500"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {result.frontSync.status === "started" ? (
                    <Check size={14} />
                  ) : result.frontSync.status === "ended" ? (
                    <RefreshCw size={14} />
                  ) : (
                    <span className="text-[10px]">&mdash;</span>
                  )}
                </span>
                <div className="flex-1">
                  <p className="text-body font-semibold text-foreground">
                    {t("integrations.frontSync")}
                  </p>
                  <p className="text-caption-1 text-muted-foreground">
                    {t("integrations.statusLabel")} {result.frontSync.status}
                    {result.frontSync.appliedMemberCount > 0 &&
                      ` ${t("integrations.memberCount", { count: result.frontSync.appliedMemberCount })}`}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
