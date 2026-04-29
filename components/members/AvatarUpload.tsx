'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

interface AvatarUploadProps {
  currentUrl?: string | null;
  memberColor: string;
  memberName: string;
  onUpload: (url: string) => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

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

  function triggerFilePicker() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);

    // Client-side size guard
    if (file.size > MAX_FILE_BYTES) {
      setError('File is too large — max 10 MB.');
      // Reset input so the same file can be re-selected after fixing
      e.target.value = '';
      return;
    }

    // Optimistic local preview while uploading
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: form });

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }

      const json = (await res.json()) as { success: boolean; data: { url: string } };
      setPreviewUrl(json.data.url);
      onUpload(json.data.url);
    } catch {
      // Revert preview on failure
      setPreviewUrl(currentUrl ?? null);
      setError('Upload failed — try again?');
    } finally {
      setIsUploading(false);
      // Clear input so re-selecting the same file fires onChange again
      e.target.value = '';
    }
  }

  const initial = memberName[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle — clickable */}
      <button
        type="button"
        onClick={triggerFilePicker}
        disabled={isUploading}
        aria-label={`${previewUrl ? 'Change' : 'Upload'} avatar photo for ${memberName}`}
        className={`
          relative w-24 h-24 rounded-full flex-shrink-0 overflow-hidden
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg
          transition-all duration-150
          ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}
          group
        `}
        style={!previewUrl ? { backgroundColor: memberColor } : undefined}
      >
        {/* Image or initial */}
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={`${memberName}'s avatar`}
            width={96}
            height={96}
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

        {/* Hover overlay — camera icon */}
        {!isUploading && (
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

        {/* Upload spinner overlay */}
        {isUploading && (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"
          >
            <span
              className="w-8 h-8 rounded-full border-2 border-surface border-t-primary animate-spin"
            />
          </span>
        )}
      </button>

      {/* Upload button label — secondary affordance for discoverability */}
      <button
        type="button"
        onClick={triggerFilePicker}
        disabled={isUploading}
        className="text-sm text-primary hover:text-primary/80 transition-colors duration-150 focus-visible:outline-none focus-visible:underline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? 'Uploading…' : previewUrl ? 'Change photo' : 'Upload photo'}
      </button>

      {/* Error message */}
      {error && (
        <p role="alert" className="text-xs text-error text-center max-w-[160px]">
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
