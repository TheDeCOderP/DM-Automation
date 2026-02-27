import { AuthOptions } from 'next-auth';
import { prisma } from '@/lib/prisma';

export const authOptions: AuthOptions = {
  // We handle manual DB syncing in the signIn callback, 
  // so we strategy: 'jwt' without the PrismaAdapter to avoid conflicts.
  debug: true,
  providers: [
    {
      id: "central-auth",
      name: "Central Account",
      type: "oauth",
      wellKnown: `${process.env.CENTRAL_AUTH_URL}/oidc/.well-known/openid-configuration`,
      authorization: { params: { scope: "openid email profile" } },
      idToken: true,
      client: {
        id_token_signed_response_alg: "HS256",
      },
      checks: ["pkce", "state"],
      clientId: process.env.CENTRAL_CLIENT_ID as string,
      clientSecret: process.env.CENTRAL_CLIENT_SECRET as string,
      profile(profile) {
        return {
          id: profile.sub,
          // Fallback to email prefix if name is null
          name: profile.name || profile.email.split('@')[0],
          email: profile.email,
          image: profile.picture,
          roleName: profile.role, // Pass OIDC role to the signIn callback
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        // 1. Check if user exists in local DB
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { role: true },
        });

        // 2. Resolve Role from Database
        // MySQL is case-insensitive by default; removed 'mode: insensitive'
        const incomingRoleName = (user as any).roleName || 'USER'; 
        
        let targetRole = await prisma.role.findFirst({
          where: { name: incomingRoleName }
        });

        // Fallback to default role if the incoming one isn't in our DB
        if (!targetRole) {
          targetRole = await prisma.role.findFirst({ 
            where: { isDefault: true } 
          });
        }

        if (!targetRole) {
          console.error("Critical: No default role found in the database.");
          return false;
        }

        if (dbUser) {
          // 3. Check if user is active (Your original requirement)
          if (!dbUser.isActive) {
            console.warn(`Sign-in blocked: User ${user.email} is inactive.`);
            return false; 
          }

          // 4. Update/Sync existing user
          await prisma.user.update({
            where: { email: user.email },
            data: {
              id: user.id, // Update local ID to Central Auth ID
              name: user.name,
              image: user.image,
              roleId: targetRole.id, // Sync role from SSO
            },
          });
        } else {
          // 5. Create new user
          await prisma.user.create({
            data: {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              roleId: targetRole.id,
              isActive: true, // Default to true for new SSO users
            },
          });
        }
        return true;
      } catch (error) {
        console.error("Detailed Manual Sign-in Error:", error);
        return false; 
      }
    },

    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: user object is passed from the provider
      if (user) {
        token.id = user.id;
      }

      // Always fetch fresh data from DB to ensure session has the latest Role/Active status
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: { role: true },
        });

        if (dbUser) {
          // Security check: if user was deactivated mid-session
          if (!dbUser.isActive) {
             throw new Error("Account is inactive");
          }

          token.id = dbUser.id;
          token.role = dbUser.role.name; // Dynamic role from DB
          token.isActive = dbUser.isActive;
        }
      }

      // Handle manual session updates
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error', // Redirects here if signIn returns false
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};