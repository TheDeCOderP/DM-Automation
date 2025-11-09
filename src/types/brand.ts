import type { SocialAccount, Brand, BrandInvitation, User } from "@prisma/client";

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

export interface BrandWithSocialAccounts extends Brand {
  isAdmin: boolean
  userRole?: string
  socialAccounts: SocialAccount[]
  members?: BrandMember[]
  brandInvitations?: BrandInvitationWithUser[]
}
