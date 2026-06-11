import type { NextAuthConfig } from 'next-auth';
import { isAdminEmail } from './admin-allowlist';

export const authConfig = {
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.systemId = user.id;
        token.accountType = user.accountType === 'singlet' ? 'singlet' : 'system';
      }
      // Always re-derive isAdmin from the token email so sessions created
      // before this field was introduced still get the correct value.
      token.isAdmin = isAdminEmail(token.email);
      return token;
    },
    async session({ session, token }) {
      if (token.systemId) {
        session.user.id = token.systemId as string;
      }
      session.user.accountType = (token.accountType as 'system' | 'singlet' | undefined) ?? 'system';
      session.user.isAdmin = token.isAdmin === true;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  providers: [],
} satisfies NextAuthConfig;
