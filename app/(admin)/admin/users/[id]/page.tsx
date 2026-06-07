"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { localizePathname } from "@/lib/i18n";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, ShieldOff, Ban, KeyRound, Trash2, Copy, Check } from "lucide-react";

interface AccountDetail {
  id: string;
  name: string;
  email: string;
  description: string | null;
  accountType: string;
  isAdmin: number;
  suspendedAt: string | null;
  suspendedReason: string | null;
  deletionScheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  counts: { members: number; notes: number; journal: number; fronts: number };
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLanguage();
  const id = params.id;

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${id}`, { credentials: "same-origin" });
    const json = await res.json();
    if (json.success) setAccount(json.data);
    else setError(json.error ?? "Erro ao carregar");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) setError(json.error ?? "Falha na ação");
      else await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspend() {
    if (!account) return;
    if (account.suspendedAt) {
      await patch({ suspended: false });
    } else {
      const reason = window.prompt("Motivo da suspensão (opcional):", "");
      if (reason === null) return;
      await patch({ suspended: true, reason });
    }
  }

  async function handleResetPassword() {
    setBusy(true);
    setError("");
    setResetLink(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.success) setError(json.error ?? "Falha ao gerar link");
      else setResetLink(json.data.resetPath);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!account) return;
    if (!window.confirm(`Deletar permanentemente a conta de ${account.name}? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "same-origin" });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Falha ao deletar");
        setBusy(false);
      } else {
        router.push(localizePathname("/admin/users", language));
      }
    } catch {
      setBusy(false);
    }
  }

  function copyResetLink() {
    if (!resetLink) return;
    const full = `${window.location.origin}${localizePathname(resetLink.split("?")[0], language)}?${resetLink.split("?")[1]}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <Link
        href={localizePathname("/admin/users", language)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Voltar para contas
      </Link>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : !account ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{error || "Conta não encontrada."}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{account.name}</h1>
            {account.isAdmin === 1 && (
              <Badge variant="default" className="gap-1">
                <ShieldCheck size={12} /> admin
              </Badge>
            )}
            {account.suspendedAt && (
              <Badge variant="destructive" className="gap-1">
                <Ban size={12} /> suspensa
              </Badge>
            )}
            <Badge variant="outline">{account.accountType === "singlet" ? "Singlet" : "Sistema"}</Badge>
          </div>

          {error && (
            <div className="rounded-xl border border-ios-red/40 bg-ios-red/10 px-4 py-2 text-sm text-ios-red">
              {error}
            </div>
          )}

          <GlassCard className="space-y-2 text-sm">
            <Row label="E-mail" value={account.email} />
            <Row label="ID" value={account.id} mono />
            <Row label="Criada em" value={fmt(account.createdAt)} />
            <Row label="Atualizada em" value={fmt(account.updatedAt)} />
            {account.suspendedAt && <Row label="Suspensa em" value={fmt(account.suspendedAt)} />}
            {account.suspendedReason && <Row label="Motivo" value={account.suspendedReason} />}
            {account.deletionScheduledFor && (
              <Row label="Exclusão agendada" value={fmt(account.deletionScheduledFor)} />
            )}
          </GlassCard>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Count label="Membros" value={account.counts.members} />
            <Count label="Anotações" value={account.counts.notes} />
            <Count label="Diário" value={account.counts.journal} />
            <Count label="Fronts" value={account.counts.fronts} />
          </section>

          {resetLink && (
            <GlassCard className="space-y-2 border border-ios-blue/40 bg-ios-blue/5">
              <p className="text-sm font-medium">Link de redefinição de senha (válido por 30 min):</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{resetLink}</code>
                <Button size="sm" variant="secondary" onClick={copyResetLink}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Entregue este link ao usuário com segurança. Ele aparece apenas uma vez.
              </p>
            </GlassCard>
          )}

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Ações</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy} onClick={handleSuspend}>
                <Ban size={16} /> {account.suspendedAt ? "Remover suspensão" : "Suspender"}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => patch({ isAdmin: account.isAdmin !== 1 })}
              >
                {account.isAdmin === 1 ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                {account.isAdmin === 1 ? "Remover admin" : "Tornar admin"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={handleResetPassword}>
                <KeyRound size={16} /> Redefinir senha
              </Button>
              <Button variant="destructive" disabled={busy} onClick={handleDelete}>
                <Trash2 size={16} /> Deletar conta
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-right"}>{value}</span>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <GlassCard className="flex flex-col items-center py-3">
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </GlassCard>
  );
}
