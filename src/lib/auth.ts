// auth.ts
import bcrypt from 'bcryptjs';
import { AuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';

import { prisma } from '@/lib/prisma';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        name: { label: 'Name', type: 'text', placeholder: 'Your name' },
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Handle registration if name is provided
        if (credentials?.name) {
          return handleRegistration(credentials);
        }
        
        // Handle login
        return handleLogin(credentials);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        token.image = user.image;
        token.email = user.email;
      }

      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, name: true, email: true, image: true, role: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.image = dbUser.image;
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string | null;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper functions
async function handleRegistration(credentials: Record<"name" | "email" | "password", string> | undefined) {
  if (!credentials) throw new Error('No credentials provided');
  
  const { name, email, password } = credentials;

  // Validate input
  if (!name || !email || !password) {
    throw new Error('All fields are required');
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    image: user.image,
  };
}

async function handleLogin(credentials: Record<"email" | "password", string> | undefined) {
  if (!credentials) throw new Error('No credentials provided');
  
  const { email, password } = credentials;
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('No user found with this email');
  }

  if (!user.password) {
    throw new Error('Account created with social provider. Please sign in with that provider.');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Incorrect password');
  }

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    image: user.image,
    email: user.email,
  };
}