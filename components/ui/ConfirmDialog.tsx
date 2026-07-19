"use client";

import { BottomSheet } from "@/components/glass/BottomSheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Body copy. Defaults to the generic "this can't be undone" line. */
  description?: string;
  /** Confirm button label. Defaults to common.yes ("Yes, delete"). */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). Defaults to true. */
  destructive?: boolean;
  /** In-flight state — disables buttons and swaps in a loading label. */
  loading?: boolean;
  loadingLabel?: string;
}

/**
 * ConfirmDialog — a single, consistent confirmation modal for destructive or
 * irreversible actions. Replaces both the copy-pasted inline confirm sheets in
 * the editors and the native `window.confirm()` popups, so every "are you
 * sure?" across the app looks and behaves the same.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  loading = false,
  loadingLabel,
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <p className="text-body text-foreground">
          {description ?? t("common.irreversible")}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
            className="w-full"
          >
            {loading ? loadingLabel ?? t("common.deleting") : confirmLabel ?? t("common.yes")}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full">
            {cancelLabel ?? t("common.cancel")}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
