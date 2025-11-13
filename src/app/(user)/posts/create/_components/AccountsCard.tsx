"use client";

import useSWR from "swr";
import { useState } from "react";
import { Facebook, Linkedin, Info } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getPlatformIcon } from "@/utils/ui/icons";
import type { SocialAccount, SocialAccountPage } from "@prisma/client";

interface AccountsCardProps {
  brandId: string
  accounts: SocialAccount[]
  selectedAccounts: string[]
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>
  selectedPageIds: string[]
  setSelectedPageIds: React.Dispatch<React.SetStateAction<string[]>>
}

const fetcher = (url: string) => fetch(url).then((res: Response) => res.json())

export default function AccountsCard({
  brandId,
  accounts,
  selectedAccounts,
  setSelectedAccounts,
  selectedPageIds,
  setSelectedPageIds,
}: AccountsCardProps) {
  const { data: facebookData, isLoading: facebookLoading } = useSWR(
    `/api/accounts/facebook/pages?platformUserId=${
      accounts.find((acc) => acc.platform === "FACEBOOK")?.platformUserId || ""
    }`,
    fetcher
  );

  const { data: linkedinData, isLoading: linkedinLoading } = useSWR(
    `/api/accounts/linkedin/pages?platformUserId=${
      accounts.find((acc) => acc.platform === "LINKEDIN")?.platformUserId || ""
    }`,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const { data: pinterestData, isLoading: pinterestLoading } = useSWR(
    `/api/accounts/pinterest/boards?platformUserId=${
      accounts.find((acc) => acc.platform === "PINTEREST")?.platformUserId || ""
    }`,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const { data: redditData, isLoading: redditLoading } = useSWR(
    `/api/accounts/reddit/subreddits?platformUserId=${
      accounts.find((acc) => acc.platform === "REDDIT")?.platformUserId || ""
    }`,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const redditPages: SocialAccountPage[] = redditData?.pages || [];
  const facebookPages: SocialAccountPage[] = facebookData?.pages || [];
  const linkedinPages: SocialAccountPage[] = linkedinData?.pages || [];
  const pinterestPages: SocialAccountPage[] = pinterestData?.pages || [];
  
  const [rememberAccounts, setRememberAccounts] = useState(false);

  // Check if user has LinkedIn personal account to show connect button
  const hasLinkedInAccount = accounts.some(acc => acc.platform === "LINKEDIN");
  const hasPinterestAccount = accounts.some(acc => acc.platform === "PINTEREST");

  const handleLinkedInPageAccess = () => {
    try {
      if (!brandId) {
        console.error("No brand ID available");
        return;
      }
      
      window.location.href = `/api/accounts/linkedin/pages/auth?brandId=${brandId}`;
    } catch (error) {
      console.error("Error redirecting to LinkedIn auth:", error);
    }
  };

  const handlePinterestBoardAccess = () => {
    try {
      if (!brandId) {
        console.error("No brand ID available");
        return;
      }
      
      // This would trigger the API call to fetch and store Pinterest boards
      // You might want to add a dedicated endpoint for this or rely on the SWR refresh
      window.location.href = `/api/accounts/pinterest/pages/auth?brandId=${brandId}`;
    } catch (error) {
      console.error("Error redirecting to Pinterest auth:", error);
    }
  };

  const handleAccountChange = (accountId: string, checked: boolean) => {
    setSelectedAccounts((prev) =>
      checked ? [...prev, accountId] : prev.filter((id) => id !== accountId)
    );
  };

  const handlePageChange = (pageId: string, checked: boolean) => {
    setSelectedPageIds((prev) =>
      checked ? [...prev, pageId] : prev.filter((id) => id !== pageId)
    );
  };

  const isAccountSelected = (accountId: string) =>
    selectedAccounts.includes(accountId);

  const isPageSelected = (pageId: string) =>
    selectedPageIds.includes(pageId);

  // Global select/deselect all
  const handleSelectAll = () => {
    const allAccountIds = accounts.map((account) => account.id);
    const allFacebookPageIds = facebookPages.map((page) => page.id);
    const allLinkedinPageIds = linkedinPages.map((page) => page.id);
    const allPinterestPageIds = pinterestPages.map((page) => page.id);
    setSelectedAccounts(allAccountIds);
    setSelectedPageIds([...allFacebookPageIds, ...allLinkedinPageIds, ...allPinterestPageIds]);
  };

  const handleDeselectAll = () => {
    setSelectedAccounts([]);
    setSelectedPageIds([]);
  };

  // Facebook pages select/deselect all
  const handleSelectAllFacebookPages = () => {
    const allFacebookPageIds = facebookPages.map((page) => page.id);
    setSelectedPageIds((prev) => {
      const otherPages = prev.filter(
        (id) => !facebookPages.some((page) => page.id === id)
      );
      return [...otherPages, ...allFacebookPageIds];
    });
  };

  const handleDeselectAllFacebookPages = () => {
    setSelectedPageIds((prev) =>
      prev.filter((id) => !facebookPages.some((page) => page.id === id))
    );
  };

  // LinkedIn pages select/deselect all
  const handleSelectAllLinkedInPages = () => {
    const allLinkedInPageIds = linkedinPages.map((page) => page.id);
    setSelectedPageIds((prev) => {
      const otherPages = prev.filter(
        (id) => !linkedinPages.some((page) => page.id === id)
      );
      return [...otherPages, ...allLinkedInPageIds];
    });
  };

  const handleDeselectAllLinkedInPages = () => {
    setSelectedPageIds((prev) =>
      prev.filter((id) => !linkedinPages.some((page) => page.id === id))
    );
  };

  // Pinterest boards select/deselect all
  const handleSelectAllPinterestBoards = () => {
    const allPinterestBoardIds = pinterestPages.map((page) => page.id);
    setSelectedPageIds((prev) => {
      const otherPages = prev.filter(
        (id) => !pinterestPages.some((page) => page.id === id)
      );
      return [...otherPages, ...allPinterestBoardIds];
    });
  };

  const handleDeselectAllPinterestBoards = () => {
    setSelectedPageIds((prev) =>
      prev.filter((id) => !pinterestPages.some((page) => page.id === id))
    );
  };

  const allSelectedCount = selectedAccounts.length + selectedPageIds.length;
  const selectedFacebookPagesCount = selectedPageIds.filter((id) =>
    facebookPages.some((page) => page.id === id)
  ).length;
  const selectedLinkedInPagesCount = selectedPageIds.filter((id) =>
    linkedinPages.some((page) => page.id === id)
  ).length;
  const selectedPinterestBoardsCount = selectedPageIds.filter((id) =>
    pinterestPages.some((page) => page.id === id)
  ).length;
  const selectedRedditSubredditsCount = selectedPageIds.filter((id) =>
    redditPages.some((subreddit) => subreddit.id === id)
  ).length;

  return (
    <>
      <Label className="block text-sm font-medium mb-2">
        <strong className="mr-2 text-xl">Step 2:</strong>
        Select Accounts
      </Label>

      {/* Accounts Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center size-6 rounded-full bg-black text-white text-xs font-bold">
              {allSelectedCount}
            </span>
            <h2 className="text-lg font-semibold">Accounts</h2>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Checkbox
              id="remember-accounts"
              checked={rememberAccounts}
              onCheckedChange={(checked) => setRememberAccounts(!!checked)}
            />
            <Label htmlFor="remember-accounts" className="text-sm font-normal">
              Remember
            </Label>
            <Info className="size-3 text-gray-500" />
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <span>{allSelectedCount} selected</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={accounts.length === 0 && facebookPages.length === 0 && linkedinPages.length === 0 && pinterestPages.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                disabled={allSelectedCount === 0}
              >
                Deselect All
              </Button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              No connected accounts. Connect your first account to get started.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {accounts
              .filter((account) => account.platform === "LINKEDIN" || account.platform === "TWITTER" || account.platform === "YOUTUBE")
                .map((account) => (
                  <div key={account.id} className="flex items-center gap-2">
                    <Checkbox
                      id={account.id}
                      checked={isAccountSelected(account.id)}
                      onCheckedChange={(checked) =>
                        handleAccountChange(account.id, checked as boolean)
                      }
                      // Disable LinkedIn personal account if LinkedIn pages are selected
                      disabled={
                        account.platform === "LINKEDIN" && 
                        linkedinPages.length > 0 && 
                        selectedPageIds.some(id => 
                          linkedinPages.some(page => page.id === id)
                        )
                      }
                    />
                    <Avatar className="size-8">
                      <AvatarImage
                        src={account.platformUserImage || undefined}
                        alt={account.platformUsername}
                      />
                      <AvatarFallback>
                        {getPlatformIcon(account.platform, "w-6 h-6")}
                      </AvatarFallback>
                    </Avatar>
                    <Label
                      htmlFor={account.id}
                      className={`text-sm font-normal cursor-pointer ${
                        isAccountSelected(account.id) ? "font-bold" : ""
                      } ${
                        account.platform === "LINKEDIN" && 
                        linkedinPages.length > 0 && 
                        selectedPageIds.some(id => 
                          linkedinPages.some(page => page.id === id)
                        ) ? "opacity-50" : ""
                      }`}
                    >
                      {account.platformUsername}
                      {account.platform === "LINKEDIN" && 
                       linkedinPages.length > 0 && 
                       selectedPageIds.some(id => 
                         linkedinPages.some(page => page.id === id)
                       ) && (
                        <span className="text-xs text-gray-500 block">(disabled - pages selected)</span>
                      )}
                    </Label>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* LinkedIn Pages Section */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-blue-800 text-white text-xs font-bold">
                {linkedinPages.length}
              </span>
              <h2 className="text-lg font-semibold">LinkedIn Pages</h2>
            </CardTitle>
            {hasLinkedInAccount && (
              <Button 
                onClick={handleLinkedInPageAccess}
                size="sm"
                variant="outline"
              >
                {linkedinPages.length > 0 ? "Refresh Pages" : "Connect Pages"}
              </Button>
            )}
          </div>
          {!hasLinkedInAccount && (
            <p className="text-sm text-gray-500 mt-2">
              Connect a LinkedIn personal account first to access LinkedIn Pages
            </p>
          )}
        </CardHeader>

        <CardContent>
          {linkedinLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : linkedinPages.length > 0 ? (
            <>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>{selectedLinkedInPagesCount} selected</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllLinkedInPages}
                    disabled={selectedLinkedInPagesCount === linkedinPages.length}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectAllLinkedInPages}
                    disabled={selectedLinkedInPagesCount === 0}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {linkedinPages.map((page: SocialAccountPage) => (
                  <div key={page.id} className="flex items-center gap-2">
                    <Checkbox
                      id={page.id}
                      checked={isPageSelected(page.id)}
                      onCheckedChange={(checked) =>
                        handlePageChange(page.id, checked as boolean)
                      }
                    />
                    <Avatar className="size-12 bg-blue-100">
                      <AvatarImage
                        src={page.pageImage || undefined}
                        alt={page.name}
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-800">
                        <Linkedin className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <Label
                      htmlFor={page.id}
                      className="text-sm font-bold cursor-pointer"
                    >
                      {page.name}
                    </Label>
                  </div>
                ))}
              </div>
            </>
          ) : hasLinkedInAccount ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">
                No LinkedIn Pages found. Connect to see available pages.
              </p>
              <Button onClick={handleLinkedInPageAccess}>
                Connect LinkedIn Pages
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                Connect a LinkedIn personal account to access LinkedIn Pages
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facebook Pages Section */}
      {facebookLoading ? (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : facebookPages.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-0">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                {facebookPages.length}
              </span>
              <h2 className="text-lg font-semibold">Facebook Pages</h2>
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedFacebookPagesCount} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFacebookPages}
                disabled={selectedFacebookPagesCount === facebookPages.length}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAllFacebookPages}
                disabled={selectedFacebookPagesCount === 0}
              >
                Deselect All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 px-0">
              {facebookPages.map((page: SocialAccountPage) => (
                <div key={page.id} className="flex items-center gap-2">
                  <Checkbox
                    id={page.id}
                    checked={isPageSelected(page.id)}
                    onCheckedChange={(checked) =>
                      handlePageChange(page.id, checked as boolean)
                    }
                  />
                  <Avatar className="size-12 bg-blue-100">
                    <AvatarImage
                      src={`https://graph.facebook.com/${page.pageId}/picture?type=large`}
                      alt={page.name}
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      <Facebook className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <Label
                    htmlFor={page.id}
                    className="text-sm font-bold cursor-pointer"
                  >
                    {page.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pinterest Boards Section */}
      {pinterestLoading ? (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : pinterestPages.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-0">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-red-600 text-white text-xs font-bold">
                {pinterestPages.length}
              </span>
              <h2 className="text-lg font-semibold">Pinterest Boards</h2>
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedPinterestBoardsCount} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllPinterestBoards}
                disabled={selectedPinterestBoardsCount === pinterestPages.length}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAllPinterestBoards}
                disabled={selectedPinterestBoardsCount === 0}
              >
                Deselect All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 px-0">
              {pinterestPages.map((board: SocialAccountPage) => (
                <div key={board.id} className="flex items-center gap-2">
                  <Checkbox
                    id={board.id}
                    checked={isPageSelected(board.id)}
                    onCheckedChange={(checked) =>
                      handlePageChange(board.id, checked as boolean)
                    }
                  />
                  <Avatar className="size-12 bg-red-100">
                    <AvatarImage
                      src={board.pageImage || undefined}
                      alt={board.name}
                    />
                    <AvatarFallback className="bg-red-100 text-red-600">
                      {getPlatformIcon("PINTEREST", "w-4 h-4")}
                    </AvatarFallback>
                  </Avatar>
                  <Label
                    htmlFor={board.id}
                    className="text-sm font-bold cursor-pointer"
                  >
                    {board.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reddit Subreddits Section */}
      {redditLoading ? (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : redditPages.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-0">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-red-600 text-white text-xs font-bold">
                {redditPages.length}
              </span>
              <h2 className="text-lg font-semibold">Reddit Subreddits</h2>
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedRedditSubredditsCount} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => console.log("Select All")}
                disabled={selectedRedditSubredditsCount === redditPages.length}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => console.log("Deselect All")}
                disabled={selectedRedditSubredditsCount === 0}
              >
                Deselect All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 px-0">
              {redditPages.map((subreddit: SocialAccountPage) => (
                <div key={subreddit.id} className="flex items-center gap-2">
                  <Checkbox
                    id={subreddit.id}
                    checked={isPageSelected(subreddit.id)}
                    onCheckedChange={(checked) =>
                      handlePageChange(subreddit.id, checked as boolean)
                    }
                  />
                  <Avatar className="size-12 bg-red-100">
                    <AvatarImage
                      src={subreddit.pageImage || undefined}
                      alt={subreddit.name}
                    />
                    <AvatarFallback className="bg-red-100 text-red-600">
                      {getPlatformIcon("REDDIT", "w-4 h-4")}
                    </AvatarFallback>
                  </Avatar>
                  <Label
                    htmlFor={subreddit.id}
                    className="text-sm font-bold cursor-pointer"
                  >
                    {subreddit.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}