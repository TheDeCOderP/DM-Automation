"use client";
import useSwr from "swr";
import { toast } from "sonner";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  CheckCircle,
  RefreshCw,
  Trash2,
  Plus,
  Facebook,
  Instagram,
  X,
  Linkedin,
} from "lucide-react"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Platform } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Helper function to calculate days until token expires
const getTokenValidDays = (expiryDate: string | null | undefined): number => {
  if (!expiryDate) return 0;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper function to get platform icon
const getPlatformIcon = (platform: Platform): React.ElementType => {
  switch (platform) {
    case 'FACEBOOK':
      return Facebook;
    case 'INSTAGRAM':
      return Instagram;
    case 'TWITTER':
      return X;
    case 'LINKEDIN':
      return Linkedin;
  }
};

// Available platforms data
const availablePlatforms: { id: Platform, name: string, icon: React.ElementType }[] = [
  { id: "FACEBOOK", name: "Facebook", icon: Facebook },
  { id: "INSTAGRAM", name: "Instagram", icon: Instagram },
  { id: "TWITTER", name: "Twitter", icon: X },
  { id: "LINKEDIN", name: "LinkedIn", icon: Linkedin }
];

export default function SocialAccountsPage() {
  const { data: session } = useSession();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { data: response, error, mutate } = useSwr(`/api/accounts`, fetcher);
  const accounts = response?.data || [];

  const handleConnect = async (platform: Platform) => {
    setIsConnecting(true);
    try {
      if (session) {
        switch (platform) {
          case 'LINKEDIN':
            window.location.href = `/api/accounts/linkedin/auth?userId=${session.user.id}`;
            break;
          case 'TWITTER':
            window.location.href = `/api/accounts/twitter/auth?userId=${session.user.id}`;
            break;
          case 'FACEBOOK':
            window.location.href = `/api/accounts/facebook/auth?userId=${session.user.id}`;
            break;
          case 'INSTAGRAM':
            window.location.href = `/api/accounts/instagram/auth?userId=${session.user.id}`;
            break;
          default:
            break;
        }
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error('Failed to initiate connection');
      setIsConnecting(false);
    }
  };

  const handleRefreshToken = async (accountId: string) => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/accounts/${accountId}/refresh`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to refresh token');
      
      await mutate();
      toast.success('Token refreshed successfully');
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Failed to refresh token');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setIsDisconnecting(true);
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to disconnect account');
      
      await mutate();
      toast.success('Account disconnected successfully');
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (error) return <div>Failed to load accounts</div>;
  if (!accounts) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Social Accounts</h1>
        <p className="text-muted-foreground">Connect and manage your social media accounts</p>
      </div>
      
      {/* Connected Accounts Card */}
      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-4 pb-2 md:flex-row md:items-center md:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">Connected Accounts</CardTitle>
            <CardDescription>Manage your connected social media accounts</CardDescription>
          </div>
          <Button variant="outline" className="gap-1 bg-transparent w-full md:w-auto">
            <Plus className="h-4 w-4" />
            Connect New Account
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {accounts.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No connected accounts yet. Connect your first account to get started.
            </div>
          ) : (
            accounts.map((account: any) => {
              const PlatformIcon = getPlatformIcon(account.platform);
              const validDays = getTokenValidDays(account.tokenExpiresAt);
              
              return (
                <div
                  key={account.id}
                  className="flex flex-col gap-3 p-3 border rounded-lg bg-card text-card-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <PlatformIcon className="size-6 text-foreground" />
                    <Avatar className="size-9">
                      <AvatarImage src={account.user.image || "/placeholder.svg"} alt={account.platformUsername} />
                      <AvatarFallback>{account.platformUsername.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{account.platformUsername}</span>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <CheckCircle className="size-3 mr-1 text-green-500" />
                        <Badge variant={validDays < 30 ? "destructive" : "secondary"}>
                          Token valid for {validDays} days
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="size-8 bg-transparent"
                      onClick={() => handleRefreshToken(account.id)}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className="size-4" />
                      <span className="sr-only">Refresh token for {account.platformUsername}</span>
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="size-8"
                      onClick={() => handleDisconnect(account.id)}
                      disabled={isDisconnecting}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Disconnect {account.platformUsername}</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
      
      {/* Available Platforms Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Available Platforms</CardTitle>
          <CardDescription>Connect new social media accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="whitespace-nowrap rounded-md border">
            <div className="flex space-x-4 p-4">
              {availablePlatforms.filter((platform) => !accounts.some((acc: any) => acc.platform === platform.id)).map((platform) => {
                return (
                  <Card
                    key={platform.id}
                    className="flex flex-col items-center justify-center p-6 min-w-[150px] sm:min-w-[180px] shadow-sm hover:shadow-md transition-shadow"
                  >
                    <platform.icon className="size-8 sm:size-10 mb-3 text-foreground" />
                    <span className="font-medium text-sm sm:text-base mb-4">{platform.name}</span>
                    <Button 
                      onClick={() => handleConnect(platform.id)} 
                      disabled={isConnecting}
                      variant={"outline"}
                      className="w-full"
                    >
                      <Plus className="size-4 mr-2" />
                      Connect
                    </Button>
                  </Card>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}