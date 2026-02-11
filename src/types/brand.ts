import type { BrandInvitation, User } from "@prisma/client";

// Define SocialAccount type locally to avoid browser import issues
export interface SocialAccount {
  id: string;
  platform: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  platformUserId: string;
  platformUsername: string;
  platformUserImage: string | null;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  isCurrentUser?: boolean;
}

export interface BrandInvitationWithUser extends BrandInvitation {
  invitedTo: User;
}

export interface BrandWithSocialAccounts {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
  isAdmin: boolean;
  userRole?: string;
  socialAccounts: SocialAccount[];
  members?: BrandMember[];
  brandInvitations?: BrandInvitationWithUser[];
}
