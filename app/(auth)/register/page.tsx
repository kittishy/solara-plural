'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LanguageSelector } from '@/components/language/LanguageSelector';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
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
      setError(t('auth.register.passwordMismatch'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('auth.register.passwordShort'));
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
      setError(data.error ?? t('auth.register.genericError'));
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
      setError(t('auth.register.manualLogin'));
      router.push('/login');
    } else {
      router.push('/');
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      {/* Wordmark */}
      <div className="mb-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted mb-3">
          SYSTEM HQ
        </p>
        <h1 className="text-5xl font-black tracking-tight leading-none text-text">
          SOLARA<span className="text-primary">.</span>
        </h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted/60 mt-3">
          {t('auth.register.tagline')}
        </p>
      </div>

      {/* Form — no card wrapper */}
      <div className="animate-slide-up" style={{ animationDelay: '80ms' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <LanguageSelector />

          <fieldset className="space-y-2">
            <legend className="label">{t('auth.register.accountType')} *</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => set('accountType', 'system')}
                aria-pressed={form.accountType === 'system'}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  form.accountType === 'system'
                    ? 'border-primary bg-primary text-bg'
                    : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-text'
                }`}
              >
                <p className="text-sm font-black">{t('auth.register.pluralSystem')}</p>
                <p className={`mt-1 text-xs ${form.accountType === 'system' ? 'text-bg/70' : 'text-muted'}`}>
                  {t('auth.register.pluralSystemHelp')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => set('accountType', 'singlet')}
                aria-pressed={form.accountType === 'singlet'}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  form.accountType === 'singlet'
                    ? 'border-primary bg-primary text-bg'
                    : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-text'
                }`}
              >
                <p className="text-sm font-black">{t('auth.register.singlet')}</p>
                <p className={`mt-1 text-xs ${form.accountType === 'singlet' ? 'text-bg/70' : 'text-muted'}`}>
                  {t('auth.register.singletHelp')}
                </p>
              </button>
            </div>
            <p className="text-xs text-subtle">{t('auth.register.switchLater')}</p>
          </fieldset>

          <div>
            <label htmlFor="name" className="label">
              {form.accountType === 'singlet' ? t('auth.register.displayName') : t('auth.register.systemName')} *
            </label>
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
            <label htmlFor="email" className="label">{t('auth.register.email')} *</label>
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
            <label htmlFor="password" className="label">{t('auth.register.password')} *</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              className="input"
              placeholder={t('auth.register.passwordPlaceholder')}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="confirm" className="label">{t('auth.register.confirmPassword')} *</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              className="input"
              placeholder={t('auth.register.confirmPlaceholder')}
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
            className="btn-primary w-full justify-center mt-2 min-h-[52px] text-sm font-black uppercase tracking-widest"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {t('auth.register.creating')}
              </span>
            ) : t('auth.register.create')}
          </button>
        </form>
      </div>

      <p className="text-center text-muted text-sm mt-8">
        {t('auth.register.alreadyHave')}{' '}
        <Link href="/login" className="font-bold text-primary hover:text-primary-glow transition-colors duration-150">
          {t('auth.register.signIn')}
        </Link>
      </p>

      <p className="text-center text-subtle text-xs mt-3">{t('auth.register.footer')}</p>
    </div>
  );
}
