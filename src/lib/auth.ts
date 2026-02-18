/**
 * NextAuth.js v5 Configuration
 * Supports OAuth (Google, GitHub) and email/password credentials
 */

import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import {
  recordFailedAttempt,
  requiresCaptcha,
  clearFailedAttempts,
  verifyHCaptcha,
} from '@/lib/captcha-tracker';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/settings',
    error: '/auth/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        captchaToken: { label: 'CAPTCHA Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const captchaToken = credentials.captchaToken as string | undefined;
        const emailLower = email.toLowerCase();

        // Check if CAPTCHA is required
        const needsCaptcha = requiresCaptcha(emailLower);

        if (needsCaptcha) {
          // Verify CAPTCHA token
          if (!captchaToken) {
            throw new Error('CAPTCHA verification required');
          }

          const captchaValid = await verifyHCaptcha(captchaToken);
          if (!captchaValid) {
            throw new Error('CAPTCHA verification failed');
          }
        }

        const user = await prisma.user.findUnique({
          where: { email: emailLower },
        });

        if (!user || !user.password) {
          // Record failed attempt
          recordFailedAttempt(emailLower);
          throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          // Record failed attempt
          recordFailedAttempt(emailLower);
          throw new Error('Invalid email or password');
        }

        // Clear failed attempts on successful login
        clearFailedAttempts(emailLower);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Create default settings for new users
      if (user.id) {
        await prisma.userSettings.create({
          data: {
            userId: user.id,
            llmModel: 'gpt-4o-mini',
            discountThreshold: 50,
            autoAnalyze: true,
          },
        });
      }
    },
  },
});

/**
 * Get the current authenticated user from the session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

/**
 * Get the current authenticated user ID
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Require authentication - throws error if not authenticated
 * Use in API routes that require authentication
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Extend the NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth' {
  interface JWT {
    id?: string;
  }
}
