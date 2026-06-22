"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wrench, Megaphone, Trash2, Send } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  level: string;
  active: number;
  pushedAt: string | null;
  createdAt: string;
}

const LEVELS = [
  { key: "info", label: "Info" },
  { key: "warning", label: "Warning" },
  { key: "critical", label: "Critical" },
];

export default function AdminMaintenancePage() {
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintMessage, setMaintMessage] = useState("");
  const [savingMaint, setSavingMaint] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [push, setPush] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [sRes, aRes] = await Promise.all([
      fetch("/api/admin/settings", { credentials: "same-origin" }),
      fetch("/api/admin/announcements", { credentials: "same-origin" }),
    ]);
    const sJson = await sRes.json();
    const aJson = await aRes.json();
    if (sJson.success) {
      setMaintEnabled(sJson.data.maintenance.enabled);
      setMaintMessage(sJson.data.maintenance.message ?? "");
    }
    if (aJson.success) setAnnouncements(aJson.data.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveMaintenance(nextEnabled: boolean) {
    setSavingMaint(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceEnabled: nextEnabled, maintenanceMessage: maintMessage }),
      });
      const json = await res.json();
      if (json.success) {
        setMaintEnabled(json.data.maintenance.enabled);
        setMaintMessage(json.data.maintenance.message ?? "");
      } else {
        setError(json.error ?? "Failed to save");
      }
    } finally {
      setSavingMaint(false);
    }
  }

  async function postAnnouncement() {
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required");
      return;
    }
    if (push && !window.confirm("Send push to ALL active users?")) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, level, push }),
      });
      const json = await res.json();
      if (json.success) {
        setTitle("");
        setBody("");
        setLevel("info");
        setPush(false);
        await load();
      } else {
        setError(json.error ?? "Failed to publish");
      }
    } finally {
      setPosting(false);
    }
  }

  async function toggleAnnouncement(a: Announcement) {
    setError("");
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: a.active !== 1 }),
      });
      if (!res.ok) {
        setError("Failed to update announcement");
        return;
      }
      await load();
    } catch {
      setError("Failed to update announcement");
    }
  }

  async function deleteAnnouncement(a: Announcement) {
    if (!window.confirm("Delete this announcement?")) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) {
        setError("Failed to delete announcement");
        return;
      }
      await load();
    } catch {
      setError("Failed to delete announcement");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Maintenance & Announcements</h1>
        <p className="text-sm text-muted-foreground">Control the main app and reach your users</p>
      </div>

      {error && (
        <div className="rounded-xl border border-ios-red/40 bg-ios-red/10 px-4 py-2 text-sm text-ios-red">
          {error}
        </div>
      )}

      {/* Maintenance mode */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Wrench size={18} /> Maintenance mode
        </h2>
        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {maintEnabled ? "Active" : "Disabled"}{" "}
                {maintEnabled && <Badge variant="destructive">app blocked</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">
                When active, only administrators can access the main app.
              </p>
            </div>
            <Button
              variant={maintEnabled ? "destructive" : "default"}
              disabled={savingMaint}
              onClick={() => saveMaintenance(!maintEnabled)}
            >
              {maintEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Message shown to users</label>
            <Input
              value={maintMessage}
              onChange={(e) => setMaintMessage(e.target.value)}
              placeholder="e.g. We'll be back in a few minutes 💛"
              onBlur={() => saveMaintenance(maintEnabled)}
            />
          </div>
        </GlassCard>
      </section>

      {/* New announcement */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Megaphone size={18} /> New announcement
        </h2>
        <GlassCard className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message"
            rows={3}
            className="w-full rounded-ios border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ios-blue"
          />
          <div className="flex flex-wrap items-center gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLevel(l.key)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  level === l.key ? "bg-ios-blue text-white" : "bg-muted/60 text-foreground/80"
                }`}
              >
                {l.label}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} />
              Send push notification to everyone
            </label>
          </div>
          <Button disabled={posting} onClick={postAnnouncement}>
            <Send size={16} /> {posting ? "Publishing..." : "Publish announcement"}
          </Button>
        </GlassCard>
      </section>

      {/* Announcement list */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Published announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements published yet.</p>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <GlassCard key={a.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.title}</span>
                  <Badge variant={a.level === "critical" ? "destructive" : a.level === "warning" ? "outline" : "secondary"}>
                    {a.level}
                  </Badge>
                  {a.active === 1 ? (
                    <Badge variant="success">active</Badge>
                  ) : (
                    <Badge variant="outline">inactive</Badge>
                  )}
                  {a.pushedAt && <Badge variant="default">push sent</Badge>}
                  <div className="ml-auto flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleAnnouncement(a)}>
                      {a.active === 1 ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteAnnouncement(a)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{a.body}</p>
                <p className="text-xs text-muted-foreground/70">
                  {new Date(a.createdAt).toLocaleString("en-US")}
                </p>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
