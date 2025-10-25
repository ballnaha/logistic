import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // ค้นหา user จากฐานข้อมูล
          const user = await prisma.user.findUnique({
            where: {
              username: credentials.username,
            },
            select: {
              id: true,
              username: true,
              password: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
            },
          });

          if (!user) {
            return null;
          }

          // ตรวจสอบว่า user ยังใช้งานอยู่หรือไม่
          if (!user.isActive) {
            return null;
          }

          // ตรวจสอบ password
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            return null;
          }

          // อัปเดต lastLogin
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          // ส่งคืนข้อมูล user (ไม่รวม password)
          return {
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            role: user.role,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
