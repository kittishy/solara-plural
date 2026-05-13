'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDateLong } from '@/lib/client/format';

type Member = { id: string; name: string; color: string | null; avatarUrl: string | null };

type Partner = {
  id: string;
  name: string;
  accountType: string;
  avatarMode: string;
  avatarEmoji: string;
  avatarUrl: string | null;
};

type Details = {
  relationshipLabel: string | null;
  partneredSince: Date | string | null;
  anniversaryDate: Date | string | null;
  howWeMet: string | null;
  nicknameForPartner: string | null;
  myNickname: string | null;
  checkinIntervalDays: number | null;
  lastCheckinAt: Date | string | null;
};

type Note = {
  id: string;
  authorSystemId: string;
  content: string;
  mood: string | null;
  createdAt: Date | string;
};

type Pairing = {
  id: string;
  memberAId: string;
  memberBId: string;
  label: string | null;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  occurredOn: Date | string;
};

type BucketItem = {
  id: string;
  title: string;
  note: string | null;
  category: string | null;
  completedAt: Date | string | null;
};

interface Props {
  partnershipId: string;
  partner: Partner;
  details: Details;
  ownMembers: Member[];
  partnerMembers: Member[];
  initialNotes: Note[];
  initialPairings: Pairing[];
  initialMilestones: Milestone[];
  initialBucket: BucketItem[];
}

type Tab = 'overview' | 'diary' | 'pairings' | 'milestones' | 'bucket';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'diary', label: 'Diary' },
  { id: 'pairings', label: 'Alter pairings' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'bucket', label: 'Bucket list' },
];

function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatDate(value: Date | string | null | undefined): string {
  return formatDateLong(value);
}

export default function PartnershipDetailClient(props: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-center justify-between gap-3">
        <Link href="/partners" className="btn-ghost min-h-[40px] border border-border/60 px-3 text-sm">
          ← Partners
        </Link>
        <h1 className="text-lg font-bold text-text truncate">
          {props.details.relationshipLabel ? `${props.details.relationshipLabel} • ` : ''}
          {props.partner.name}
        </h1>
        <div className="w-[88px]" />
      </header>

      <nav role="tablist" className="flex flex-wrap gap-1 rounded-xl border border-border/50 bg-surface/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-fit min-h-[40px] rounded-lg px-3 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primary/15 text-primary-glow' : 'text-muted hover:bg-surface-alt hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <OverviewTab {...props} />}
      {tab === 'diary' && <DiaryTab partnershipId={props.partnershipId} initial={props.initialNotes} />}
      {tab === 'pairings' && (
        <PairingsTab
          partnershipId={props.partnershipId}
          ownMembers={props.ownMembers}
          partnerMembers={props.partnerMembers}
          initial={props.initialPairings}
        />
      )}
      {tab === 'milestones' && <MilestonesTab partnershipId={props.partnershipId} initial={props.initialMilestones} />}
      {tab === 'bucket' && <BucketTab partnershipId={props.partnershipId} initial={props.initialBucket} />}
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewTab({ partnershipId, details, partner }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    relationshipLabel: details.relationshipLabel ?? '',
    partneredSince: toDateInput(details.partneredSince),
    anniversaryDate: toDateInput(details.anniversaryDate),
    howWeMet: details.howWeMet ?? '',
    nicknameForPartner: details.nicknameForPartner ?? '',
    checkinIntervalDays: details.checkinIntervalDays ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/partners/${partnershipId}/details`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        relationshipLabel: form.relationshipLabel || null,
        partneredSince: form.partneredSince || null,
        anniversaryDate: form.anniversaryDate || null,
        howWeMet: form.howWeMet || null,
        nicknameForPartner: form.nicknameForPartner || null,
        checkinIntervalDays: Number(form.checkinIntervalDays) || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage('Could not save. Try again?');
      return;
    }
    setMessage('Saved.');
    router.refresh();
  }

  async function recordCheckin() {
    const res = await fetch(`/api/partners/${partnershipId}/details`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordCheckin: true }),
    });
    if (res.ok) {
      setMessage('Check-in recorded.');
      router.refresh();
    }
  }

  const nextCheckin = (() => {
    if (!details.checkinIntervalDays || !details.lastCheckinAt) return null;
    const last = new Date(details.lastCheckinAt).getTime();
    return new Date(last + details.checkinIntervalDays * 86400000);
  })();

  return (
    <section className="card space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Relationship label">
          <input
            type="text"
            value={form.relationshipLabel}
            onChange={(e) => setForm({ ...form, relationshipLabel: e.target.value })}
            placeholder="partners, datemates, QPR…"
            maxLength={60}
            className="input min-h-[44px] w-full px-3"
          />
        </Field>
        <Field label={`Nickname you call ${partner.name}`}>
          <input
            type="text"
            value={form.nicknameForPartner}
            onChange={(e) => setForm({ ...form, nicknameForPartner: e.target.value })}
            maxLength={60}
            className="input min-h-[44px] w-full px-3"
          />
        </Field>
        <Field label="Together since">
          <input
            type="date"
            value={form.partneredSince}
            onChange={(e) => setForm({ ...form, partneredSince: e.target.value })}
            className="input min-h-[44px] w-full px-3"
          />
        </Field>
        <Field label="Anniversary">
          <input
            type="date"
            value={form.anniversaryDate}
            onChange={(e) => setForm({ ...form, anniversaryDate: e.target.value })}
            className="input min-h-[44px] w-full px-3"
          />
        </Field>
        <Field label="Check-in reminder (days)">
          <input
            type="number"
            min={0}
            value={form.checkinIntervalDays}
            onChange={(e) => setForm({ ...form, checkinIntervalDays: Number(e.target.value) })}
            placeholder="0 = off"
            className="input min-h-[44px] w-full px-3"
          />
        </Field>
        <Field label="Last check-in">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-muted">{formatDate(details.lastCheckinAt)}</span>
            <button type="button" onClick={recordCheckin} className="btn-ghost min-h-[36px] border border-border/60 px-3 text-xs">
              Mark today
            </button>
          </div>
          {nextCheckin && (
            <p className="mt-1 text-xs text-muted">Next: {formatDate(nextCheckin)}</p>
          )}
        </Field>
      </div>

      <Field label="How we met">
        <textarea
          rows={3}
          value={form.howWeMet}
          onChange={(e) => setForm({ ...form, howWeMet: e.target.value })}
          maxLength={500}
          className="input w-full px-3 py-2"
          placeholder="Where did your stories cross?"
        />
      </Field>

      <div className="flex items-center justify-between">
        <p className={`text-sm ${message?.includes('not') ? 'text-error' : 'text-success'}`}>{message}</p>
        <button type="button" onClick={save} disabled={saving} className="btn-primary min-h-[44px] px-5">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

// ─── Diary ───────────────────────────────────────────────────────────────────

function DiaryTab({ partnershipId, initial }: { partnershipId: string; initial: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initial);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!content.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/partners/${partnershipId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, mood: mood || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotes([data.data, ...notes]);
      setContent('');
      setMood('');
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this entry?')) return;
    const res = await fetch(`/api/partners/${partnershipId}/notes/${id}`, { method: 'DELETE' });
    if (res.ok) setNotes(notes.filter((n) => n.id !== id));
  }

  return (
    <section className="space-y-4">
      <div className="card space-y-3 p-4">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write something the two of you will want to remember…"
          className="input w-full px-3 py-2"
        />
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="Mood (optional)"
            maxLength={40}
            className="input min-h-[40px] flex-1 px-3"
          />
          <button type="button" onClick={add} disabled={busy || !content.trim()} className="btn-primary min-h-[40px] px-4">
            {busy ? 'Saving…' : 'Add entry'}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-center text-sm text-muted">No diary entries yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="card space-y-2 p-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{formatDate(n.createdAt)}{n.mood ? ` • ${n.mood}` : ''}</span>
                <button type="button" onClick={() => remove(n.id)} className="text-error/80 hover:text-error">
                  Delete
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-text">{n.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Pairings ────────────────────────────────────────────────────────────────

function PairingsTab({
  partnershipId,
  ownMembers,
  partnerMembers,
  initial,
}: {
  partnershipId: string;
  ownMembers: Member[];
  partnerMembers: Member[];
  initial: Pairing[];
}) {
  const [pairings, setPairings] = useState<Pairing[]>(initial);
  const [memberAId, setMemberAId] = useState(ownMembers[0]?.id ?? '');
  const [memberBId, setMemberBId] = useState(partnerMembers[0]?.id ?? '');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const allMembers = [...ownMembers, ...partnerMembers];
  const nameOf = (id: string) => allMembers.find((m) => m.id === id)?.name ?? id;

  async function add() {
    if (!memberAId || !memberBId) return;
    setBusy(true);
    const res = await fetch(`/api/partners/${partnershipId}/pairings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberAId, memberBId, label: label || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setPairings([data.data, ...pairings]);
      setLabel('');
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm('Remove this pairing?')) return;
    const res = await fetch(`/api/partners/${partnershipId}/pairings/${id}`, { method: 'DELETE' });
    if (res.ok) setPairings(pairings.filter((p) => p.id !== id));
  }

  if (ownMembers.length === 0 || partnerMembers.length === 0) {
    return (
      <p className="card p-5 text-center text-sm text-muted">
        Alter pairings need both sides to have members. {ownMembers.length === 0 ? 'You have no members yet.' : `${partnerMembers.length === 0 ? 'Your partner has no shared members yet.' : ''}`}
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="card space-y-3 p-4">
        <p className="text-sm text-muted">Connect specific alters in your sides of the relationship.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={memberAId} onChange={(e) => setMemberAId(e.target.value)} className="input min-h-[44px] px-3">
            {ownMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <select value={memberBId} onChange={(e) => setMemberBId(e.target.value)} className="input min-h-[44px] px-3">
            {partnerMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. soulmates, datemates)"
            maxLength={60}
            className="input min-h-[40px] flex-1 px-3"
          />
          <button type="button" onClick={add} disabled={busy} className="btn-primary min-h-[40px] px-4">
            {busy ? 'Saving…' : 'Add pair'}
          </button>
        </div>
      </div>

      {pairings.length === 0 ? (
        <p className="text-center text-sm text-muted">No pairings yet.</p>
      ) : (
        <ul className="space-y-2">
          {pairings.map((p) => (
            <li key={p.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-text">
                  {nameOf(p.memberAId)} <span className="text-muted">↔</span> {nameOf(p.memberBId)}
                </p>
                {p.label && <p className="text-xs text-muted">{p.label}</p>}
              </div>
              <button type="button" onClick={() => remove(p.id)} className="text-sm text-error/80 hover:text-error">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Milestones ──────────────────────────────────────────────────────────────

function MilestonesTab({ partnershipId, initial }: { partnershipId: string; initial: Milestone[] }) {
  const [items, setItems] = useState<Milestone[]>(initial);
  const [title, setTitle] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim() || !occurredOn) return;
    setBusy(true);
    const res = await fetch(`/api/partners/${partnershipId}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, occurredOn, description: description || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems([data.data, ...items].sort((a, b) => +new Date(b.occurredOn) - +new Date(a.occurredOn)));
      setTitle(''); setOccurredOn(''); setDescription('');
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this milestone?')) return;
    const res = await fetch(`/api/partners/${partnershipId}/milestones/${id}`, { method: 'DELETE' });
    if (res.ok) setItems(items.filter((m) => m.id !== id));
  }

  return (
    <section className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Milestone title"
            maxLength={120}
            className="input min-h-[40px] px-3"
          />
          <input
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            className="input min-h-[40px] px-3"
          />
        </div>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Anything else to remember?"
          className="input w-full px-3 py-2"
        />
        <div className="flex justify-end">
          <button type="button" onClick={add} disabled={busy || !title.trim() || !occurredOn} className="btn-primary min-h-[40px] px-4">
            {busy ? 'Saving…' : 'Add milestone'}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-sm text-muted">No milestones yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="card space-y-1 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">{m.title}</p>
                  <p className="text-xs text-muted">{formatDate(m.occurredOn)}</p>
                </div>
                <button type="button" onClick={() => remove(m.id)} className="text-sm text-error/80 hover:text-error">
                  Delete
                </button>
              </div>
              {m.description && <p className="whitespace-pre-wrap text-sm text-muted">{m.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Bucket list ─────────────────────────────────────────────────────────────

function BucketTab({ partnershipId, initial }: { partnershipId: string; initial: BucketItem[] }) {
  const [items, setItems] = useState<BucketItem[]>(initial);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/partners/${partnershipId}/bucket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category: category || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems([data.data, ...items]);
      setTitle(''); setCategory('');
    }
    setBusy(false);
  }

  async function toggle(item: BucketItem) {
    const res = await fetch(`/api/partners/${partnershipId}/bucket/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !item.completedAt }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems(items.map((i) => (i.id === item.id ? data.data : i)));
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this item?')) return;
    const res = await fetch(`/api/partners/${partnershipId}/bucket/${id}`, { method: 'DELETE' });
    if (res.ok) setItems(items.filter((i) => i.id !== id));
  }

  const pending = items.filter((i) => !i.completedAt);
  const done = items.filter((i) => i.completedAt);

  return (
    <section className="space-y-4">
      <div className="card space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-[2fr,1fr,auto]">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Something to do together"
            maxLength={120}
            className="input min-h-[40px] px-3"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            maxLength={40}
            className="input min-h-[40px] px-3"
          />
          <button type="button" onClick={add} disabled={busy || !title.trim()} className="btn-primary min-h-[40px] px-4">
            {busy ? '…' : 'Add'}
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((i) => (
            <BucketRow key={i.id} item={i} onToggle={() => toggle(i)} onRemove={() => remove(i.id)} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted">
            Completed ({done.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {done.map((i) => (
              <BucketRow key={i.id} item={i} onToggle={() => toggle(i)} onRemove={() => remove(i.id)} />
            ))}
          </ul>
        </details>
      )}

      {items.length === 0 && (
        <p className="text-center text-sm text-muted">No bucket-list items yet.</p>
      )}
    </section>
  );
}

function BucketRow({ item, onToggle, onRemove }: { item: BucketItem; onToggle: () => void; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface/60 p-3">
      <input
        type="checkbox"
        checked={!!item.completedAt}
        onChange={onToggle}
        className="h-4 w-4 cursor-pointer accent-primary"
      />
      <div className="flex-1">
        <p className={`text-sm ${item.completedAt ? 'text-muted line-through' : 'text-text'}`}>{item.title}</p>
        {item.category && <p className="text-xs text-muted">{item.category}</p>}
      </div>
      <button type="button" onClick={onRemove} className="text-sm text-error/80 hover:text-error">
        ✕
      </button>
    </li>
  );
}
