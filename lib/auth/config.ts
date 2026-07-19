import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authConfig } from './edge-config';
import { isAdminEmail } from './admin-allowlist';
import { consumeDurableRateLimit, getClientIp } from '@/lib/rate-limit';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();

        // Brute-force protection (docs/SYSTEM_DESIGN.md §4): durable limits
        // shared across serverless instances, checked BEFORE the bcrypt
        // compare so blocked attempts stay cheap. Returning null surfaces the
        // same generic invalid-credentials UI — no lockout oracle.
        const [ipLimit, emailLimit] = await Promise.all([
          consumeDurableRateLimit(`login:ip:${getClientIp(request)}`, {
            limit: 30,
            windowMs: 15 * 60_000,
          }),
          consumeDurableRateLimit(`login:email:${email}`, {
            limit: 10,
            windowMs: 15 * 60_000,
          }),
        ]);
        if (!ipLimit.allowed || !emailLimit.allowed) return null;

        const system = await db.query.systems.findFirst({
          where: eq(systems.email, email),
        });

        if (!system) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          system.passwordHash
        );

        if (!valid) return null;

        // Suspended accounts cannot sign in. Returning null blocks the login
        // the same way invalid credentials do, without risking an auth-layer
        // 500 from a thrown error in the beta credentials flow.
        if (system.suspendedAt) return null;

        return {
          id: system.id,
          name: system.name,
          email: system.email,
          accountType: system.accountType === 'singlet' ? 'singlet' : 'system',
          // Admin access is locked to the hardcoded owner email only.
          isAdmin: isAdminEmail(system.email),
        };
      },
    }),
  ],
});
