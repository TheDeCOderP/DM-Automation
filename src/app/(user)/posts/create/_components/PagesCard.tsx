import React, { useState } from 'react'
import { Label } from '@/components/ui/label';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getPlatformIcon } from '@/utils/ui/icons';
import { SocialAccountPage } from '@prisma/client';
import { toast } from 'sonner';

interface PagesCardProps {
  pages: SocialAccountPage[];
  title: string;
  platform: string;
  selectedPageIds: string[];
  onPageChange: (pageId: string, checked: boolean) => void;
  selectedCount: number;
  avatarBgColor: string;
  avatarTextColor: string;
  platformUserId?: string;
  brandId?: string;
  connectButton?: React.ReactNode;
  isSidebarOpen: boolean;
}

export default function PagesCard({
  pages: initialPages,
  title,
  platform,
  selectedPageIds,
  onPageChange,
  selectedCount,
  avatarBgColor,
  avatarTextColor,
  platformUserId,
  brandId,
  connectButton,
  isSidebarOpen,
}: PagesCardProps) {
  const [pages] = useState<SocialAccountPage[]>(initialPages);

  const isPageSelected = (pageId: string) => selectedPageIds.includes(pageId);

  const handleSelectAll = () => {
    const allPageIds = pages.map((page) => page.id);
    allPageIds.forEach(pageId => {
      if (!isPageSelected(pageId)) {
        onPageChange(pageId, true);
      }
    });
  };

  const handleDeselectAll = () => {
    pages.forEach(page => {
      if (isPageSelected(page.id)) {
        onPageChange(page.id, false);
      }
    });
  };

  const handleReconnectPages = () => {
    try {
      if (!brandId) {
        console.error("No brand ID available");
        toast.error('No brand ID available');
        return;
      }
      
      // Get current URL to return to after OAuth
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      
      // Redirect to OAuth flow to reconnect and fetch fresh pages
      window.location.href = `/api/accounts/${platform.toLowerCase()}/pages/auth?brandId=${brandId}&returnUrl=${returnUrl}`;
    } catch (error) {
      console.error(`Error redirecting to ${platform} auth:`, error);
      toast.error('Failed to reconnect pages');
    }
  };

  const handleConnectPages = () => {
    try {
      if (!brandId) {
        console.error("No brand ID available");
        toast.error('No brand ID available');
        return;
      }
      
      // Get current URL to return to after OAuth
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      
      window.location.href = `/api/accounts/${platform.toLowerCase()}/pages/auth?brandId=${brandId}&returnUrl=${returnUrl}`;
    } catch (error) {
      console.error(`Error redirecting to ${platform} auth:`, error);
      toast.error('Failed to connect pages');
    }
  };

  // Don't render if no pages and no platform user ID (can't connect)
  if (pages.length === 0 && !platformUserId) {
    return null;
  }

  const showConnectButton = platformUserId && pages.length === 0;
  const showReconnectButton = platformUserId && pages.length > 0;

  return (
    <Card>
      <CardHeader className={`flex flex-row items-center justify-between pb-2 ${!connectButton ? 'px-0' : ''}`}>
        <CardTitle className="flex items-center gap-2">
          <span 
            className="flex items-center justify-center size-6 rounded-full text-white text-xs font-bold"
            style={{ backgroundColor: avatarBgColor }}
          >
            {pages.length}
          </span>
          <h2 className="text-lg font-semibold">{title}</h2>
        </CardTitle>
        <div className="flex items-center gap-2">
          {connectButton && (
            <div className="mr-2">
              {connectButton}
            </div>
          )}
          <span className="text-sm text-gray-600">
            {selectedCount} selected
          </span>
          {pages.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={selectedCount === pages.length}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                disabled={selectedCount === 0}
              >
                Deselect All
              </Button>
            </>
          )}

          {showReconnectButton && (
            <Button 
              onClick={handleReconnectPages}
              size="sm"
              variant="outline"
            >
              Reconnect
            </Button>
          )}
          
          {showConnectButton && (
            <Button 
              onClick={handleConnectPages}
              size="sm"
              variant="outline"
            >
              Connect Pages
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={!connectButton ? 'px-0' : ''}>
        {pages.length > 0 ? (
          <div className={`grid grid-cols-${isSidebarOpen ? '2' : '3'} gap-4`}>
            {pages.map((page: SocialAccountPage) => (
              <div key={page.id} className="flex items-center gap-2">
                <Checkbox
                  id={page.id}
                  checked={isPageSelected(page.id)}
                  onCheckedChange={(checked) =>
                    onPageChange(page.id, checked as boolean)
                  }
                />
                <Avatar 
                  className="size-12" 
                  style={{ backgroundColor: avatarBgColor + '20' }}
                >
                  <AvatarImage
                    src={page.pageImage || undefined}
                    alt={page.name}
                  />
                  <AvatarFallback style={{ 
                    backgroundColor: avatarBgColor + '20', 
                    color: avatarTextColor 
                  }}>
                    {getPlatformIcon(platform, "w-4 h-4")}
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
        ) : platformUserId ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">
              No {title.toLowerCase()} found. Connect to see available pages.
            </p>
            <Button onClick={handleConnectPages}>
              Connect {title}
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              Connect a {platform.toLowerCase()} account to access {title.toLowerCase()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}