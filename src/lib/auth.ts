// auth.ts
import { AuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === 'development',
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
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // We pass the raw role string to the signIn callback for mapping
          roleName: profile.role, 
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      try {
        // 1. Find or Sync User in local DB
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { role: true },
        });

        // 2. Resolve Role (Maintaining your dynamic DB-based role system)
        // Extract role from the OIDC profile (passed via profile() above)
        const incomingRoleName = (user as any).roleName || 'USER'; 
        
        // Find the corresponding role in your Database
        let targetRole = await prisma.role.findFirst({
          where: { name: { equals: incomingRoleName } }
        });

        // Fallback to default role if the incoming one isn't found
        if (!targetRole) {
          targetRole = await prisma.role.findFirst({ where: { isDefault: true } });
        }

        if (!targetRole) throw new Error("System Error: No valid roles defined in DB.");

        if (dbUser) {
          // 3. Check Active Status (Original Requirement)
          if (!dbUser.isActive) {
            // This will redirect to the error page with this message
            throw new Error('Your account is inactive. Please contact admin.');
          }

          // 4. Update/Migrate User
          await prisma.user.update({
            where: { email: user.email },
            data: {
              id: user.id, // Syncing ID with Central Auth
              name: user.name,
              image: user.image,
              roleId: targetRole.id, // Update to the role provided by SSO
            },
          });
        } else {
          // 5. Create new user with linked role
          await prisma.user.create({
            data: {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              roleId: targetRole.id,
              isActive: true, // Or false if you require manual approval
            },
          });
        }
        return true;
      } catch (error) {
        console.error("SignIn Callback Error:", error);
        return false; 
      }
    },

    async jwt({ token, user, trigger, session }) {
      // On initial sign in, user object is available
      if (user) {
        token.id = user.id;
      }

      // Always fetch fresh data from DB to ensure Role/Active status is current
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: { role: true },
        });

        if (dbUser) {
          if (!dbUser.isActive) throw new Error("Account Inactive");
          
          token.id = dbUser.id;
          token.role = dbUser.role.name; // Dynamic role name from DB
          token.isActive = dbUser.isActive;
        }
      }

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
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};