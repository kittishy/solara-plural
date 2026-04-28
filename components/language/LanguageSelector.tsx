'use client';

import { LANGUAGES } from '@/lib/i18n';
import { useLanguage } from '@/components/providers/LanguageProvider';

type LanguageSelectorProps = {
  variant?: 'card' | 'compact' | 'pill';
  className?: string;
};

export function LanguageSelector({ variant = 'compact', className = '' }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();
  const id = variant === 'card' ? 'language-selector-card' : 'language-selector-compact';

  if (variant === 'card') {
    return (
      <section
        className={`rounded-2xl border border-primary/35 bg-primary/10 p-4 shadow-glow ${className}`}
        aria-labelledby={`${id}-label`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id={`${id}-label`} className="text-base font-bold text-text">
              {t('language.label')}
            </h2>
            <p className="mt-1 text-sm text-muted">{t('language.helper')}</p>
          </div>
          <span className="rounded-full border border-primary/30 bg-surface px-2 py-1 text-xs font-bold text-primary-glow">
            {LANGUAGES.find((item) => item.code === language)?.shortLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('language.label')}>
          {LANGUAGES.map((item) => (
            <button
              key={item.code}
              type="button"
              role="radio"
              aria-checked={language === item.code}
              onClick={() => setLanguage(item.code)}
              className={`min-h-[48px] rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                language === item.code
                  ? 'border-primary/70 bg-primary/20 text-text shadow-sm'
                  : 'border-border bg-surface/80 text-muted hover:border-primary/35 hover:text-text'
              }`}
            >
              <span className="block">{item.label}</span>
              <span className="mt-0.5 block text-xs opacity-75">{item.shortLabel}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (variant === 'pill') {
    return (
      <label className={`inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/80 px-3 py-2 text-sm shadow-sm backdrop-blur-sm ${className}`}>
        <span className="text-xs font-semibold text-muted">{t('language.label')}</span>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as typeof language)}
          className="min-h-[32px] rounded-full border border-border/70 bg-surface-alt px-2.5 py-1 text-xs font-bold text-text outline-none transition-colors focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
          aria-label={t('language.label')}
        >
          {LANGUAGES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.shortLabel}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className={`block ${className}`}>
      <span className="label">{t('language.label')}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as typeof language)}
        className="input min-h-[44px] w-full cursor-pointer appearance-auto"
        aria-label={t('language.label')}
      >
        {LANGUAGES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
