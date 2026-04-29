'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { revalidateMembersAndFront } from '@/lib/swr';
import AvatarUpload from '@/components/members/AvatarUpload';

const MEMBER_COLORS = [
  '#a78bfa', '#f9a8d4', '#93c5fd', '#86efac', '#fcd34d',
  '#fb923c', '#f87171', '#67e8f9', '#d8b4fe', '#a5b4fc',
  '#fdba74', '#6ee7b7',
];

export default function NewMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', pronouns: '', description: '', role: '',
    color: MEMBER_COLORS[0], tags: '', avatarUrl: '',
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

    const res = await fetch('/api/members', {
      method: 'POST',
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
    router.push('/members');
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/members" className="btn-ghost">← Back</Link>
        <h1 className="text-2xl font-bold text-text">Add a member</h1>
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
                <Image src={form.avatarUrl} alt="Avatar preview" width={48} height={48} className="w-full h-full object-cover" />
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
            <Link href="/members" className="btn-ghost flex-1 justify-center">Cancel</Link>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Saving...' : 'Save member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
