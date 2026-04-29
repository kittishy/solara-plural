'use client';

import { useState, useEffect } from 'react';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { revalidateMembersAndFront } from '@/lib/swr';
import AvatarUpload from '@/components/members/AvatarUpload';

const MEMBER_COLORS = [
  '#a78bfa', '#f9a8d4', '#93c5fd', '#86efac', '#fcd34d',
  '#fb923c', '#f87171', '#67e8f9', '#d8b4fe', '#a5b4fc',
  '#fdba74', '#6ee7b7',
];

export default function EditMemberPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [form, setForm] = useState({
    name: '', pronouns: '', description: '', role: '',
    color: MEMBER_COLORS[0], tags: '', avatarUrl: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/members/${id}`);
        if (!res.ok) {
          setFetchError('Could not load member data. Please go back and try again.');
          setFetching(false);
          return;
        }
        // API response shape: { success: true, data: { ...member } }
        const json = await res.json();
        const m = json.data;
        setForm({
          name: m.name ?? '',
          pronouns: m.pronouns ?? '',
          description: m.description ?? '',
          role: m.role ?? '',
          color: m.color ?? MEMBER_COLORS[0],
          tags: Array.isArray(m.tags) ? m.tags.join(', ') : '',
          avatarUrl: m.avatarUrl ?? '',
        });
      } catch {
        setFetchError('Network error. Please check your connection and try again.');
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [id]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

    const res = await fetch(`/api/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tags,
        avatarUrl: form.avatarUrl || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Something went wrong. Try again?');
      return;
    }

    revalidateMembersAndFront();
    router.push(`/members/${id}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm('Remove this member? This cannot be undone.')) return;
    setDeleteError('');
    const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
    if (res.ok) {
      revalidateMembersAndFront();
      router.push('/members');
      router.refresh();
    } else {
      try {
        const data = await res.json();
        setDeleteError(data.error ?? 'Could not delete member. Please try again.');
      } catch {
        setDeleteError('Could not delete member. Please try again.');
      }
    }
  }

  if (fetching) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="card p-8 text-center text-muted">Loading member…</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="card p-8 text-center">
          <p className="text-error text-sm mb-4">{fetchError}</p>
          <Link href="/members" className="btn-ghost">← Back to members</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/members/${id}`} className="btn-ghost">← Back</Link>
        <h1 className="text-2xl font-bold text-text">Edit member</h1>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar upload */}
          <div className="flex flex-col items-center py-2">
            <AvatarUpload
              currentUrl={form.avatarUrl || null}
              memberColor={form.color}
              memberName={form.name || 'Member'}
              onUpload={(url) => set('avatarUrl', url)}
            />
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="label">Name *</label>
            <input id="name" className="input" placeholder="Their name" required
              value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          {/* Pronouns */}
          <div>
            <label htmlFor="pronouns" className="label">Pronouns</label>
            <input id="pronouns" className="input" placeholder="e.g. she/her, they/them"
              value={form.pronouns} onChange={(e) => set('pronouns', e.target.value)} />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="label">Role</label>
            <input id="role" className="input" placeholder="e.g. host, protector, little"
              value={form.role} onChange={(e) => set('role', e.target.value)} />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="label">Description</label>
            <textarea id="description" className="input resize-none h-24"
              placeholder="A bit about this member..."
              value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="label">Tags</label>
            <input id="tags" className="input" placeholder="protective, creative, night-owl (comma separated)"
              value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          </div>

          {/* Color picker */}
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2">
              {MEMBER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set('color', color)}
                  className={`w-8 h-8 rounded-full transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/60
                    ${form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-bg scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-4 bg-surface-alt rounded-xl">
            <div
              className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-lg font-bold text-bg"
              style={!form.avatarUrl ? { backgroundColor: form.color } : undefined}
            >
              {form.avatarUrl ? (
                <DynamicAvatarImage src={form.avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : (
                form.name ? form.name[0].toUpperCase() : '?'
              )}
            </div>
            <div>
              <p className="font-semibold text-text">{form.name || 'Member name'}</p>
              <p className="text-muted text-sm">{form.pronouns || 'pronouns'}</p>
            </div>
          </div>

          {error && (
            <p className="text-error text-sm bg-error/10 border border-error/20 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Link href={`/members/${id}`} className="btn-ghost flex-1 justify-center">Cancel</Link>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="card p-5 mt-4 border border-error/20">
        <h2 className="text-sm font-semibold text-error mb-2">Danger zone</h2>
        <p className="text-muted text-sm mb-3">Removing a member is permanent and cannot be undone.</p>
        {deleteError && (
          <p className="text-error text-sm bg-error/10 border border-error/20 rounded-xl px-3 py-2 mb-3">{deleteError}</p>
        )}
        <button onClick={handleDelete} className="btn-ghost text-error hover:bg-error/10 text-sm">
          Remove this member
        </button>
      </div>
    </div>
  );
}
