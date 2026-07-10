"use client"

import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Trash2, Building2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { getPlatformIcon } from "@/utils/ui/icons";
import { SocialAccount, Platform } from "@prisma/client";

type SocialAccountWithUser = SocialAccount & {
  user: { image: string | null };
};

interface LinkedInPage {
  id: string;
  pageName: string;
  pageId: string;
  tokenExpiresAt: string | null;
  isActive: boolean;
}

interface ConnectAccountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId?: string;
  brandName?: string;
  accounts: SocialAccountWithUser[];
  mutate: () => void;
}

const platforms = [
  { id: "LINKEDIN", name: "LinkedIn", color: "bg-primary", isDisabled: false },
  { id: "PINTEREST", name: "Pinterest", color: "bg-orange-500", isDisabled: false },
  { id: "FACEBOOK", name: "Facebook", color: "bg-primary", isDisabled: false },
  { id: "REDDIT", name: "Reddit", color: "bg-green-600", isDisabled: false },
  { id: "YOUTUBE", name: "YouTube", color: "bg-red-600", isDisabled: false },
  { id: "INSTAGRAM", name: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500", isDisabled: true },
  { id: "TIKTOK", name: "TikTok", color: "bg-black", isDisabled: true },
  { id: "TWITTER", name: "Twitter", color: "bg-sky-500", isDisabled: true },
];

export default function ConnectAccountsModal({ open, onOpenChange, brandName, brandId, accounts, mutate }: ConnectAccountsModalProps) {
  const { data: session } = useSession();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [linkedInPages, setLinkedInPages] = useState<LinkedInPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [renewingPageId, setRenewingPageId] = useState<string | null>(null);

  const linkedInAccount = accounts.find((acc) => acc.platform === "LINKEDIN");

  // Fetch LinkedIn pages when modal opens and LinkedIn is connected
  useEffect(() => {
    if (!open || !linkedInAccount || !brandId) return;

    const fetchPages = async () => {
      setLoadingPages(true);
      try {
        const res = await fetch(`/api/accounts/linkedin/pages?platformUserId=${linkedInAccount.platformUserId}`);
        if (!res.ok) throw new Error("Failed to fetch pages");
        const data = await res.json();
        setLinkedInPages(data.pages || []);
      } catch {
        setLinkedInPages([]);
      } finally {
        setLoadingPages(false);
      }
    };

    fetchPages();
  }, [open, linkedInAccount?.id, brandId]);

  const isPageTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return true;
    return new Date(expiresAt) <= new Date();
  };

  const getPageDaysLeft = (expiresAt: string | null) => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleRefreshToken = async (accountId: string) => {
    setRefreshingId(accountId);
    try {
      const response = await fetch(`/api/accounts/${accountId}/refresh`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to refresh token");
      mutate();
      toast.success("Token refreshed successfully");
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("Failed to refresh token");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDisconnect = async (accountId: string, platform: Platform) => {
    setDisconnectingId(accountId);
    try {
      const response = await fetch(`/api/accounts/${platform.toLowerCase()}?brandId=${brandId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to disconnect account");
      }
      
      const result = await response.json();
      mutate();
      toast.success(result.message || "Account disconnected successfully");
    } catch (error) {
      console.error("Disconnect failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to disconnect account");
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleConnect = async (platform: Platform) => {
    setConnectingPlatform(platform);
    try {
      if (session) {
        window.location.href = `/api/accounts/${platform.toLowerCase()}/auth?userId=${session.user.id}&brandId=${brandId}`;
      }
    } catch (error) {
      console.error("Connection failed:", error);
      toast.error("Failed to initiate connection");
      setConnectingPlatform(null);
    }
  };

  const handleRenewAllLinkedInPages = () => {
    setConnectingPlatform("LINKEDIN_PAGES");
    window.location.href = `/api/accounts/linkedin/pages/auth?brandId=${brandId}&returnUrl=${encodeURIComponent(window.location.pathname)}`;
  };

  const handleRenewPage = (pageId: string) => {
    setRenewingPageId(pageId);
    window.location.href = `/api/accounts/linkedin/pages/auth?brandId=${brandId}&returnUrl=${encodeURIComponent(window.location.pathname)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-center">
            Connect Social Accounts
            {brandName && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {brandName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4 no-scrollbar">
          {platforms.map((platform) => {
            const connectedAccount = accounts.find((acc) => acc.platform === platform.id);
            const isLinkedIn = platform.id === "LINKEDIN";

            return (
              <Card key={platform.id} className="transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${platform.isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}>
                        {getPlatformIcon(platform.id, "h-6 w-6")}
                      </div>
                      <span className="font-medium">{platform.name}</span>
                    </div>

                    {connectedAccount ? (
                      <div className="flex gap-2">
                        {isLinkedIn ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleRenewAllLinkedInPages}
                            disabled={connectingPlatform === "LINKEDIN_PAGES"}
                            className="gap-1"
                          >
                            {connectingPlatform === "LINKEDIN_PAGES" ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecting</>
                            ) : (
                              <><RefreshCw className="h-3.5 w-3.5" /> Renew Pages</>
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefreshToken(connectedAccount.id)}
                            disabled={refreshingId === connectedAccount.id}
                          >
                            {refreshingId === connectedAccount.id ? (
                              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Refreshing</>
                            ) : (
                              <><RefreshCw className="h-4 w-4 mr-1" /> Refresh</>
                            )}
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDisconnect(connectedAccount.id, connectedAccount.platform)}
                          disabled={disconnectingId === connectedAccount.id}
                        >
                          {disconnectingId === connectedAccount.id ? (
                            <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting</>
                          ) : (
                            <><Trash2 className="h-4 w-4 mr-1" /> Delete</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleConnect(platform.id as Platform)}
                        disabled={connectingPlatform !== null || platform.isDisabled}
                        size="sm"
                        className="min-w-[80px]"
                      >
                        {connectingPlatform === platform.id ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting</>
                        ) : platform.isDisabled ? (
                          "Not Available"
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    )}
                  </div>

                  {/* LinkedIn pages list — only shown when LinkedIn is connected */}
                  {isLinkedIn && connectedAccount && (
                    <div className="px-4 pb-4 space-y-1.5">
                      {loadingPages ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading pages...
                        </div>
                      ) : linkedInPages.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2">
                          No LinkedIn pages found. Click &quot;Renew Pages&quot; to connect your pages.
                        </p>
                      ) : (
                        linkedInPages.map((page) => (
                          <div key={page.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{page.pageName}</span>
                              {!page.isActive && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  Expired
                                </Badge>
                              )}
                              {page.isActive && isPageTokenExpired(page.tokenExpiresAt) && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500 text-yellow-600">
                                  {getPageDaysLeft(page.tokenExpiresAt)} days left
                                </Badge>
                              )}
                            </div>
                            {!page.isActive || isPageTokenExpired(page.tokenExpiresAt) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRenewPage(page.pageId)}
                                disabled={renewingPageId === page.pageId}
                                className="h-7 text-xs"
                              >
                                {renewingPageId === page.pageId ? (
                                  <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Renewing</>
                                ) : (
                                  <><RefreshCw className="h-3 w-3 mr-1" /> Renew</>
                                )}
                              </Button>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-2 py-0 h-6 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                Active
                              </Badge>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="text-center text-sm text-muted-foreground">
          You&apos;ll be redirected to authorize each platform
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}