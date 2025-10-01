"use client"

import { toast } from "sonner";
import { useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { SocialAccount, Platform } from "@prisma/client";
import { getPlatformIcon } from "@/utils/ui/icons";

type SocialAccountWithUser = SocialAccount & {
  user: { image: string | null };
};

interface ConnectAccountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId?: string;
  brandName?: string;
  accounts: SocialAccountWithUser[];
  mutate: () => void;
}

const platforms = [
  { id: "TWITTER", name: "Twitter", color: "bg-sky-500" },
  { id: "YOUTUBE", name: "YouTube", color: "bg-red-600" },
  { id: "LINKEDIN", name: "LinkedIn", color: "bg-blue-700" },
  { id: "FACEBOOK", name: "Facebook", color: "bg-blue-600" },
  { id: "INSTAGRAM", name: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
];

export function ConnectAccountsModal({ open, onOpenChange, brandName, brandId, accounts, mutate }: ConnectAccountsModalProps) {
  const { data: session } = useSession();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

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
      const response = await fetch(`/api/accounts?platform=${platform}&socialAccountId=${accountId}`, {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
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

            return (
              <Card key={platform.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg`}>
                        {getPlatformIcon(platform.id, "h-6 w-6")}
                      </div>
                      <div>
                        <h3 className="font-medium">{platform.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {connectedAccount
                            ? "Account connected"
                            : `Connect your ${platform.name} account`}
                        </p>
                      </div>
                    </div>

                    {connectedAccount ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefreshToken(connectedAccount.id)}
                          disabled={refreshingId === connectedAccount.id}
                        >
                          {refreshingId === connectedAccount.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Refreshing
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDisconnect(connectedAccount.id, connectedAccount.platform)}
                          disabled={disconnectingId === connectedAccount.id}
                        >
                          {disconnectingId === connectedAccount.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Deleting
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleConnect(platform.id as Platform)}
                        disabled={connectingPlatform !== null}
                        size="sm"
                        className="min-w-[80px]"
                      >
                        {connectingPlatform === platform.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting
                          </>
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    )}
                  </div>
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
