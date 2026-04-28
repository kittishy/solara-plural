'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LanguageSelector } from '@/components/language/LanguageSelector';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t('auth.login.invalid'));
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
            <span className="text-3xl">☀️</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-text">Solara Plural</h1>
        <p className="text-muted mt-2 text-sm">{t('auth.login.tagline')}</p>
      </div>

      <div className="card p-8 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <h2 className="text-xl font-semibold text-text mb-6">{t('auth.login.title')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LanguageSelector />

          <div>
            <label htmlFor="email" className="label">{t('auth.login.email')}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">{t('auth.login.password')}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                {t('auth.login.signingIn')}
              </span>
            ) : t('auth.login.signIn')}
          </button>
        </form>
      </div>

      <p className="text-center text-muted text-sm mt-6">
        {t('auth.login.newHere')}{' '}
        <Link href="/register" className="text-primary hover:text-primary-glow transition-colors duration-150">
          {t('auth.login.createAccount')}
        </Link>
      </p>

      <p className="text-center text-subtle text-xs mt-3">
        {t('auth.login.safeSpace')}
      </p>
    </div>
  );
}
