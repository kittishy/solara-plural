'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FrontEntry } from '@/lib/db/schema';
import { revalidateFrontHistory, revalidateMembersAndFront } from '@/lib/swr';
import { useLanguage } from '@/components/providers/LanguageProvider';

type FrontMember = {
  id: string;
  name: string;
  color: string | null;
  avatarUrl: string | null;
};

interface Props {
  members: FrontMember[];
  activeFront: (Omit<FrontEntry, 'memberIds'> & { memberIds: string[] }) | null;
}

function MemberAvatar({ member, size }: { member: FrontMember; size: 'xs' | 'sm' | 'md' }) {
  const cls = size === 'xs'
    ? 'h-5 w-5 text-[10px]'
    : size === 'sm'
      ? 'h-8 w-8 text-xs'
      : 'h-10 w-10 text-sm';

  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.name}
        className={`${cls} flex-shrink-0 rounded-full object-cover ring-1 ring-border/50`}
      />
    );
  }

  return (
    <div
      className={`${cls} flex flex-shrink-0 items-center justify-center rounded-full font-bold text-bg ring-1 ring-border/50`}
      style={{ backgroundColor: member.color ?? '#a78bfa' }}
    >
      {member.name[0].toUpperCase()}
    </div>
  );
}

export default function FrontTracker({ members, activeFront }: Props) {
  const router = useRouter();
  const { t, formatTime } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(activeFront?.memberIds ?? []);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [isMobilePickerOpen, setIsMobilePickerOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function toggleMember(id: string) {
    setSelected((prev) => (
      prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id]
    ));
  }

  async function startFront() {
    if (selected.length === 0) return;

    setFeedback(null);
    const res = await fetch('/api/front', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: selected, note: note.trim() || undefined }),
    });

    if (!res.ok) {
      setFeedback({ type: 'error', message: t('front.saveError') });
      return;
    }

    setFeedback({ type: 'success', message: activeFront ? t('front.switched') : t('front.started') });
    revalidateMembersAndFront();
    revalidateFrontHistory();
    startTransition(() => router.refresh());
  }

  async function endFront() {
    setFeedback(null);
    const res = await fetch('/api/front', { method: 'DELETE' });

    if (!res.ok) {
      setFeedback({ type: 'error', message: t('front.endError') });
      return;
    }

    setSelected([]);
    setNote('');
    setFeedback({ type: 'success', message: t('front.ended') });
    revalidateMembersAndFront();
    revalidateFrontHistory();
    startTransition(() => router.refresh());
  }

  const frontingMembers = activeFront
    ? members.filter((member) => activeFront.memberIds.includes(member.id))
    : [];

  const selectedMembers = useMemo(
    () => members.filter((member) => selected.includes(member.id)),
    [members, selected]
  );

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matched = normalized
      ? members.filter((member) => member.name.toLowerCase().includes(normalized))
      : members;

    const selectedSet = new Set(selected);
    return [...matched].sort((a, b) => {
      const aSelected = selectedSet.has(a.id);
      const bSelected = selectedSet.has(b.id);
      if (aSelected === bSelected) return a.name.localeCompare(b.name);
      return aSelected ? -1 : 1;
    });
  }, [members, query, selected]);

  return (
    <div className="space-y-4">
      {activeFront ? (
        <section className="card border-front/40 p-5 shadow-front-glow" aria-label={t('front.currentSession')}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="relative inline-flex h-3 w-3" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-front opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-front shadow-[0_0_8px_rgba(249,168,212,0.7)]" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-text">{t('front.currentlyFronting')}</h2>
          </div>

          <div className="mb-5 flex flex-wrap gap-3">
            {frontingMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-2.5 rounded-full border border-border/50 bg-surface-alt/80 py-1.5 pl-1.5 pr-4 shadow-sm">
                <MemberAvatar member={member} size="md" />
                <span className="text-base font-medium text-text">{member.name}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-4">
            <p className="text-sm font-medium text-muted">
              {t('dashboard.since')} {formatTime(activeFront.startedAt, { hour: 'numeric', minute: '2-digit' })}
            </p>
            <button
              type="button"
              onClick={endFront}
              disabled={isPending}
              className="btn-ghost min-h-[44px] border border-border/60 px-5 py-2.5 text-sm font-medium shadow-sm hover:border-border"
            >
              {isPending ? t('front.ending') : t('front.endFront')}
            </button>
          </div>
        </section>
      ) : (
        <section className="card border-dashed border-border/50 p-5 md:p-6">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v2" />
                <path d="M12 19v2" />
                <path d="M5 12H3" />
                <path d="M21 12h-2" />
                <circle cx="12" cy="12" r="5" />
              </svg>
            </span>
            <h2 className="text-base font-semibold tracking-tight text-text">{t('front.quietMoment')}</h2>
          </div>
          <p className="text-sm text-muted">{t('dashboard.noCurrentFront')}</p>
        </section>
      )}

      {members.length === 0 ? (
        <section className="card p-5">
          <p className="rounded-xl border border-border/50 bg-surface-alt p-4 text-base text-muted">
            {t('front.noMembersYet')}{' '}
            <Link href="/members/new" className="font-medium text-primary hover:underline">
              {t('front.addOneFirst')}
            </Link>
          </p>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <section className="card border-border/70 bg-surface/95 p-5 shadow-sm" aria-labelledby="front-selector-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="front-selector-title" className="text-base font-semibold text-text">
                  {activeFront ? t('front.switchFront') : t('front.startFront')}
                </h2>
                <p className="text-sm text-muted">{t('front.selectMembersHelp')}</p>
              </div>
              <p className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-glow">
                {selected.length} {t('common.selected')}
              </p>
            </div>

            <div className="mt-4 md:hidden">
              <button
                type="button"
                onClick={() => setIsMobilePickerOpen((prev) => !prev)}
                className="w-full rounded-xl border border-border/70 bg-surface-alt/70 px-3.5 py-3 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-surface-alt/90 active:scale-[0.99]"
                aria-expanded={isMobilePickerOpen}
                aria-controls="mobile-member-picker"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-text">
                    {isMobilePickerOpen ? t('front.closeSelector') : t('front.chooseMembers')}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`text-base text-primary-glow transition-transform duration-150 ${isMobilePickerOpen ? 'rotate-180' : ''}`}
                  >
                    ▾
                  </span>
                </span>
                <span className="mt-2 flex items-center justify-start">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-glow">
                    {selected.length} {t('common.selected')}
                  </span>
                </span>
              </button>

              {isMobilePickerOpen && (
                <div id="mobile-member-picker" className="mt-3 space-y-3 rounded-xl border border-border/50 bg-surface-alt/50 p-3">
                  <label htmlFor="front-member-search-mobile" className="label text-sm font-medium">{t('front.searchMembers')}</label>
                  <input
                    id="front-member-search-mobile"
                    className="input min-h-[44px] bg-surface px-4 py-2.5 text-base transition-colors focus:bg-surface"
                    placeholder={t('front.searchPlaceholder')}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />

                  {filteredMembers.length === 0 ? (
                    <p className="rounded-xl border border-border/50 bg-surface p-3 text-sm text-muted">
                      {t('common.noResultsFor', { query })}
                    </p>
                  ) : (
                    <div className="max-h-[42dvh] space-y-2 overflow-y-auto pr-1">
                      {filteredMembers.map((member) => {
                        const isSelected = selected.includes(member.id);

                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleMember(member.id)}
                            aria-pressed={isSelected}
                            aria-label={t('front.toggleMember', { name: member.name })}
                            className={`flex min-h-[48px] w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                              isSelected
                                ? 'border-primary/60 bg-primary/12 text-text'
                                : 'border-border/50 bg-surface text-muted'
                            }`}
                          >
                            <MemberAvatar member={member} size="sm" />
                            <span className="flex-1 truncate font-medium">{member.name}</span>
                            <span
                              aria-hidden="true"
                              className={`h-5 w-5 rounded-full border text-center text-xs leading-[18px] ${
                                isSelected
                                  ? 'border-primary/70 bg-primary/20 text-primary-glow'
                                  : 'border-border/70 text-subtle'
                              }`}
                            >
                              {isSelected ? 'x' : '+'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="hidden md:block">
              <label htmlFor="front-member-search-desktop" className="label text-sm font-medium">{t('front.searchMembers')}</label>
              <input
                id="front-member-search-desktop"
                className="input min-h-[44px] bg-surface-alt/50 px-4 py-2.5 text-base transition-colors focus:bg-surface"
                placeholder={t('front.searchPlaceholder')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-describedby="front-member-help"
              />
              <p id="front-member-help" className="mt-2 text-xs text-subtle">
                {t('front.selectionHelp')}
              </p>

              <fieldset className="mt-4">
                <legend className="sr-only">{t('front.memberSelection')}</legend>
                {filteredMembers.length === 0 ? (
                  <p className="rounded-xl border border-border/50 bg-surface-alt p-4 text-sm text-muted">
                    {t('common.noResultsTry', { query })}
                  </p>
                ) : (
                  <div className="max-h-[46dvh] overflow-y-auto pr-1 sm:max-h-[52dvh]">
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      {filteredMembers.map((member) => {
                        const isSelected = selected.includes(member.id);

                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleMember(member.id)}
                            aria-pressed={isSelected}
                            aria-label={t('front.toggleMember', { name: member.name })}
                            className={`flex min-h-[56px] items-center gap-3 rounded-xl border-2 p-2.5 text-left text-sm transition-all duration-150 active:scale-95 ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-text shadow-sm'
                                : 'border-transparent bg-surface-alt text-muted hover:bg-surface-alt/80 hover:text-text'
                            }`}
                          >
                            <MemberAvatar member={member} size="sm" />
                            <span className="flex-1 truncate font-medium leading-tight">{member.name}</span>
                            {isSelected && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                aria-hidden="true" className="flex-shrink-0 text-primary">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </fieldset>
            </div>
          </section>

          <section className="card h-fit p-5 shadow-sm lg:sticky lg:top-6" aria-labelledby="front-session-title">
            <h2 id="front-session-title" className="mb-3 text-base font-semibold text-text">{t('front.sessionDetails')}</h2>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-muted">{t('front.selectedMembers')}</p>
                {selectedMembers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelected([])}
                    className="min-h-[44px] px-1 text-xs text-primary transition-colors hover:text-primary-glow"
                  >
                    {t('common.clearAll')}
                  </button>
                )}
              </div>

              {selectedMembers.length === 0 ? (
                <p className="rounded-xl border border-border/50 bg-surface-alt p-3 text-sm text-muted">
                  {t('front.noSelected')}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <button
                      type="button"
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      aria-label={t('front.removeMember', { name: member.name })}
                      className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-sm text-text transition-colors hover:border-primary/50 hover:bg-primary/15"
                    >
                      <MemberAvatar member={member} size="xs" />
                      {member.name}
                      <span aria-hidden="true" className="text-primary-glow">x</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-5 space-y-2">
              <label htmlFor="front-note" className="label text-sm font-medium">{t('common.noteOptional')}</label>
              <input
                id="front-note"
                className="input min-h-[44px] bg-surface-alt/50 px-4 py-2.5 text-base transition-colors focus:bg-surface"
                placeholder={t('front.notePlaceholder')}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={startFront}
              disabled={selected.length === 0 || isPending}
              className="btn-primary min-h-[52px] w-full text-base font-semibold shadow-glow transition-all duration-200 active:scale-[0.98]"
            >
              {isPending
                ? activeFront ? t('front.switching') : t('front.starting')
                : activeFront ? t('front.switchFront') : t('front.startFront')}
              {selected.length > 0 && ` (${selected.length})`}
            </button>

            <Link href="/front/history" className="btn-ghost mt-3 min-h-[44px] w-full justify-center border border-border/60">
              {t('front.openHistory')}
            </Link>
          </section>
        </div>
      )}

      <div aria-live="polite" aria-atomic="true">
        {feedback?.type === 'success' && <p role="status" className="text-sm text-success">{feedback.message}</p>}
      </div>
      <div aria-live="assertive" aria-atomic="true">
        {feedback?.type === 'error' && <p role="alert" className="text-sm text-error">{feedback.message}</p>}
      </div>
    </div>
  );
}
