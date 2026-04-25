import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authConfig } from './edge-config';

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

        return {
          id: system.id,
          name: system.name,
          email: system.email,
        };
      },
    }),
  ],
});
