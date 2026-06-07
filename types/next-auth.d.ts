import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    accountType?: 'system' | 'singlet';
    isAdmin?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      accountType?: 'system' | 'singlet';
      isAdmin?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    systemId?: string;
    accountType?: 'system' | 'singlet';
    isAdmin?: boolean;
  }
}
