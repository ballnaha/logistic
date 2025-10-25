import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    username: string;
    role: string;
  }

  interface JWT {
    username: string;
    role: string;
  }
}
