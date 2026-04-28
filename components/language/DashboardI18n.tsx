'use client';

import { useLanguage } from '@/components/providers/LanguageProvider';

export function LocalizedToday() {
  const { formatDate } = useLanguage();
  return <>{formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}</>;
}

export function DashboardGreeting({ name }: { name: string }) {
  const { t } = useLanguage();
  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? t('dashboard.greetingNight') :
    hour < 12 ? t('dashboard.greetingMorning') :
    hour < 17 ? t('dashboard.greetingAfternoon') :
    hour < 21 ? t('dashboard.greetingEvening') :
    t('dashboard.greetingNight');

  return <>{greeting}, {name}</>;
}

export function LocalizedTime({ date }: { date: Date | string | number }) {
  const { formatTime } = useLanguage();
  return <>{formatTime(date, { hour: 'numeric', minute: '2-digit' })}</>;
}

