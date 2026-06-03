"use client";

import type { Session } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  // Seeded from the server so `useSession()` resolves synchronously on the
  // first client render — no loading flash, and the SWR cache provider knows
  // the user id immediately (avoids a remount on cold load).
  session?: Session | null;
}) {
  return (
    <NextAuthSessionProvider session={session}>{children}</NextAuthSessionProvider>
  );
}
