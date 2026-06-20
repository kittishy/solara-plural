"use client";

// Catches errors thrown by the root layout itself. This replaces the entire
// document (it must render its own <html>/<body>), so it can't rely on app
// providers or global CSS — everything here is inline and self-contained.

import { useEffect } from "react";
import { isChunkLoadError, attemptChunkReload } from "@/lib/chunk-recovery";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      attemptChunkReload();
    }
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#f2f2f7",
          color: "#1c1c1e",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 9999,
            background: "rgba(255,59,48,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
          }}
          aria-hidden
        >
          ⚠️
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#636366",
            margin: 0,
            maxWidth: 320,
          }}
        >
          The app ran into a problem. Try again, or reload.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "100%",
            maxWidth: 320,
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              height: 48,
              borderRadius: 16,
              border: "none",
              background: "#007aff",
              color: "#fff",
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            style={{
              height: 48,
              borderRadius: 16,
              border: "none",
              background: "#e5e5ea",
              color: "#1c1c1e",
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
