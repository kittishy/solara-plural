'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LanguageSelector } from '@/components/language/LanguageSelector';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');
    setError('');
    setLoading(true);

    const response = await fetch('/api/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const result = await response.json().catch(() => null);

    setLoading(false);
    if (!response.ok || !result?.success) {
      const errorKey = result?.code === 'EMAIL_NOT_CONFIGURED'
        ? 'auth.forgot.notConfigured'
        : 'auth.forgot.sendFailed';
      setError(t(errorKey));
      return;
    }

    setStatus(t('auth.forgot.sent'));
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 shadow-glow mb-4">
          <span className="text-3xl">☀️</span>
        </div>
        <h1 className="text-3xl font-bold text-text">Solara Plural</h1>
        <p className="text-muted mt-2 text-sm">{t('auth.forgot.tagline')}</p>
      </div>

      <div className="card p-8 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <h2 className="text-xl font-semibold text-text mb-2">{t('auth.forgot.title')}</h2>
        <p className="text-sm text-muted mb-6">{t('auth.forgot.helper')}</p>

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
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {status && (
            <p role="status" className="text-success text-sm bg-success/10 border border-success/20 rounded-xl px-3 py-2">
              {status}
            </p>
          )}

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
            {loading ? t('auth.forgot.sending') : t('auth.forgot.send')}
          </button>
        </form>
      </div>

      <p className="text-center text-muted text-sm mt-6">
        <Link href="/login" className="text-primary hover:text-primary-glow transition-colors duration-150">
          {t('auth.forgot.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
