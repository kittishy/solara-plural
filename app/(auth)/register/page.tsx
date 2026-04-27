'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    accountType: 'system' as 'system' | 'singlet',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        accountType: form.accountType,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Something went wrong. Try again?');
      setLoading(false);
      return;
    }

    const result = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Account created but sign-in failed. Please log in manually.');
      router.push('/login');
    } else {
      router.push('/');
    }
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center relative mb-4">
          <span className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-ring" aria-hidden="true" />
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 shadow-glow">
            <span className="text-3xl">*</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-text">Solara Plural</h1>
        <p className="text-muted mt-2 text-sm">Create your account and connect with care</p>
      </div>

      <div className="card p-8 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <h2 className="text-xl font-semibold text-text mb-6">Create your account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="label">Account type *</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => set('accountType', 'system')}
                aria-pressed={form.accountType === 'system'}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  form.accountType === 'system'
                    ? 'border-primary/60 bg-primary/10 text-text'
                    : 'border-border bg-surface text-muted hover:border-border/80'
                }`}
              >
                <p className="text-sm font-semibold">Plural system</p>
                <p className="mt-1 text-xs text-muted">Use members, front tracking, notes, and the full Solara flow.</p>
              </button>

              <button
                type="button"
                onClick={() => set('accountType', 'singlet')}
                aria-pressed={form.accountType === 'singlet'}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  form.accountType === 'singlet'
                    ? 'border-primary/60 bg-primary/10 text-text'
                    : 'border-border bg-surface text-muted hover:border-border/80'
                }`}
              >
                <p className="text-sm font-semibold">Singlet</p>
                <p className="mt-1 text-xs text-muted">A simpler account for trusted friends of systems.</p>
              </button>
            </div>
            <p className="text-xs text-subtle">
              Singlet accounts can switch to a full system account later in Settings.
            </p>
          </fieldset>

          <div>
            <label htmlFor="name" className="label">{form.accountType === 'singlet' ? 'Display name *' : 'System name *'}</label>
            <input
              id="name"
              type="text"
              required
              className="input"
              placeholder={form.accountType === 'singlet' ? 'e.g. Luna' : 'e.g. The Stardust Collective'}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="email" className="label">Email *</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password *</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              className="input"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="confirm" className="label">Confirm password *</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              className="input"
              placeholder="Same password again"
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-error text-sm bg-error/10 border border-error/20 rounded-xl px-3 py-2"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center mt-2 min-h-[48px] text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creating account...
              </span>
            ) : 'Create account'}
          </button>
        </form>
      </div>

      <p className="text-center text-muted text-sm mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:text-primary-glow transition-colors duration-150">
          Sign in
        </Link>
      </p>

      <p className="text-center text-subtle text-xs mt-3">
        Solara Plural - a warm, philanthropic space for systems and trusted friends
      </p>
    </div>
  );
}
