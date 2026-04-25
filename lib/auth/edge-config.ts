import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.systemId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.systemId) {
        session.user.id = token.systemId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  providers: [],
} satisfies NextAuthConfig;
