'use client';

import { useRef, useState } from 'react';
import DynamicAvatarImage from '@/components/ui/DynamicAvatarImage';
import { prepareAvatarDataUrl } from '@/lib/client/avatar-upload';

interface AvatarUploadProps {
  currentUrl?: string | null;
  memberColor: string;
  memberName: string;
  onUpload: (url: string) => void;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

type Mode = 'upload' | 'url';

export default function AvatarUpload({
  currentUrl,
  memberColor,
  memberName,
  onUpload,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('upload');
  const [urlInput, setUrlInput] = useState('');

  function triggerFilePicker() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_FILE_BYTES) {
      setError('File is too large - max 20 MB.');
      e.target.value = '';
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    try {
      const dataUrl = await prepareAvatarDataUrl(file);
      setPreviewUrl(dataUrl);
      onUpload(dataUrl);
    } catch {
      setPreviewUrl(currentUrl ?? null);
      setError('Upload failed — try again?');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  function handleUrlApply() {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setError('Please enter a URL.');
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setError('Invalid URL — paste a full URL starting with https://');
      return;
    }
    setError(null);
    setPreviewUrl(trimmed);
    onUpload(trimmed);
    setUrlInput('');
    setMode('upload');
  }

  function handleUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUrlApply();
    }
  }

  const initial = memberName[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <button
        type="button"
        onClick={mode === 'upload' ? triggerFilePicker : undefined}
        disabled={isUploading || mode === 'url'}
        aria-label={`${previewUrl ? 'Change' : 'Upload'} avatar photo for ${memberName}`}
        className={`
          relative w-24 h-24 rounded-full flex-shrink-0 overflow-hidden
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg
          transition-all duration-150
          ${isUploading || mode === 'url' ? 'cursor-default' : 'cursor-pointer'}
          group
        `}
        style={!previewUrl ? { backgroundColor: memberColor } : undefined}
      >
        {previewUrl ? (
          <DynamicAvatarImage src={previewUrl}
            alt={`${memberName}'s avatar`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="w-full h-full flex items-center justify-center text-4xl font-bold text-bg select-none"
            aria-hidden
          >
            {initial}
          </span>
        )}

        {!isUploading && mode === 'upload' && (
          <span
            aria-hidden
            className="
              absolute inset-0 flex items-center justify-center
              bg-black/50 opacity-0 group-hover:opacity-100
              transition-opacity duration-150
              rounded-full
            "
          >
            <CameraIcon className="w-7 h-7 text-white drop-shadow" />
          </span>
        )}

        {isUploading && (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"
          >
            <span className="w-8 h-8 rounded-full border-2 border-surface border-t-primary animate-spin" />
          </span>
        )}
      </button>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 text-xs rounded-full bg-surface-alt p-0.5">
        <button
          type="button"
          onClick={() => { setMode('upload'); setError(null); }}
          className={`px-3 py-1 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary
            ${mode === 'upload' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => { setMode('url'); setError(null); }}
          className={`px-3 py-1 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary
            ${mode === 'url' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}
        >
          URL
        </button>
      </div>

      {/* Upload mode affordance */}
      {mode === 'upload' && (
        <button
          type="button"
          onClick={triggerFilePicker}
          disabled={isUploading}
          className="text-sm text-primary hover:text-primary/80 transition-colors duration-150 focus-visible:outline-none focus-visible:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Uploading…' : previewUrl ? 'Change photo' : 'Upload photo'}
        </button>
      )}

      {/* URL mode input */}
      {mode === 'url' && (
        <div className="flex gap-2 w-full max-w-xs">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="https://example.com/image.png"
            className="input text-sm flex-1 min-w-0"
            aria-label="Avatar image URL"
            autoFocus
          />
          <button
            type="button"
            onClick={handleUrlApply}
            className="btn-primary text-sm px-3 py-1.5 whitespace-nowrap"
          >
            Apply
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p role="alert" className="text-xs text-error text-center max-w-xs">
          {error}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label={`Avatar image file for ${memberName}`}
        className="sr-only"
        onChange={handleFileChange}
        tabIndex={-1}
      />
    </div>
  );
}

// Inline SVG camera icon — no external dependency
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
