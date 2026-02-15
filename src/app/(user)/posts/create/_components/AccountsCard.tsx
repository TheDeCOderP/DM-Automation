"use client";

// Updated AccountsCard component matching the bottom layout
// --- Typescript + improved layout structure ---

import { useState, useMemo } from "react";
import { Info } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import PagesCard from "./PagesCard";
import { getPlatformIcon } from "@/utils/ui/icons";
import type { SocialAccount, SocialAccountPage } from "@prisma/client";

interface SocialAccountWithPages extends SocialAccount {
  pages: SocialAccountPage[];
}

interface AccountsCardProps {
  brandId: string;
  accounts: SocialAccountWithPages[];
  selectedAccounts: string[];
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>;
  selectedPageIds: string[];
  setSelectedPageIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AccountsCard({
  brandId,
  accounts,
  selectedAccounts,
  setSelectedAccounts,
  selectedPageIds,
  setSelectedPageIds,
}: AccountsCardProps) {
  const { open } = useSidebar();

  const { facebookPages, linkedinPages, pinterestPages, redditPages } = useMemo(() => {
    const getPages = (platform: string) =>
      accounts.find((acc) => acc.platform === platform)?.pages || [];

    return {
      facebookPages: getPages("FACEBOOK"),
      linkedinPages: getPages("LINKEDIN"),
      pinterestPages: getPages("PINTEREST"),
      redditPages: getPages("REDDIT"),
    };
  }, [accounts]);

  const platformUserIds = useMemo(
    () => ({
      facebook: accounts.find((acc) => acc.platform === "FACEBOOK")?.platformUserId,
      linkedin: accounts.find((acc) => acc.platform === "LINKEDIN")?.platformUserId,
      pinterest: accounts.find((acc) => acc.platform === "PINTEREST")?.platformUserId,
      reddit: accounts.find((acc) => acc.platform === "REDDIT")?.platformUserId,
    }),
    [accounts]
  );

  const [rememberAccounts, setRememberAccounts] = useState(false);

  const handleAccountChange = (accountId: string, checked: boolean) => {
    setSelectedAccounts((prev) => (checked ? [...prev, accountId] : prev.filter((id) => id !== accountId)));
  };

  const handlePageChange = (pageId: string, checked: boolean) => {
    setSelectedPageIds((prev) => (checked ? [...prev, pageId] : prev.filter((id) => id !== pageId)));
  };

  const allSelectedCount = selectedAccounts.length + selectedPageIds.length;

  const sectionCounts = {
    facebook: selectedPageIds.filter((id) => facebookPages.some((p) => p.id === id)).length,
    linkedin: selectedPageIds.filter((id) => linkedinPages.some((p) => p.id === id)).length,
    pinterest: selectedPageIds.filter((id) => pinterestPages.some((p) => p.id === id)).length,
    reddit: selectedPageIds.filter((id) => redditPages.some((p) => p.id === id)).length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT PANEL — Accounts List */}
        <Card className="col-span-4 border rounded-xl shadow-sm h-fit">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black text-white text-xs font-bold">
                {allSelectedCount}
              </div>
              Accounts
            </CardTitle>

            <div className="flex items-center gap-1 text-sm">
              <Checkbox
                id="remember-accounts"
                checked={rememberAccounts}
                onCheckedChange={(checked) => setRememberAccounts(!!checked)}
              />
              <Label htmlFor="remember-accounts">Remember</Label>
              <Info className="w-3 h-3 text-gray-500" />
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{allSelectedCount} selected</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedAccounts(accounts.map((a) => a.id))}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAccounts([])}>
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Accounts list */}
            <div className="space-y-4">
              {accounts.filter(({ platform }) => platform !== "FACEBOOK" && platform !== "PINTEREST" && platform !== "REDDIT").map((account) => (
                <div key={account.id} className="flex items-center gap-3">
                  <Checkbox
                    id={account.id}
                    checked={selectedAccounts.includes(account.id)}
                    onCheckedChange={(checked) => handleAccountChange(account.id, Boolean(checked))}
                  />

                  <Avatar className="w-9 h-9">
                    <AvatarImage src={account.platformUserImage ?? undefined} />
                    <AvatarFallback>{getPlatformIcon(account.platform, "w-5 h-5")}</AvatarFallback>
                  </Avatar>

                  <Label htmlFor={account.id} className="cursor-pointer text-sm">
                    {account.platformUsername}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT PANEL — Pages Sections */}
        <div className="col-span-8 space-y-6">
          <PagesCard
            pages={facebookPages}
            title="Facebook Pages"
            platform="FACEBOOK"
            selectedPageIds={selectedPageIds}
            onPageChange={handlePageChange}
            selectedCount={sectionCounts.facebook}
            avatarBgColor="#1877F2"
            avatarTextColor="#1877F2"
            platformUserId={platformUserIds.facebook}
            brandId={brandId}
            isSidebarOpen={open}
          />

          <PagesCard
            pages={pinterestPages}
            title="Pinterest Boards"
            platform="PINTEREST"
            selectedPageIds={selectedPageIds}
            onPageChange={handlePageChange}
            selectedCount={sectionCounts.pinterest}
            avatarBgColor="#E60023"
            avatarTextColor="#E60023"
            platformUserId={platformUserIds.pinterest}
            brandId={brandId}
            isSidebarOpen={open}
          />

          <PagesCard
            pages={redditPages}
            title="Reddit Subreddits"
            platform="REDDIT"
            selectedPageIds={selectedPageIds}
            onPageChange={handlePageChange}
            selectedCount={sectionCounts.reddit}
            avatarBgColor="#FF4500"
            avatarTextColor="#FF4500"
            platformUserId={platformUserIds.reddit}
            brandId={brandId}
            isSidebarOpen={open}
          />

          <PagesCard
            pages={linkedinPages}
            title="LinkedIn Pages"
            platform="LINKEDIN"
            selectedPageIds={selectedPageIds}
            onPageChange={handlePageChange}
            selectedCount={sectionCounts.linkedin}
            avatarBgColor="#0A66C2"
            avatarTextColor="#0A66C2"
            platformUserId={platformUserIds.linkedin}
            brandId={brandId}
            isSidebarOpen={open}
          />
        </div>
      </div>
    </div>
  );
}
