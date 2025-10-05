import type { SocialAccount, Brand } from "@prisma/client";

export interface BrandMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  isCurrentUser?: boolean;
}

export interface BrandWithSocialAccounts extends Brand {
  isAdmin: boolean
  userRole?: string
  socialAccounts: SocialAccount[]
  members?: BrandMember[]
}
