import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.systemId = user.id;
        token.accountType = user.accountType === 'singlet' ? 'singlet' : 'system';
        token.isAdmin = user.isAdmin === true;
      }
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
