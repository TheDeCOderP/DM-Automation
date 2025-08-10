import { toast } from 'sonner';
import { useState } from 'react';
import { Plus, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';

import { Badge } from "../ui/badge";
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';

import { getTokenValidDays } from '@/utils/token';
import { getPlatformIcon } from "@/utils/ui/icons";

import { SocialAccount } from "@prisma/client";

type SocialAccountWithUser = SocialAccount & {
  user: {
    image: string | null;
  };
};

export default function ConnectedAccountsCards({ accounts, mutate }: { accounts: SocialAccountWithUser[], mutate: () => void }) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
  
    const handleRefreshToken = async (accountId: string) => {
        setIsRefreshing(true);
        try {
            const response = await fetch(`/api/accounts/${accountId}/refresh`, {
                method: 'POST',
            });
            
            if (!response.ok) throw new Error('Failed to refresh token');
            
            mutate();
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
            
            mutate();
            toast.success('Account disconnected successfully');
        } catch (error) {
            console.error('Disconnect failed:', error);
            toast.error('Failed to disconnect account');
        } finally {
            setIsDisconnecting(false);
        }
    };

    return (
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
                accounts.map((account: SocialAccountWithUser) => {
                    const validDays = getTokenValidDays(account?.tokenExpiresAt);
                
                    return (
                        <div
                            key={account.id}
                            className="flex flex-col gap-3 p-3 border rounded-lg bg-card text-card-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex items-center gap-3">
                                {getPlatformIcon(account.platform)}
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
  )
}
