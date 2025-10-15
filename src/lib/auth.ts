import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] Authorize: Missing credentials.');
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });

        if (user && (await bcrypt.compare(credentials.password, user.password))) {
          console.log('[AUTH] Authorize successful, returning user:', { id: user.id.toString(), email: user.email });
          return { id: user.id.toString(), email: user.email };
        } else {
          console.log('[AUTH] Authorize failed: Invalid credentials.');
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      console.log('[AUTH] JWT Callback - Initial token:', JSON.stringify(token, null, 2));
      console.log('[AUTH] JWT Callback - User object (from authorize):', JSON.stringify(user, null, 2));
      if (user) {
        token.id = user.id;
      }
      console.log('[AUTH] JWT Callback - Final token:', JSON.stringify(token, null, 2));
      return token;
    },
    session({ session, token }) {
      console.log('[AUTH] Session Callback - Initial session:', JSON.stringify(session, null, 2));
      console.log('[AUTH] Session Callback - Token:', JSON.stringify(token, null, 2));
      
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
        },
      };
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
