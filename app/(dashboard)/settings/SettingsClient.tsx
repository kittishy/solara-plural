'use client';

import { useEffect, useRef, useState } from 'react';
import { LanguageSelector } from '@/components/language/LanguageSelector';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { signOut } from 'next-auth/react';
import { prepareAvatarDataUrl } from '@/lib/client/avatar-upload';
import {
  applySolaraTheme,
  DEFAULT_SOLARA_THEME,
  persistSolaraTheme,
  readStoredSolaraTheme,
  SOLARA_THEMES,
  type SolaraThemeId,
} from '@/lib/theme';

type SettingsSystem = {
  id?: string;
  name: string;
  email: string;
  description: string | null;
  accountType: string;
  avatarMode?: string | null;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  deletionRequestedAt?: Date | string | null;
  deletionScheduledFor?: Date | string | null;
};

type ActionStatus = {
  type: 'success' | 'error' | 'info';
  message: string;
};

type ImportOptions = {
  updateExistingMembers: boolean;
  importNewMembers: boolean;
  smartDuplicateDetection: boolean;
  overrides: ImportOverrides;
};

type ImportOverrides = {
  name: boolean;
  pronouns: boolean;
  description: boolean;
  avatar: boolean;
  color: boolean;
  role: boolean;
  tags: boolean;
  notes: boolean;
};

type ImportSuccessData = {
  imported: number;
  updated?: number;
  skipped: number;
  duplicatesDetected?: number;
};

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error?: string };

type ImportSummary = {
  imported: number;
  updated: number;
  skipped: number;
  duplicatesDetected: number;
};

type ImportEnvelope = {
  members: unknown[];
  importOptions: ImportOptions;
} & Record<string, unknown>;

type SyncProvider = 'pluralkit';

type SyncOverrides = {
  name: boolean;
  pronouns: boolean;
  description: boolean;
  avatarUrl: boolean;
  color: boolean;
  role: boolean;
  tags: boolean;
  notes: boolean;
};

type SyncOptions = {
  updateExistingMembers: boolean;
  importNewMembers: boolean;
  smartDuplicateDetection: boolean;
  overrides: SyncOverrides;
};

type SyncSummary = {
  fetched: number;
  create: number;
  update: number;
  link: number;
  skip: number;
  unchanged: number;
  skippedReasons?: Record<string, number>;
};

type SyncOperationPreview = {
  action: 'create' | 'update' | 'link' | 'skip' | 'unchanged';
  provider: SyncProvider;
  externalId: string;
  externalSecondaryId: string | null;
  name: string;
  reason: string;
  memberId: string | null;
  changedFields: string[];
};

type SyncResult = {
  provider: SyncProvider;
  applied: boolean;
  remoteSystemId: string | null;
  summary: SyncSummary;
  operations: SyncOperationPreview[];
  operationLimit: number;
  frontSync?: {
    status: 'started' | 'ended' | 'unchanged' | 'skipped';
    remoteFrontCount: number;
    appliedMemberCount: number;
    reason?: string;
  } | null;
};

type PluralKitConnectionStatus = {
  hasLinkedMembers: boolean;
  hasSavedToken?: boolean;
  linkedMembers: number;
  lastSyncedAt: string | null;
};

const IMPORT_OPTIONS_STORAGE_KEY = 'solara.settings.importOptions';
const DEFAULT_AVATAR_EMOJI = '☀️';
const AVATAR_PRESETS = ['☀️', '🌙', '⭐', '🌸', '💜', '✨', '🫷', '🌿', '🫧', '🧭'] as const;
const MAX_AVATAR_FILE_BYTES = 20 * 1024 * 1024;

type AvatarMode = 'emoji' | 'url';
const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  updateExistingMembers: true,
  importNewMembers: true,
  smartDuplicateDetection: true,
  overrides: {
    name: false,
    pronouns: true,
    description: true,
    avatar: true,
    color: true,
    role: true,
    tags: true,
    notes: true,
  },
};

const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  updateExistingMembers: true,
  importNewMembers: true,
  smartDuplicateDetection: true,
  overrides: {
    name: false,
    pronouns: false,
    description: false,
    avatarUrl: false,
    color: false,
    role: false,
    tags: false,
    notes: false,
  },
};

export default function SettingsClient({
  system,
  pluralKitConnection,
}: {
  system: SettingsSystem | null;
  pluralKitConnection: PluralKitConnectionStatus;
}) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [changingAccountType, setChangingAccountType] = useState(false);
  const [accountTypeWarningOpen, setAccountTypeWarningOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionConfirmEmail, setDeletionConfirmEmail] = useState('');
  const [deletionAcknowledged, setDeletionAcknowledged] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [syncingProvider, setSyncingProvider] = useState<SyncProvider | null>(null);
  const [status, setStatus] = useState<ActionStatus | null>(null);
  const [accountType, setAccountType] = useState<'system' | 'singlet'>(toAccountType(system?.accountType));
  const [deletionRequestedAt, setDeletionRequestedAt] = useState<Date | string | null>(system?.deletionRequestedAt ?? null);
  const [deletionScheduledFor, setDeletionScheduledFor] = useState<Date | string | null>(system?.deletionScheduledFor ?? null);
  const [themeId, setThemeId] = useState<SolaraThemeId>(DEFAULT_SOLARA_THEME);
  const [avatarMode, setAvatarMode] = useState<AvatarMode>('emoji');
  const [avatarEmoji, setAvatarEmoji] = useState<string>(DEFAULT_AVATAR_EMOJI);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [profileName, setProfileName] = useState<string>(system?.name ?? '');
  const [profileDescription, setProfileDescription] = useState<string>(system?.description ?? '');
  const [importOptions, setImportOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS);
  const [lastImportSummary, setLastImportSummary] = useState<ImportSummary | null>(null);
  const [syncOptions, setSyncOptions] = useState<SyncOptions>(DEFAULT_SYNC_OPTIONS);
  const [pluralKitToken, setPluralKitToken] = useState('');
  const [hasSavedPluralKitToken, setHasSavedPluralKitToken] = useState(Boolean(pluralKitConnection.hasSavedToken));
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = readStoredImportOptions();
    if (saved) setImportOptions(saved);
    const savedTheme = readStoredSolaraTheme();
    setThemeId(savedTheme);
    applySolaraTheme(savedTheme);
  }, []);

  useEffect(() => {
    setAccountType(toAccountType(system?.accountType));
    setDeletionRequestedAt(system?.deletionRequestedAt ?? null);
    setDeletionScheduledFor(system?.deletionScheduledFor ?? null);
    setProfileName(system?.name ?? '');
    setProfileDescription(system?.description ?? '');
    setAvatarMode(toAvatarMode(system?.avatarMode));
    setAvatarEmoji(system?.avatarEmoji?.trim() ? system.avatarEmoji : DEFAULT_AVATAR_EMOJI);
    setAvatarUrl(system?.avatarUrl ?? '');
  }, [system]);

  useEffect(() => {
    try {
      localStorage.setItem(IMPORT_OPTIONS_STORAGE_KEY, JSON.stringify(importOptions));
    } catch {
      // Ignore localStorage failures silently (private mode / storage disabled).
    }
  }, [importOptions]);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setStatus({ type: 'info', message: 'Preparing your export...' });

    try {
      const res = await fetch('/api/export');
      if (!res.ok) {
        const message = await readErrorMessage(res, 'Export failed. Please try again.');
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solara-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus({ type: 'success', message: 'Export ready. Your download should start now.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Export failed. Please try again.',
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setLastImportSummary(null);
    setStatus({ type: 'info', message: 'Reading import file...' });

    try {
      const text = await file.text();
      let data: unknown;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file. Choose a Solara export or a member array.');
      }

      if (!isAcceptedImportShape(data)) {
        throw new Error('Invalid file format. Expected a Solara export ({ members: [...] }) or a bare member array ([...]).');
      }

      if (!importOptions.updateExistingMembers && !importOptions.importNewMembers) {
        throw new Error('Nothing to import yet. Turn on at least one option: update existing members or import new members.');
      }

      setStatus({ type: 'info', message: 'Importing members...' });
      const payload = buildImportPayload(data, importOptions);
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await readJsonResponse<ImportSuccessData>(res);
      if (!result.success) {
        throw new Error(result.error ?? 'Import failed. Please try again.');
      }

      const summary = toImportSummary(result.data);
      setLastImportSummary(summary);

      const message = createImportSummaryMessage(summary);
      setStatus({ type: 'success', message });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Import failed. Please try again.',
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleMemberSync(provider: SyncProvider, apply: boolean) {
    if (syncingProvider) return;

    const token = pluralKitToken.trim();
    if (!token && !hasSavedPluralKitToken) {
      setStatus({
        type: 'error',
        message: 'PluralKit token is required.',
      });
      return;
    }

    setSyncingProvider(provider);
    setStatus({
      type: 'info',
      message: apply ? 'Applying safe member sync...' : 'Previewing member sync...',
    });

    try {
      const res = await fetch('/api/integrations/member-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          token,
          apply,
          options: toApiSyncOptions(syncOptions),
        }),
      });

      const payload = await readJsonResponse<SyncResult>(res);
      if (!payload.success) {
        throw new Error(payload.error ?? 'Sync failed. Please try again.');
      }

      setLastSyncResult(payload.data);
      if (token) setHasSavedPluralKitToken(true);
      setStatus({
        type: 'success',
        message: createSyncSummaryMessage(payload.data.summary, payload.data.applied),
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Sync failed. Please try again.',
      });
    } finally {
      setSyncingProvider(null);
    }
  }

  async function updateAccountType(nextAccountType: 'system' | 'singlet', acknowledgeDataRisk = false) {
    if (changingAccountType) return;
    if (nextAccountType === accountType) return;
    setChangingAccountType(true);
    setStatus({
      type: 'info',
      message: nextAccountType === 'system' ? 'Changing your account to system...' : 'Changing your account to singlet...',
    });

    try {
      const res = await fetch('/api/account/type', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountType: nextAccountType, acknowledgeDataRisk }),
      });

      const payload = await readJsonResponse(res);
      if (!payload.success) {
        throw new Error(payload.error ?? 'Could not update your account type.');
      }

      setAccountType(nextAccountType);
      setAccountTypeWarningOpen(false);
      setStatus({
        type: 'success',
        message: nextAccountType === 'system'
          ? 'Your account is now a system account.'
          : 'Your account is now a singlet account.',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not update your account type.',
      });
    } finally {
      setChangingAccountType(false);
    }
  }

  async function scheduleAccountDeletion() {
    if (deletionBusy || !system?.email) return;
    setDeletionBusy(true);
    setStatus({ type: 'info', message: 'Scheduling account deletion recovery window...' });

    try {
      const res = await fetch('/api/account/deletion', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmEmail: deletionConfirmEmail,
          acknowledgeRecoveryWindow: deletionAcknowledged,
        }),
      });

      const payload = await readJsonResponse<{
        deletionRequestedAt: Date | string | null;
        deletionScheduledFor: Date | string | null;
      }>(res);

      if (!payload.success) {
        throw new Error(payload.error ?? 'Could not schedule account deletion.');
      }

      setDeletionRequestedAt(payload.data.deletionRequestedAt);
      setDeletionScheduledFor(payload.data.deletionScheduledFor);
      setDeletionConfirmEmail('');
      setDeletionAcknowledged(false);
      setStatus({ type: 'success', message: 'Deletion scheduled. You can cancel it from Settings for the next 72 hours.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not schedule account deletion.',
      });
    } finally {
      setDeletionBusy(false);
    }
  }

  async function cancelAccountDeletion() {
    if (deletionBusy) return;
    setDeletionBusy(true);
    setStatus({ type: 'info', message: 'Canceling scheduled account deletion...' });

    try {
      const res = await fetch('/api/account/deletion', { method: 'POST' });
      const payload = await readJsonResponse<{
        deletionRequestedAt: Date | string | null;
        deletionScheduledFor: Date | string | null;
      }>(res);

      if (!payload.success) {
        throw new Error(payload.error ?? 'Could not cancel account deletion.');
      }

      setDeletionRequestedAt(null);
      setDeletionScheduledFor(null);
      setStatus({ type: 'success', message: 'Account deletion canceled. Your data remains active.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not cancel account deletion.',
      });
    } finally {
      setDeletionBusy(false);
    }
  }

  function updateTheme(nextTheme: SolaraThemeId) {
    setThemeId(nextTheme);
    applySolaraTheme(nextTheme);
    persistSolaraTheme(nextTheme);
    const label = SOLARA_THEMES.find((theme) => theme.id === nextTheme)?.label ?? 'Custom';
    setStatus({ type: 'success', message: `Theme changed to ${label}.` });
  }

  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploadingAvatar) return;

    setAvatarUploadError(null);
    if (file.size > MAX_AVATAR_FILE_BYTES) {
      setAvatarUploadError('File is too large - max 20 MB.');
      e.target.value = '';
      return;
    }

    setUploadingAvatar(true);
    setStatus({ type: 'info', message: 'Preparing avatar image...' });

    try {
      const dataUrl = await prepareAvatarDataUrl(file);
      setAvatarMode('url');
      setAvatarUrl(dataUrl);
      setStatus({ type: 'success', message: 'Avatar ready. Save profile to keep it.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed. Try again.';
      setAvatarUploadError(message);
      setStatus({ type: 'error', message });
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  async function saveProfile() {
    if (savingProfile) return;

    const normalizedName = profileName.trim();
    if (!normalizedName) {
      setStatus({ type: 'error', message: 'Name is required.' });
      return;
    }

    if (avatarMode === 'url' && !isValidAvatarImageSource(avatarUrl)) {
      setStatus({ type: 'error', message: 'Please provide a valid avatar image URL.' });
      return;
    }

    setSavingProfile(true);
    setStatus({ type: 'info', message: 'Saving your profile...' });

    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: normalizedName,
          description: profileDescription.trim() || null,
          avatarMode,
          avatarEmoji: avatarEmoji || DEFAULT_AVATAR_EMOJI,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });

      const payload = await readJsonResponse(res);
      if (!payload.success) {
        throw new Error(payload.error ?? 'Could not save profile.');
      }

      setStatus({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not save profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await signOut({ callbackUrl: '/login' });
  }

  const deletionIsScheduled = Boolean(deletionRequestedAt && deletionScheduledFor);
  const deletionScheduledLabel = deletionScheduledFor ? formatDateTime(deletionScheduledFor) : null;

  return (
    <div className="space-y-6" aria-busy={importing || exporting || Boolean(syncingProvider)}>

      {/* ── Your System ─────────────────────────────────────────── */}
      <section className="card p-6" aria-labelledby="settings-system-heading">
        <h2 id="settings-system-heading" className="text-lg font-semibold text-text mb-4">
          Your Account
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="text-muted w-24 flex-shrink-0">Name</dt>
            <dd className="text-text font-medium">{system?.name ?? 'Not found'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-muted w-24 flex-shrink-0">Email</dt>
            <dd className="text-text font-medium">{system?.email ?? 'Not found'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-muted w-24 flex-shrink-0">Type</dt>
            <dd className="text-text font-medium">{accountType === 'system' ? 'System' : 'Singlet'}</dd>
          </div>
          {system?.description && (
            <div className="flex gap-3">
              <dt className="text-muted w-24 flex-shrink-0">About</dt>
              <dd className="text-text">{system.description}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 rounded-xl border border-border-soft bg-surface-alt/40 p-4">
          <h3 className="text-sm font-semibold text-text">Account type</h3>
          <p className="text-xs text-muted mt-1">
            Switch between singlet and system mode. System mode enables member/front features.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => accountType === 'system' ? undefined : void updateAccountType('system')}
              disabled={changingAccountType || accountType === 'system'}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                accountType === 'system'
                  ? 'border-primary/60 bg-primary/15 text-text'
                  : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-text'
              }`}
              aria-pressed={accountType === 'system'}
            >
              System
            </button>
            <button
              type="button"
              onClick={() => accountType === 'singlet' ? undefined : setAccountTypeWarningOpen(true)}
              disabled={changingAccountType || accountType === 'singlet'}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                accountType === 'singlet'
                  ? 'border-primary/60 bg-primary/15 text-text'
                  : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-text'
              }`}
              aria-pressed={accountType === 'singlet'}
            >
              Singlet
            </button>
          </div>

          {accountTypeWarningOpen && (
            <div className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
              <h4 className="text-sm font-semibold text-text">Before changing to singlet</h4>
              <p className="mt-1 text-xs text-muted">
                Some system-specific data or future system-only features may be hidden, changed, or removed by this account type change. Your current data is not deleted by this button, but please export a backup if you are unsure.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost min-h-[40px] border border-border px-3 text-sm"
                  onClick={() => setAccountTypeWarningOpen(false)}
                  disabled={changingAccountType}
                >
                  Keep system
                </button>
                <button
                  type="button"
                  className="btn-danger min-h-[40px] px-3 text-sm"
                  onClick={() => void updateAccountType('singlet', true)}
                  disabled={changingAccountType}
                >
                  {changingAccountType ? 'Changing...' : 'I understand, change to singlet'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      <LanguageSelector variant="card" className="card p-6 border-border bg-surface-alt/40 shadow-none" />

      <section className="card p-6" aria-labelledby="settings-profile-heading">
        <h2 id="settings-profile-heading" className="text-lg font-semibold text-text mb-1">
          Profile and avatar
        </h2>
        <p className="text-muted text-sm mb-4">
          Choose a system avatar with emoji preset or image URL, with live preview.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
          <div className="h-20 w-20 rounded-full border border-border bg-surface-alt flex items-center justify-center overflow-hidden">
            {avatarMode === 'url' && isValidAvatarImageSource(avatarUrl) ? (
              <DynamicAvatarImage src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl leading-none">{avatarEmoji || DEFAULT_AVATAR_EMOJI}</span>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label htmlFor="profile-name" className="label">Display name</label>
              <input id="profile-name" className="input" value={profileName} onChange={(e) => setProfileName(e.target.value)} maxLength={80} />
            </div>
            <div>
              <label htmlFor="profile-description" className="label">Description</label>
              <textarea id="profile-description" className="input min-h-[84px]" value={profileDescription} onChange={(e) => setProfileDescription(e.target.value)} maxLength={600} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`btn-ghost border min-h-[38px] px-3 text-sm ${avatarMode === 'emoji' ? 'border-primary/50 bg-primary/10' : 'border-border'}`} onClick={() => setAvatarMode('emoji')}>Emoji preset</button>
            <button type="button" className={`btn-ghost border min-h-[38px] px-3 text-sm ${avatarMode === 'url' ? 'border-primary/50 bg-primary/10' : 'border-border'}`} onClick={() => setAvatarMode('url')}>Image URL</button>
          </div>

          {avatarMode === 'emoji' ? (
            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((preset) => (
                <button key={preset} type="button" onClick={() => setAvatarEmoji(preset)} className={`h-10 w-10 rounded-lg border text-xl ${avatarEmoji === preset ? 'border-primary/60 bg-primary/10' : 'border-border bg-surface-alt/60'}`} aria-label={`Use ${preset} as avatar`} aria-pressed={avatarEmoji === preset}>
                  {preset}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <label htmlFor="profile-avatar-url" className="label">Avatar image URL</label>
              <input id="profile-avatar-url" type="url" className="input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarUploadRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="btn-ghost border border-border min-h-[38px] px-3 text-sm"
                >
                  {uploadingAvatar ? 'Uploading...' : 'Upload image'}
                </button>
                <p className="text-xs text-subtle">Use URL or upload a local image (max 20 MB).</p>
              </div>
              {avatarUploadError && (
                <p role="alert" className="text-xs text-error">{avatarUploadError}</p>
              )}
              <input
                ref={avatarUploadRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarFileChange}
                aria-label="Upload avatar image"
              />
            </div>
          )}
        </div>

        <button type="button" onClick={saveProfile} disabled={savingProfile} className="btn-primary mt-4 min-h-[42px]">
          {savingProfile ? 'Saving...' : 'Save profile'}
        </button>
      </section>

      <section id="appearance" className="card p-6 scroll-mt-6" aria-labelledby="settings-appearance-heading">
        <h2 id="settings-appearance-heading" className="text-lg font-semibold text-text mb-1">
          Appearance
        </h2>
        <p className="text-muted text-sm mb-4">
          Pick a theme that feels safe and comfortable for your system.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOLARA_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => updateTheme(theme.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                themeId === theme.id
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border bg-surface-alt/40 hover:bg-surface-alt/60'
              }`}
              aria-pressed={themeId === theme.id}
            >
              <p className="text-sm font-semibold text-text">{theme.label}</p>
              <p className="mt-1 text-xs text-muted">{theme.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-6 border-error/25" aria-labelledby="settings-danger-heading">
        <h2 id="settings-danger-heading" className="text-lg font-semibold text-error mb-1">
          Account recovery and deletion
        </h2>
        <p className="text-muted text-sm mb-4">
          Schedule account deletion only if you are sure. You get 72 hours to cancel before a future purge can remove data.
        </p>

        {deletionIsScheduled ? (
          <div className="rounded-xl border border-warning/45 bg-warning/10 p-4">
            <h3 className="text-sm font-semibold text-text">Deletion is scheduled</h3>
            <p className="mt-1 text-sm text-muted">
              Your account is in the recovery window. Data is still recoverable until {deletionScheduledLabel ?? 'the scheduled time'}.
            </p>
            <button
              type="button"
              onClick={cancelAccountDeletion}
              disabled={deletionBusy}
              className="btn-primary mt-3 min-h-[44px] w-full justify-center sm:w-auto"
            >
              {deletionBusy ? 'Canceling...' : 'Cancel deletion and recover account'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-error/25 bg-error/5 p-4">
            <div>
              <h3 className="text-sm font-semibold text-text">Schedule account deletion</h3>
              <p className="mt-1 text-xs text-muted">
                This starts a 72-hour recovery window. To prevent accidental deletion, type your account email before scheduling.
              </p>
            </div>

            <label className="block">
              <span className="label">Type your email to confirm</span>
              <input
                className="input"
                value={deletionConfirmEmail}
                onChange={(event) => setDeletionConfirmEmail(event.target.value)}
                placeholder={system?.email ?? 'you@example.com'}
                autoComplete="off"
              />
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-border-soft bg-surface/40 p-3 text-sm text-muted">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary"
                checked={deletionAcknowledged}
                onChange={(event) => setDeletionAcknowledged(event.target.checked)}
              />
              <span>
                I understand this schedules account deletion and I can cancel it from Settings within 72 hours.
              </span>
            </label>

            <button
              type="button"
              onClick={scheduleAccountDeletion}
              disabled={
                deletionBusy ||
                !deletionAcknowledged ||
                deletionConfirmEmail.trim().toLowerCase() !== (system?.email ?? '').toLowerCase()
              }
              className="btn-danger min-h-[48px] w-full justify-center text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletionBusy ? 'Scheduling...' : 'Schedule deletion with 72h recovery'}
            </button>
          </div>
        )}
      </section>

      <section className="card p-6" aria-labelledby="settings-session-heading">
        <h2 id="settings-session-heading" className="text-lg font-semibold text-text mb-1">
          Session
        </h2>
        <p className="text-muted text-sm mb-4">
          You can sign out safely from this device here.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="btn-danger min-h-[48px] w-full justify-center text-base font-semibold"
          aria-label="Sign out from your account"
        >
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </section>

      <section id="integrations" className="card p-6 scroll-mt-6" aria-labelledby="settings-integrations-heading">
        <h2 id="settings-integrations-heading" className="text-lg font-semibold text-text mb-1">
          Integrations
        </h2>
        <p className="text-muted text-sm mb-5">
          Preview and import members from PluralKit with encrypted token storage.
        </p>

        <section className="mb-5 rounded-xl border border-border bg-surface-alt/40 p-4">
          <div className="mb-3">
            <h3 id="sync-options-heading" className="text-base font-semibold text-text">Safe sync options</h3>
            <p className="text-sm text-muted mt-1">
              Defaults favor linking and filling blanks over overwriting local data.
            </p>
          </div>

          <div role="group" aria-labelledby="sync-options-heading" className="space-y-2">
            <SettingsToggle
              id="sync-update-existing-members"
              label="Update existing members"
              description="Fill empty local fields and link matched members."
              checked={syncOptions.updateExistingMembers}
              onChange={(checked) => setSyncOptions((prev) => ({ ...prev, updateExistingMembers: checked }))}
              disabled={Boolean(syncingProvider)}
            />

            <SettingsToggle
              id="sync-import-new-members"
              label="Import new members"
              description="Create members only when Solara finds no safe match."
              checked={syncOptions.importNewMembers}
              onChange={(checked) => setSyncOptions((prev) => ({ ...prev, importNewMembers: checked }))}
              disabled={Boolean(syncingProvider)}
            />

            <SettingsToggle
              id="sync-smart-duplicate-detection"
              label="Smart duplicate detection"
              description="Recommended. Ambiguous matches are skipped instead of guessed."
              checked={syncOptions.smartDuplicateDetection}
              onChange={(checked) => setSyncOptions((prev) => ({ ...prev, smartDuplicateDetection: checked }))}
              disabled={Boolean(syncingProvider)}
              recommended
            />

            <div className="mt-2 rounded-lg border border-border-soft bg-surface/60 p-3">
              <p className="text-sm font-medium text-text">Remote overwrites for non-empty fields</p>
              <p className="text-xs text-subtle mt-1 mb-3">
                Leave these off unless you want remote data to replace local edits.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SYNC_FIELD_OVERRIDE_ROWS.map((field) => (
                  <SettingsToggle
                    key={field.key}
                    id={`sync-override-${field.key}`}
                    label={field.label}
                    checked={syncOptions.overrides[field.key]}
                    onChange={(checked) => setSyncOptions((prev) => ({
                      ...prev,
                      overrides: {
                        ...prev.overrides,
                        [field.key]: checked,
                      },
                    }))}
                    disabled={Boolean(syncingProvider) || !syncOptions.updateExistingMembers}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4">
          <section className="rounded-xl border border-border bg-surface-alt/40 p-4" aria-labelledby="pluralkit-sync-heading">
            <h3 id="pluralkit-sync-heading" className="text-base font-semibold text-text">PluralKit</h3>
            <label className="mt-3 block">
              <span className="label">System token</span>
              <input
                className="input"
                type="password"
                value={pluralKitToken}
                onChange={(event) => setPluralKitToken(event.target.value)}
                placeholder="pk;token"
                autoComplete="off"
              />
            </label>

            <p className="mt-2 text-xs text-subtle">
              Tokens are stored encrypted on the server and never returned to the browser.
            </p>

            {hasSavedPluralKitToken && (
              <p className="mt-2 text-xs text-success">
                Saved token detected for this account. You can run Preview/Apply after refresh without retyping.
              </p>
            )}

            {pluralKitConnection.hasLinkedMembers && (
              <div className="mt-3 rounded-lg border border-success/35 bg-success/10 px-3 py-2">
                <p className="text-xs text-text">
                  PluralKit linked ({pluralKitConnection.linkedMembers} member{pluralKitConnection.linkedMembers === 1 ? '' : 's'} connected).
                </p>
                <p className="mt-1 text-xs text-muted">
                  Token value stays hidden in UI by design.
                  {pluralKitConnection.lastSyncedAt ? ` Last sync: ${formatDateTime(pluralKitConnection.lastSyncedAt)}.` : ''}
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleMemberSync('pluralkit', false)}
                disabled={Boolean(syncingProvider)}
                className="btn-ghost min-h-[42px] border border-border px-3 text-sm"
              >
                {syncingProvider === 'pluralkit' ? 'Checking...' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={() => void handleMemberSync('pluralkit', true)}
                disabled={Boolean(syncingProvider)}
                className="btn-primary min-h-[42px] px-3 text-sm"
              >
                {syncingProvider === 'pluralkit' ? 'Syncing...' : 'Apply sync'}
              </button>
            </div>
          </section>
        </div>

        {lastSyncResult && (
          <section
            className="mt-4 rounded-xl border border-border-soft bg-surface-alt/40 p-4"
            aria-label="Latest integration sync summary"
          >
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-text">
                Latest PluralKit {lastSyncResult.applied ? 'sync' : 'preview'}
              </h3>
              {lastSyncResult.remoteSystemId && (
                <p className="text-xs text-subtle">Remote system: {lastSyncResult.remoteSystemId}</p>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
              <SummaryStat label="Fetched" value={lastSyncResult.summary.fetched} />
              <SummaryStat label="Create" value={lastSyncResult.summary.create} />
              <SummaryStat label="Update" value={lastSyncResult.summary.update} />
              <SummaryStat label="Link" value={lastSyncResult.summary.link} />
              <SummaryStat label="Skip" value={lastSyncResult.summary.skip} />
              <SummaryStat label="Unchanged" value={lastSyncResult.summary.unchanged} />
            </dl>

            {lastSyncResult.applied && lastSyncResult.frontSync && (
              <p className="mt-3 rounded-lg border border-front/30 bg-front/10 px-3 py-2 text-xs text-text">
                {frontSyncSummaryLabel(lastSyncResult.frontSync)}
              </p>
            )}

            {lastSyncResult.operations.length > 0 && (
              <ul className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                {lastSyncResult.operations.map((operation) => (
                  <li
                    key={`${operation.provider}:${operation.externalId}:${operation.action}`}
                    className="rounded-lg border border-border-soft bg-surface/70 p-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={syncActionClassName(operation.action)}>
                        {syncActionLabel(operation.action)}
                      </span>
                      <span className="font-medium text-text">{operation.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {syncReasonLabel(operation.reason)}
                      {operation.changedFields.length > 0 ? ` - ${operation.changedFields.join(', ')}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </section>

      {/* ── Data Import / Export ─────────────────────────────────── */}
      <section id="data" className="card p-6 scroll-mt-6" aria-labelledby="settings-data-heading">
        <h2 id="settings-data-heading" className="text-lg font-semibold text-text mb-1">Data</h2>
        <p className="text-muted text-sm mb-5">
          Export all your system data as a JSON file, or import members from a JSON file.
        </p>

        <section className="mb-5 rounded-xl border border-border bg-surface-alt/40 p-4">
          <div className="mb-3">
            <h3 id="import-options-heading" className="text-base font-semibold text-text">Import options</h3>
            <p className="text-sm text-muted mt-1">
              Choose how Solara should merge members to reduce duplicate headaches.
            </p>
          </div>

          <div role="group" aria-labelledby="import-options-heading" className="space-y-2">
            <SettingsToggle
              id="update-existing-members"
              label="Update existing members"
              description="Apply selected field overrides when a member already exists."
              checked={importOptions.updateExistingMembers}
              onChange={(checked) => setImportOptions((prev) => ({ ...prev, updateExistingMembers: checked }))}
              disabled={importing || exporting}
            />

            <SettingsToggle
              id="import-new-members"
              label="Import new members"
              description="Create members that are not currently in your system."
              checked={importOptions.importNewMembers}
              onChange={(checked) => setImportOptions((prev) => ({ ...prev, importNewMembers: checked }))}
              disabled={importing || exporting}
            />

            <SettingsToggle
              id="smart-duplicate-detection"
              label="Smart duplicate detection"
              description="Recommended. Uses safer matching so similar entries are skipped instead of duplicated."
              checked={importOptions.smartDuplicateDetection}
              onChange={(checked) => setImportOptions((prev) => ({ ...prev, smartDuplicateDetection: checked }))}
              disabled={importing || exporting}
              recommended
            />

            <div className="mt-2 rounded-lg border border-border-soft bg-surface/60 p-3">
              <p className="text-sm font-medium text-text">Field overrides for existing members</p>
              <p className="text-xs text-subtle mt-1 mb-3">
                Pick which fields can be overwritten during updates.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FIELD_OVERRIDE_ROWS.map((field) => (
                  <SettingsToggle
                    key={field.key}
                    id={`override-${field.key}`}
                    label={field.label}
                    checked={importOptions.overrides[field.key]}
                    onChange={(checked) => setImportOptions((prev) => ({
                      ...prev,
                      overrides: {
                        ...prev.overrides,
                        [field.key]: checked,
                      },
                    }))}
                    disabled={importing || exporting || !importOptions.updateExistingMembers}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 mt-5">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || importing}
            className="btn-ghost border border-border min-w-[132px] justify-center"
          >
            {exporting ? 'Exporting...' : 'Download export'}
          </button>
          <button
            type="button"
            onClick={() => { if (!importing && !exporting) fileRef.current?.click(); }}
            disabled={importing || exporting}
            className="btn-ghost border border-border min-w-[132px] justify-center"
          >
            {importing ? 'Importing...' : 'Import members'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={handleImport}
            aria-label="Choose JSON file to import members"
          />
        </div>

        {status && (
          <>
            <div aria-live="polite" aria-atomic="true">
              {status.type !== 'error' && (
                <p role="status" className={`text-sm mt-3 ${status.type === 'success' ? 'text-success' : 'text-muted'}`}>
                  {status.message}
                </p>
              )}
            </div>
            <div aria-live="assertive" aria-atomic="true">
              {status.type === 'error' && (
                <p role="alert" className="text-sm mt-3 text-error">
                  {status.message}
                </p>
              )}
            </div>
          </>
        )}

        {lastImportSummary && (
          <section
            className="mt-4 rounded-xl border border-border-soft bg-surface-alt/40 p-4"
            aria-label="Latest import summary"
          >
            <h3 className="text-sm font-semibold text-text mb-3">Latest import summary</h3>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <SummaryStat label="Imported" value={lastImportSummary.imported} />
              <SummaryStat label="Updated" value={lastImportSummary.updated} />
              <SummaryStat label="Skipped" value={lastImportSummary.skipped} />
              <SummaryStat label="Duplicates detected" value={lastImportSummary.duplicatesDetected} />
            </dl>
          </section>
        )}
      </section>

      {/* ── About ───────────────────────────────────────────────── */}
      <section className="card p-6" aria-labelledby="settings-about-heading">
        <h2 id="settings-about-heading" className="text-lg font-semibold text-text mb-2">
          About Solara Plural
        </h2>
        <p className="text-muted text-sm">
          A warm, open-source space for plural systems. Built with care.
        </p>
        <p className="text-subtle text-xs mt-2">v0.1.0 — MVP alpha</p>
      </section>
    </div>
  );
}

type FieldOverrideKey = keyof ImportOverrides;

const FIELD_OVERRIDE_ROWS: Array<{ key: FieldOverrideKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'pronouns', label: 'Pronouns' },
  { key: 'description', label: 'Description' },
  { key: 'avatar', label: 'Avatar' },
  { key: 'color', label: 'Color' },
  { key: 'role', label: 'Role' },
  { key: 'tags', label: 'Tags' },
  { key: 'notes', label: 'Notes' },
];

type SyncFieldOverrideKey = keyof SyncOverrides;

const SYNC_FIELD_OVERRIDE_ROWS: Array<{ key: SyncFieldOverrideKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'pronouns', label: 'Pronouns' },
  { key: 'description', label: 'Description' },
  { key: 'avatarUrl', label: 'Avatar' },
  { key: 'color', label: 'Color' },
  { key: 'role', label: 'Role' },
  { key: 'tags', label: 'Tags' },
  { key: 'notes', label: 'Notes' },
];

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-soft bg-surface/70 p-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-base font-semibold text-text leading-tight mt-1">{value}</dd>
    </div>
  );
}

type SettingsToggleProps = {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  recommended?: boolean;
  compact?: boolean;
};

function SettingsToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  recommended = false,
  compact = false,
}: SettingsToggleProps) {
  return (
    <label
      className={`group flex w-full items-start justify-between gap-3 rounded-lg border border-border-soft bg-surface/40 px-3 transition-all duration-150 ${
        compact ? 'py-2' : 'py-2.5'
      } ${
        disabled
          ? 'cursor-not-allowed opacity-55'
          : 'cursor-pointer hover:border-border hover:bg-surface/60'
      }`}
    >
      <span className="flex-1 min-h-11">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">{label}</span>
          {recommended && (
            <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary-glow">
              Recommended
            </span>
          )}
        </span>
        {description && <span className="mt-1 block text-xs text-muted">{description}</span>}
      </span>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-11 min-w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-full"
      >
        <span
          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-150 ${
            checked
              ? 'border-primary/60 bg-primary-soft/50'
              : 'border-border bg-surface-alt'
          }`}
          aria-hidden="true"
        >
          <span
            className={`absolute left-0.5 h-5 w-5 rounded-full shadow-sm transition-transform duration-150 ${
              checked ? 'translate-x-5 bg-primary-glow' : 'translate-x-0 bg-text'
            }`}
          />
        </span>
      </button>
    </label>
  );
}

function toImportSummary(data: ImportSuccessData): ImportSummary {
  const imported = asCount(data.imported);
  const updated = asCount(data.updated ?? 0);
  const skipped = asCount(data.skipped);
  const duplicatesDetected = asCount(data.duplicatesDetected ?? skipped);

  return { imported, updated, skipped, duplicatesDetected };
}

function createImportSummaryMessage(summary: ImportSummary): string {
  const parts: string[] = [];

  if (summary.imported > 0) {
    parts.push(`Imported ${summary.imported} member${summary.imported === 1 ? '' : 's'}`);
  }

  if (summary.updated > 0) {
    parts.push(`updated ${summary.updated}`);
  }

  if (summary.skipped > 0) {
    parts.push(`skipped ${summary.skipped}`);
  }

  if (summary.duplicatesDetected > 0) {
    parts.push(`detected ${summary.duplicatesDetected} duplicate${summary.duplicatesDetected === 1 ? '' : 's'}`);
  }

  if (parts.length === 0) {
    return 'Import finished. Nothing changed this time.';
  }

  return `${parts.join(' · ')}.`;
}

function toApiSyncOptions(options: SyncOptions) {
  return {
    updateExistingMembers: options.updateExistingMembers,
    importNewMembers: options.importNewMembers,
    dedupeMode: options.smartDuplicateDetection ? 'smart' : 'strict',
    overrideFields: options.overrides,
  };
}

function createSyncSummaryMessage(summary: SyncSummary, applied: boolean): string {
  const verb = applied ? 'Sync applied' : 'Preview ready';
  return `${verb}: ${summary.create} create, ${summary.update} update, ${summary.link} link, ${summary.skip} skip.`;
}

function frontSyncSummaryLabel(frontSync: NonNullable<SyncResult['frontSync']>): string {
  if (frontSync.status === 'started') {
    return `Front synced with ${frontSync.appliedMemberCount} member${frontSync.appliedMemberCount === 1 ? '' : 's'}.`;
  }

  if (frontSync.status === 'ended') {
    return 'Front ended because PluralKit currently has no fronters.';
  }

  if (frontSync.status === 'unchanged') {
    return 'Front already matched PluralKit.';
  }

  return 'Front sync was skipped (missing local links for current fronters).';
}

function syncActionLabel(action: SyncOperationPreview['action']): string {
  const labels: Record<SyncOperationPreview['action'], string> = {
    create: 'Create',
    update: 'Update',
    link: 'Link',
    skip: 'Skip',
    unchanged: 'Same',
  };
  return labels[action];
}

function syncActionClassName(action: SyncOperationPreview['action']): string {
  const base = 'rounded-full border px-2 py-0.5 text-[11px] font-semibold';
  if (action === 'create') return `${base} border-success/40 bg-success/10 text-success`;
  if (action === 'update') return `${base} border-primary/40 bg-primary/10 text-primary-glow`;
  if (action === 'link') return `${base} border-front/40 bg-front/10 text-front`;
  if (action === 'skip') return `${base} border-warning/40 bg-warning/10 text-warning`;
  return `${base} border-border bg-surface-alt text-muted`;
}

function syncReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    'external-link': 'Matched by saved external link',
    'cross-provider-link': 'Matched by external identity link',
    dedupe: 'Matched by duplicate detection',
    matched: 'Matched existing member',
    new_external_member: 'New external member',
    invalid_external_member: 'Skipped invalid remote member',
    duplicate_external_id: 'Skipped duplicate remote ID',
    ambiguous_source_name: 'Skipped ambiguous remote duplicate',
    ambiguous_existing_match: 'Skipped ambiguous local match',
    new_members_disabled: 'Skipped because new members are disabled',
  };

  return labels[reason] ?? reason.replace(/_/g, ' ');
}

function buildImportPayload(data: unknown, importOptions: ImportOptions): ImportEnvelope {
  if (Array.isArray(data)) {
    return {
      members: data,
      importOptions,
    };
  }

  if (isRecord(data) && Array.isArray(data.members)) {
    return {
      ...data,
      members: data.members,
      importOptions,
    };
  }

  return {
    members: [],
    importOptions,
  };
}

function isAcceptedImportShape(data: unknown): boolean {
  if (Array.isArray(data)) return true;
  return isRecord(data) && Array.isArray(data.members);
}

function readStoredImportOptions(): ImportOptions | null {
  try {
    const raw = localStorage.getItem(IMPORT_OPTIONS_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    return {
      updateExistingMembers: asBoolean(parsed.updateExistingMembers, DEFAULT_IMPORT_OPTIONS.updateExistingMembers),
      importNewMembers: asBoolean(parsed.importNewMembers, DEFAULT_IMPORT_OPTIONS.importNewMembers),
      smartDuplicateDetection: asBoolean(parsed.smartDuplicateDetection, DEFAULT_IMPORT_OPTIONS.smartDuplicateDetection),
      overrides: sanitizeOverrides(parsed.overrides),
    };
  } catch {
    return null;
  }
}

function sanitizeOverrides(value: unknown): ImportOverrides {
  if (!isRecord(value)) return DEFAULT_IMPORT_OPTIONS.overrides;

  return {
    name: asBoolean(value.name, DEFAULT_IMPORT_OPTIONS.overrides.name),
    pronouns: asBoolean(value.pronouns, DEFAULT_IMPORT_OPTIONS.overrides.pronouns),
    description: asBoolean(value.description, DEFAULT_IMPORT_OPTIONS.overrides.description),
    avatar: asBoolean(value.avatar, DEFAULT_IMPORT_OPTIONS.overrides.avatar),
    color: asBoolean(value.color, DEFAULT_IMPORT_OPTIONS.overrides.color),
    role: asBoolean(value.role, DEFAULT_IMPORT_OPTIONS.overrides.role),
    tags: asBoolean(value.tags, DEFAULT_IMPORT_OPTIONS.overrides.tags),
    notes: asBoolean(value.notes, DEFAULT_IMPORT_OPTIONS.overrides.notes),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'the scheduled time';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toAccountType(value: unknown): 'system' | 'singlet' {
  return value === 'singlet' ? 'singlet' : 'system';
}

function toAvatarMode(value: unknown): AvatarMode {
  return value === 'url' ? 'url' : 'emoji';
}

function isValidAvatarImageSource(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(trimmed)) return true;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function readJsonResponse<T = unknown>(res: Response): Promise<ApiResponse<T>> {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (res.status === 401) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }
    if (res.status === 413) {
      return { success: false, error: 'Image payload is too large. Try a smaller image.' };
    }
    return { success: false, error: `Unexpected server response (HTTP ${res.status}). Please try again.` };
  }

  return res.json();
}

async function readErrorMessage(res: Response, fallback: string) {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return fallback;

  const body = await res.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}


