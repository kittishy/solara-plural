import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authConfig } from './edge-config';
import { isAdminEmail } from './admin-allowlist';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const system = await db.query.systems.findFirst({
          where: eq(systems.email, credentials.email as string),
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
