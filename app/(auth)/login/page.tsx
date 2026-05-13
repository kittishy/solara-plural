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
    <div className="w-full max-w-sm animate-fade-in">
      {/* Wordmark */}
      <div className="mb-10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted mb-3">
          SYSTEM HQ
        </p>
        <h1 className="text-5xl font-black tracking-tight leading-none text-text">
          SOLARA<span className="text-primary">.</span>
        </h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted/60 mt-3">
          {t('auth.login.tagline')}
        </p>
      </div>

      {/* Form — no card wrapper */}
      <div className="animate-slide-up" style={{ animationDelay: '80ms' }}>
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
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="text-sm font-bold text-primary hover:text-primary-glow transition-colors duration-150">
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
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
                {t('auth.login.signingIn')}
              </span>
            ) : t('auth.login.signIn')}
          </button>
        </form>
      </div>

      <p className="text-center text-muted text-sm mt-8">
        {t('auth.login.newHere')}{' '}
        <Link href="/register" className="font-bold text-primary hover:text-primary-glow transition-colors duration-150">
          {t('auth.login.createAccount')}
        </Link>
      </p>

      <p className="text-center text-subtle text-xs mt-3">
        {t('auth.login.safeSpace')}
      </p>
    </div>
  );
}
