"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { localizePathname } from "@/lib/i18n";
import { GlassCard } from "@/components/glass/GlassCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, Ban, ChevronRight } from "lucide-react";

interface AccountRow {
  id: string;
  name: string;
  email: string;
  accountType: string;
  isAdmin: number;
  suspendedAt: string | null;
  deletionScheduledFor: string | null;
  createdAt: string;
  memberCount: number;
}

const FILTERS = [
  { key: "", label: "Todas" },
  { key: "suspended", label: "Suspensas" },
  { key: "admin", label: "Admins" },
  { key: "singlet", label: "Singlets" },
];

export default function AdminUsersPage() {
  const { language } = useLanguage();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filter) params.set("filter", filter);
    const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "same-origin" });
    const json = await res.json();
    if (json.success) {
      setRows(json.data.data);
      setTotal(json.data.total);
    }
    setLoading(false);
  }, [q, filter]);

  // Debounce search input; refetch immediately on filter change.
  useEffect(() => {
    const id = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Contas</h1>
        <p className="text-sm text-muted-foreground">{total} contas no total</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                filter === f.key ? "bg-ios-blue text-white" : "bg-muted/60 text-foreground/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Link key={r.id} href={localizePathname(`/admin/users/${r.id}`, language)}>
              <GlassCard className="flex items-center gap-3 transition-colors hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.name}</span>
                    {r.isAdmin === 1 && (
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck size={12} /> admin
                      </Badge>
                    )}
                    {r.suspendedAt && (
                      <Badge variant="destructive" className="gap-1">
                        <Ban size={12} /> suspensa
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  <div>{r.accountType === "singlet" ? "Singlet" : "Sistema"}</div>
                  <div>{r.memberCount} membros</div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
