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
    <div className="w-full max-w-sm animate-fade-in relative">
      {/* Decorative top-left corner bracket */}
      <div
        aria-hidden="true"
        className="absolute -top-4 -left-4 pointer-events-none"
      >
        <div
          style={{
            width: '24px',
            height: '2px',
            background: 'rgb(var(--theme-primary-rgb))',
          }}
        />
        <div
          style={{
            width: '2px',
            height: '24px',
            background: 'rgb(var(--theme-primary-rgb))',
            marginTop: '-2px',
          }}
        />
      </div>
      {/* Decorative bottom-right corner bracket */}
      <div
        aria-hidden="true"
        className="absolute -bottom-4 -right-4 pointer-events-none flex flex-col items-end"
      >
        <div
          style={{
            width: '2px',
            height: '24px',
            background: 'rgb(var(--theme-border-strong-rgb))',
          }}
        />
        <div
          style={{
            width: '24px',
            height: '2px',
            background: 'rgb(var(--theme-border-strong-rgb))',
          }}
        />
      </div>

      {/* Wordmark block */}
      <div className="mb-10 text-center">
        <p
          className="font-black uppercase tracking-[0.35em]"
          style={{
            fontSize: '9px',
            color: 'rgb(var(--theme-primary-rgb))',
            marginBottom: '0.5rem',
          }}
        >
          {'// SOLARA SYSTEM'}
        </p>
        <h1
          className="font-black tracking-tight leading-none"
          style={{ fontSize: '3.75rem' }}
        >
          <span style={{ color: 'rgb(var(--theme-text-rgb))' }}>SOLARA</span>
          <span
            style={{
              color: 'rgb(var(--theme-primary-rgb))',
              filter: 'drop-shadow(0 0 12px rgb(var(--theme-primary-rgb) / 0.7))',
            }}
          >
            .
          </span>
        </h1>
        {/* Thin separator */}
        <div
          style={{
            width: '4rem',
            height: '2px',
            background: 'rgb(var(--theme-primary-rgb))',
            margin: '0.5rem auto 0',
          }}
        />
      </div>

      {/* Form */}
      <div className="animate-slide-up" style={{ animationDelay: '80ms' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <LanguageSelector />

          <div>
            <label htmlFor="email" className="label">
              {t('auth.login.email')}
            </label>
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
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="label"
                style={{ marginBottom: 0 }}
              >
                {t('auth.login.password')}
              </label>
              <Link
                href="/forgot-password"
                className="link-glow font-black uppercase"
                style={{ fontSize: '9px', letterSpacing: '0.12em' }}
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
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
              style={{
                fontSize: '0.8125rem',
                background: 'rgb(var(--theme-primary-rgb) / 0.08)',
                border: '1px solid rgb(var(--theme-primary-rgb) / 0.25)',
                borderLeft: '3px solid rgb(var(--theme-primary-rgb))',
                color: 'rgb(var(--theme-primary-glow-rgb))',
                padding: '0.5rem 0.75rem',
                borderRadius: '0 0.25rem 0.25rem 0',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
            style={{ height: '3.25rem' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                {t('auth.login.signingIn')}
              </span>
            ) : (
              t('auth.login.signIn')
            )}
          </button>
        </form>
      </div>

      {/* Bottom links */}
      <p
        className="text-center mt-8"
        style={{
          fontSize: '0.8125rem',
          color: 'rgb(var(--theme-muted-rgb))',
        }}
      >
        {t('auth.login.newHere')}{' '}
        <Link href="/register" className="link-glow font-black">
          {t('auth.login.createAccount')}
        </Link>
      </p>

      <p
        className="text-center mt-3"
        style={{
          fontSize: '0.75rem',
          color: 'rgb(var(--theme-subtle-rgb))',
        }}
      >
        {t('auth.login.safeSpace')}
      </p>
    </div>
  );
}
