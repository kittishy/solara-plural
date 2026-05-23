"use client";

import { useRef, useState } from "react";
import { Camera, Link as LinkIcon, Upload, X } from "lucide-react";
import { prepareAvatarDataUrl } from "@/lib/client/avatar-upload";
import DynamicAvatarImage from "@/components/ui/DynamicAvatarImage";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  currentUrl?: string | null;
  memberColor: string;
  memberName: string;
  onUpload: (url: string) => void;
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function AvatarUpload({
  currentUrl,
  memberColor,
  memberName,
  onUpload,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initial = (memberName?.trim()?.[0] ?? "?").toUpperCase();

  async function handleFile(file: File) {
    setError("");
    if (file.size > MAX_FILE_BYTES) {
      setError("Arquivo muito grande (máx. 20MB).");
      return;
    }
    setLoading(true);
    try {
      const dataUrl = await prepareAvatarDataUrl(file);
      onUpload(dataUrl);
    } catch {
      setError("Falha ao processar imagem.");
    } finally {
      setLoading(false);
    }
  }

  function handleUrlSubmit() {
    setError("");
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setError("Insira uma URL.");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setError("URL inválida.");
      return;
    }
    onUpload(trimmed);
    setUrlInput("");
  }

  function clearAvatar() {
    onUpload("");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Preview circle */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="relative group w-24 h-24 rounded-full overflow-hidden ios-press ios-transition shadow-ios-md disabled:opacity-60"
          style={{
            background: currentUrl
              ? "transparent"
              : `${memberColor}22`,
          }}
          aria-label="Trocar avatar"
        >
          {currentUrl ? (
            <DynamicAvatarImage
              src={currentUrl}
              alt={memberName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-3xl font-bold"
              style={{ color: memberColor }}
            >
              {initial}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 ios-transition flex items-center justify-center">
            <Camera size={22} className="text-white" />
          </div>

          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        <div className="flex flex-col gap-2">
          {currentUrl && (
            <button
              type="button"
              onClick={clearAvatar}
              className="text-subheadline text-ios-red ios-press inline-flex items-center gap-1.5"
            >
              <X size={14} />
              Remover
            </button>
          )}
          <div className="flex gap-1 rounded-ios-sm bg-secondary p-0.5">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={cn(
                "px-3 py-1 text-caption-1 font-semibold rounded-ios-xs ios-transition",
                mode === "upload"
                  ? "bg-white dark:bg-ios-gray-3/30 text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <Upload size={11} className="inline mr-1" />
              Arquivo
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={cn(
                "px-3 py-1 text-caption-1 font-semibold rounded-ios-xs ios-transition",
                mode === "url"
                  ? "bg-white dark:bg-ios-gray-3/30 text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <LinkIcon size={11} className="inline mr-1" />
              URL
            </button>
          </div>
        </div>
      </div>

      {mode === "upload" && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      )}

      {mode === "url" && (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 h-10 px-3 rounded-ios-sm bg-[var(--ios-bg-secondary)] text-body focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="h-10 px-4 rounded-ios-sm bg-ios-blue text-white text-subheadline font-semibold ios-press"
          >
            Usar
          </button>
        </div>
      )}

      {error && (
        <p className="text-caption-1 text-ios-red">{error}</p>
      )}
    </div>
  );
}
