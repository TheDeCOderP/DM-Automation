"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Send, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface ScheduleItemModalProps {
  item: any;
  platforms: string[];
  brandId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SocialAccount {
  id: string;
  platform: string;
  platformUsername: string;
  platformUserImage?: string;
  pages?: {
    id: string;
    pageName: string;
    pageImage?: string;
  }[];
}

interface AccountSelection {
  platform: string;
  socialAccountId: string;
  socialAccountPageId: string | null;
}

export default function ScheduleItemModal({
  item,
  platforms,
  brandId,
  onClose,
  onSuccess,
}: ScheduleItemModalProps) {
  const [isScheduling, setIsScheduling] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<AccountSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasScheduled, setHasScheduled] = useState(false);

  // Fetch social accounts for the brand
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`/api/brands/${brandId}/social-accounts`);
        if (!response.ok) throw new Error("Failed to fetch accounts");
        
        const data = await response.json();
        setSocialAccounts(data.accounts || []);
        
        // Auto-select first account for each platform
        const autoSelected: AccountSelection[] = [];
        
        platforms.forEach((platform) => {
          const account = data.accounts?.find((acc: SocialAccount) => acc.platform === platform);
          if (account) {
            // If account has pages, select first page, otherwise just the account
            if (account.pages && account.pages.length > 0) {
              autoSelected.push({
                platform,
                socialAccountId: account.id,
                socialAccountPageId: account.pages[0].id,
              });
            } else {
              autoSelected.push({
                platform,
                socialAccountId: account.id,
                socialAccountPageId: null,
              });
            }
          }
        });
        
        setSelectedAccounts(autoSelected);
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast.error("Failed to load social accounts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [brandId, platforms]);

  const handleAccountToggle = (platform: string, accountId: string, pageId: string | null = null) => {
    setSelectedAccounts(prev => {
      const exists = prev.find(
        s => s.platform === platform && 
             s.socialAccountId === accountId && 
             s.socialAccountPageId === pageId
      );

      if (exists) {
        // Remove if already selected
        return prev.filter(
          s => !(s.platform === platform && 
                 s.socialAccountId === accountId && 
                 s.socialAccountPageId === pageId)
        );
      } else {
        // Add new selection
        return [...prev, { platform, socialAccountId: accountId, socialAccountPageId: pageId }];
      }
    });
  };

  const isAccountSelected = (platform: string, accountId: string, pageId: string | null = null) => {
    return selectedAccounts.some(
      s => s.platform === platform && 
           s.socialAccountId === accountId && 
           s.socialAccountPageId === pageId
    );
  };

  const handleSchedule = async () => {
    if (!item.suggestedTime) {
      toast.error("Please set a suggested time first");
      return;
    }

    // Validate that all platforms have at least one selected account
    const missingPlatforms = platforms.filter(
      p => !selectedAccounts.some(s => s.platform === p)
    );
    
    if (missingPlatforms.length > 0) {
      toast.error(`Please select at least one account for: ${missingPlatforms.join(", ")}`);
      return;
    }

    setIsScheduling(true);

    try {
      const response = await fetch("/api/content-calendar/schedule-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          accountSelections: selectedAccounts,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to schedule post");
      }

      const data = await response.json();
      toast.success(`Post scheduled successfully! ${data.scheduled} posts created.`);
      setHasScheduled(true);
      onSuccess();
    } catch (error) {
      console.error("Error scheduling post:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to schedule post"
      );
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCloseAttempt = () => {
    if (!hasScheduled && selectedAccounts.length > 0 && !isScheduling) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onClose();
  };

  const getAccountsForPlatform = (platform: string) => {
    return socialAccounts.filter(acc => acc.platform === platform);
  };

  return (
    <>
      <Dialog open onOpenChange={handleCloseAttempt}>
        <DialogContent 
          className="!max-w-[2500px] !w-[98vw] max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            if (!hasScheduled && selectedAccounts.length > 0 && !isScheduling) {
              e.preventDefault();
              setShowCloseConfirm(true);
            }
          }}
          onEscapeKeyDown={(e) => {
            if (!hasScheduled && selectedAccounts.length > 0 && !isScheduling) {
              e.preventDefault();
              setShowCloseConfirm(true);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Schedule Post - Day {item.day}</DialogTitle>
            <DialogDescription>
              {item.topic}
            </DialogDescription>
          </DialogHeader>

        <div className="space-y-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Scheduled Time */}
              {item.suggestedTime && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Scheduled for:</strong> {new Date(item.suggestedTime).toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}

              {/* Platform Account Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold">Select Accounts & Pages (Multiple Selection Allowed)</h3>
                {platforms.map((platform) => {
                  const accounts = getAccountsForPlatform(platform);
                  
                  return (
                    <div key={platform} className="space-y-3 p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="default" className="text-base px-3 py-1">{platform}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ({selectedAccounts.filter(s => s.platform === platform).length} selected)
                        </span>
                      </div>
                      
                      {accounts.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No {platform} account connected. Please connect an account first.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-4">
                          {accounts.map((account) => (
                            <div key={account.id} className="space-y-3 p-3 bg-muted/30 rounded-md">
                              {/* Account Selection */}
                              <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 border-b pb-3">
                                <Checkbox
                                  checked={isAccountSelected(platform, account.id, null)}
                                  onCheckedChange={() => handleAccountToggle(platform, account.id, null)}
                                />
                                {account.platformUserImage && (
                                  <img
                                    src={account.platformUserImage}
                                    alt={account.platformUsername}
                                    className="w-8 h-8 rounded-full"
                                  />
                                )}
                                <Label className="flex-1 cursor-pointer font-medium">
                                  {account.platformUsername}
                                </Label>
                              </div>

                              {/* Pages Selection (if available) */}
                              {account.pages && account.pages.length > 0 && (
                                <div className="ml-6">
                                  <p className="text-sm text-muted-foreground mb-2">Pages:</p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {account.pages.map((page) => (
                                      <div 
                                        key={page.id} 
                                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 border"
                                      >
                                        <Checkbox
                                          checked={isAccountSelected(platform, account.id, page.id)}
                                          onCheckedChange={() => handleAccountToggle(platform, account.id, page.id)}
                                        />
                                        {page.pageImage && (
                                          <img
                                            src={page.pageImage}
                                            alt={page.pageName}
                                            className="w-5 h-5 rounded-full flex-shrink-0"
                                          />
                                        )}
                                        <Label className="flex-1 cursor-pointer text-sm truncate">
                                          {page.pageName}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Total posts to create:</strong> {selectedAccounts.length}
                  <div className="mt-2 text-xs">
                    {platforms.map(platform => {
                      const count = selectedAccounts.filter(s => s.platform === platform).length;
                      return count > 0 ? (
                        <div key={platform}>• {platform}: {count} post{count !== 1 ? 's' : ''}</div>
                      ) : null;
                    })}
                  </div>
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCloseAttempt} disabled={isScheduling}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isScheduling || isLoading || selectedAccounts.length === 0}>
            {isScheduling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Schedule {selectedAccounts.length} Post{selectedAccounts.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Close Confirmation Dialog */}
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Close Without Scheduling?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have selected {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} but haven't scheduled the post yet. 
            Are you sure you want to close? Your selections will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue Editing</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Close Without Scheduling
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
