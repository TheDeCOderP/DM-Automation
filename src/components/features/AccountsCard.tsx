'use client';

import { toast } from 'sonner';
import React, { useState } from 'react';
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
  platformUserId?: string;
}

const platformIcons = {
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  TWITTER: X,
  LINKEDIN: Linkedin,
};

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

interface AccountsCardProps {
  accounts: SocialAccount[];
  selectedAccounts: string[];
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AccountsCard({ accounts, selectedAccounts, setSelectedAccounts }: AccountsCardProps) {
  const [rememberAccounts, setRememberAccounts] = useState(false);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedFacebookAccount, setSelectedFacebookAccount] = useState<string | null>(null);

  const handleSelectAll = () => {
    setSelectedAccounts(accounts.map(account => account.id));
  };

  const handleDeselectAll = () => {
    setSelectedAccounts([]);
    setFacebookPages([]);
    setSelectedFacebookAccount(null);
  };

  const handleAccountChange = async (account: SocialAccount, checked: boolean) => {
    if (checked) {
      setSelectedAccounts(prev => [...prev, account.id]);
      
      // If this is a Facebook profile, fetch its pages
      if (account.platform === 'FACEBOOK') {
        setSelectedFacebookAccount(account.id);
        await fetchFacebookPages(account.platformUserId || '');
      } else if (account.type === 'page') {
        // Deselect the parent Facebook account if a page is selected directly
        setSelectedFacebookAccount(null);
        setFacebookPages([]);
      }
    } else {
      setSelectedAccounts(prev => prev.filter(accountId => accountId !== account.id));
      
      // If deselecting a Facebook account, also deselect all its pages
      if (account.id === selectedFacebookAccount) {
        setSelectedAccounts(prev => prev.filter(id => !facebookPages.some(page => page.id === id)));
        setFacebookPages([]);
        setSelectedFacebookAccount(null);
      }
    }
  };

  const handlePageChange = (pageId: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts(prev => [...prev, pageId]);
    } else {
      setSelectedAccounts(prev => prev.filter(id => id !== pageId));
    }
  };

  const fetchFacebookPages = async (platformUserId: string) => {
    if (!platformUserId) return;
    
    setLoadingPages(true);
    try {
      const response = await fetch(`/api/accounts/facebook/pages?platformUserId=${platformUserId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch Facebook pages');
      }

      const data = await response.json();
      setFacebookPages(data.pages || []);
    } catch (error) {
      console.error('Error fetching Facebook pages:', error);
      toast.error('Failed to fetch Facebook pages');
    } finally {
      setLoadingPages(false);
    }
  };

  return (
    <div className="space-y-4">
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
                const PlatformIcon = platformIcons[account.platform as keyof typeof platformIcons];
                return (
                  <div key={account.id} className="flex items-center gap-2">
                    <Checkbox
                      id={account.id}
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={(checked) => handleAccountChange(account, checked as boolean)}
                    />
                    {account.avatar ? (
                      <Avatar className="size-6">
                        <AvatarImage src={account.avatar} alt={account.platformUsername} />
                        <AvatarFallback>{account.platformUsername.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <PlatformIcon className="size-6" />
                    )}
                    <Label htmlFor={account.id} className={`text-sm font-normal cursor-pointer ${selectedAccounts.includes(account.id) ? 'font-bold' : ''}`}>
                      {account.platformUsername}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facebook Pages Card */}
      {selectedFacebookAccount && (facebookPages.length > 0 || loadingPages) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                {facebookPages.length}
              </span>
              <h2 className="text-lg font-semibold">Facebook Pages</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPages ? (
              <div className="text-center py-4 text-sm text-gray-500">
                Loading pages...
              </div>
            ) : facebookPages.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                No pages found for this account
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {facebookPages.map((page: FacebookPage) => {
                  return (
                    <div key={page.id} className="flex items-center gap-2">
                      <Checkbox
                        id={page.id}
                        checked={selectedAccounts.includes(page.id)}
                        onCheckedChange={(checked) => handlePageChange(page.id, checked as boolean)}
                      />
                      <Avatar className="size-12 bg-blue-100">
                        <AvatarImage src={`https://graph.facebook.com/${page.id}/picture?type=large`} alt={page.name} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          <Facebook className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                      <Label htmlFor={page.id} className={`text-sm font-bold cursor-pointer`}>
                        {page.name}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}