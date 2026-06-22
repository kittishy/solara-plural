"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

// Lightweight, dependency-free toast for transient action feedback (e.g. a
// failed save). Notification pushes use the separate NotificationToast at the
// top of the screen; these action toasts sit just above the tab bar so the two
// never collide.

export type ToastType = "error" | "success" | "info";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_TTL_MS = 4_000;
const MAX_VISIBLE = 3;

const ICONS: Record<ToastType, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const ACCENTS: Record<ToastType, string> = {
  error: "var(--ios-red, #ff3b30)",
  success: "var(--ios-green, #34c759)",
  info: "var(--ios-blue)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    const trimmed = message?.trim();
    if (!trimmed) return;
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message: trimmed, type }].slice(-MAX_VISIBLE));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_TTL_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 pointer-events-none w-[min(420px,calc(100%-1.5rem))]"
          style={{ bottom: "calc(env(safe-area-inset-bottom,0px) + 92px)" }}
          aria-live="assertive"
          role="status"
        >
          {toasts.map((toast) => {
            const Icon = ICONS[toast.type];
            return (
              <button
                key={toast.id}
                type="button"
                onClick={() => dismiss(toast.id)}
                className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-ios-xl text-left ios-press animate-fade-in w-full"
                style={{
                  background: "var(--tabbar-bg)",
                  backdropFilter: "blur(40px) saturate(200%)",
                  WebkitBackdropFilter: "blur(40px) saturate(200%)",
                  border: "1px solid var(--tabbar-border)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                }}
              >
                <Icon size={18} className="mt-0.5 flex-shrink-0" style={{ color: ACCENTS[toast.type] }} />
                <p className="flex-1 min-w-0 text-subheadline font-medium text-foreground">
                  {toast.message}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
