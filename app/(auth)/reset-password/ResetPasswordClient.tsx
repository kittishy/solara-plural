'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LanguageSelector } from '@/components/language/LanguageSelector';
import { useLanguage } from '@/components/providers/LanguageProvider';

export function ResetPasswordClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.register.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.register.passwordShort'));
      return;
    }

    setLoading(true);
    const response = await fetch('/api/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const result = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok || !result?.success) {
      const errorKey = result?.code === 'WEAK_PASSWORD'
        ? 'auth.register.passwordShort'
        : 'auth.reset.invalid';
      setError(t(errorKey));
      return;
    }

    setSuccess(true);
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 shadow-glow mb-4">
          <span className="text-3xl">☀️</span>
        </div>
        <h1 className="text-3xl font-bold text-text">Solara Plural</h1>
        <p className="text-muted mt-2 text-sm">{t('auth.reset.tagline')}</p>
      </div>

      <div className="card p-8 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <h2 className="text-xl font-semibold text-text mb-2">{t('auth.reset.title')}</h2>
        <p className="text-sm text-muted mb-6">{t('auth.reset.helper')}</p>

        {success ? (
          <div className="space-y-4">
            <p role="status" className="text-success text-sm bg-success/10 border border-success/20 rounded-xl px-3 py-2">
              {t('auth.reset.success')}
            </p>
            <Link href="/login" className="btn-primary w-full justify-center min-h-[48px] text-base">
              {t('auth.reset.signIn')}
            </Link>
          </div>
        ) : !token ? (
          <div className="space-y-4">
            <p role="alert" className="text-error text-sm bg-error/10 border border-error/20 rounded-xl px-3 py-2">
              {t('auth.reset.noToken')}
            </p>
            <Link href="/forgot-password" className="btn-primary w-full justify-center min-h-[48px] text-base">
              {t('auth.forgot.send')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <LanguageSelector />

            <div>
              <label htmlFor="password" className="label">{t('auth.reset.newPassword')}</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                placeholder={t('auth.register.passwordPlaceholder')}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">{t('auth.register.confirmPassword')}</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="input"
                placeholder={t('auth.register.confirmPlaceholder')}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-error text-sm bg-error/10 border border-error/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2 min-h-[48px] text-base"
            >
              {loading ? t('auth.reset.saving') : t('auth.reset.save')}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-muted text-sm mt-6">
        <Link href="/login" className="text-primary hover:text-primary-glow transition-colors duration-150">
          {t('auth.forgot.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
