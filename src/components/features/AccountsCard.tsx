'use client'
import React from 'react';
import { Facebook, Instagram, Linkedin, X, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

import { Platform } from '@prisma/client';

type AccountType = 'profile' | 'page' | 'group';

interface SocialAccount {
  id: string;
  platform: Platform;
  platformUsername: string;
  type: AccountType;
  avatar?: string;
}

const platformIcons = {
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  TWITTER: X,
  LINKEDIN: Linkedin,
};

interface AccountsCardProps {
  accounts: SocialAccount[];
  selectedAccounts: string[];
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AccountsCard({ accounts, selectedAccounts, setSelectedAccounts }: AccountsCardProps) {
  const [rememberAccounts, setRememberAccounts] = React.useState(false);

  const handleSelectAll = () => {
    setSelectedAccounts(accounts.map(account => account.id));
  };

  const handleDeselectAll = () => {
    setSelectedAccounts([]);
  };

  const handleAccountChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts(prev => [...prev, id]);
    } else {
      setSelectedAccounts(prev => prev.filter(accountId => accountId !== id));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="flex items-center justify-center size-6 rounded-full bg-black text-white text-xs font-bold">
            {accounts.length}
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
          <span>{selectedAccounts.length} selected</span>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSelectAll}
              disabled={accounts.length === 0}
            >
              Select All
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDeselectAll}
              disabled={selectedAccounts.length === 0}
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
            {accounts.map((account: SocialAccount) => {
              const PlatformIcon = platformIcons[account.platform  as keyof typeof platformIcons];
              return (
                <div key={account.id} className="flex items-center gap-2">
                  <Checkbox
                    id={account.id}
                    checked={selectedAccounts.includes(account.id)}
                    onCheckedChange={(checked) => handleAccountChange(account.id, checked as boolean)}
                  />
                  {account.avatar ? (
                    <Avatar className="size-6">
                      <AvatarImage src={account.avatar} alt={account.platformUsername} />
                      <AvatarFallback>{account.platformUsername.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <PlatformIcon className="size-6" />
                  )}
                  <Label htmlFor={account.id} className="text-sm font-normal cursor-pointer">
                    {account.platformUsername}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}