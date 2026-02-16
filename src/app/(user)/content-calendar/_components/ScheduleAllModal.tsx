"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ScheduleAllModalProps {
  calendarId: string;
  itemsCount: number;
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

export default function ScheduleAllModal({
  calendarId,
  itemsCount,
  platforms,
  brandId,
  onClose,
  onSuccess,
}: ScheduleAllModalProps) {
  const [isScheduling, setIsScheduling] = useState(false);
  const [progress, setProgress] = useState("");
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});
  const [selectedPages, setSelectedPages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch social accounts for the brand
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`/api/brands/${brandId}/social-accounts`);
        if (!response.ok) throw new Error("Failed to fetch accounts");
        
        const data = await response.json();
        setSocialAccounts(data.accounts || []);
        
        // Auto-select first account for each platform
        const autoSelected: Record<string, string> = {};
        const autoSelectedPages: Record<string, string> = {};
        
        platforms.forEach((platform) => {
          const account = data.accounts?.find((acc: SocialAccount) => acc.platform === platform);
          if (account) {
            autoSelected[platform] = account.id;
            // Auto-select first page if available
            if (account.pages && account.pages.length > 0) {
              autoSelectedPages[platform] = account.pages[0].id;
            }
          }
        });
        
        setSelectedAccounts(autoSelected);
        setSelectedPages(autoSelectedPages);
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast.error("Failed to load social accounts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [brandId, platforms]);

  const handleSchedule = async () => {
    // Validate that all platforms have selected accounts
    const missingPlatforms = platforms.filter(p => !selectedAccounts[p]);
    if (missingPlatforms.length > 0) {
      toast.error(`Please select accounts for: ${missingPlatforms.join(", ")}`);
      return;
    }

    setIsScheduling(true);
    setProgress("Creating posts and cron jobs...");

    try {
      const response = await fetch("/api/content-calendar/schedule-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId,
          accountSelections: platforms.map(platform => ({
            platform,
            socialAccountId: selectedAccounts[platform],
            socialAccountPageId: selectedPages[platform] || null,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to schedule posts");
      }

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        toast.warning(
          `Scheduled ${data.scheduled} posts with ${data.errors.length} errors`
        );
      } else {
        toast.success(`Successfully scheduled ${data.scheduled} posts!`);
      }

      onSuccess();
    } catch (error) {
      console.error("Error scheduling posts:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to schedule posts"
      );
    } finally {
      setIsScheduling(false);
      setProgress("");
    }
  };

  const getAccountsForPlatform = (platform: string) => {
    return socialAccounts.filter(acc => acc.platform === platform);
  };

  const getSelectedAccount = (platform: string) => {
    const accountId = selectedAccounts[platform];
    return socialAccounts.find(acc => acc.id === accountId);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule All Posts</DialogTitle>
          <DialogDescription>
            Select social accounts and pages for {itemsCount} calendar items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Platform Account Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold">Select Accounts for Each Platform</h3>
                {platforms.map((platform) => {
                  const accounts = getAccountsForPlatform(platform);
                  const selectedAccount = getSelectedAccount(platform);
                  
                  return (
                    <div key={platform} className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Badge>{platform}</Badge>
                        </Label>
                      </div>
                      
                      {accounts.length === 0 ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No {platform} account connected. Please connect an account first.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <Select
                            value={selectedAccounts[platform] || ""}
                            onValueChange={(value) => {
                              setSelectedAccounts(prev => ({ ...prev, [platform]: value }));
                              // Reset page selection when account changes
                              setSelectedPages(prev => {
                                const newPages = { ...prev };
                                delete newPages[platform];
                                return newPages;
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex items-center gap-2">
                                    {account.platformUserImage && (
                                      <img
                                        src={account.platformUserImage}
                                        alt={account.platformUsername}
                                        className="w-5 h-5 rounded-full"
                                      />
                                    )}
                                    <span>{account.platformUsername}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Page Selection (for Facebook, etc.) */}
                          {selectedAccount && selectedAccount.pages && selectedAccount.pages.length > 0 && (
                            <div className="mt-2">
                              <Label className="text-sm text-muted-foreground">Select Page</Label>
                              <Select
                                value={selectedPages[platform] || ""}
                                onValueChange={(value) => {
                                  setSelectedPages(prev => ({ ...prev, [platform]: value }));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select page" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedAccount.pages.map((page) => (
                                    <SelectItem key={page.id} value={page.id}>
                                      <div className="flex items-center gap-2">
                                        {page.pageImage && (
                                          <img
                                            src={page.pageImage}
                                            alt={page.pageName}
                                            className="w-5 h-5 rounded-full"
                                          />
                                        )}
                                        <span>{page.pageName}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Posts will be created for all selected platforms</li>
                    <li>Cron jobs will be set up for automatic publishing</li>
                    <li>Posts will publish at their suggested times</li>
                    <li>You can view scheduled posts in the Posts page</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {isScheduling && (
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{progress}</p>
                      <p className="text-sm text-muted-foreground">
                        This may take 10-30 seconds...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isScheduling}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isScheduling || isLoading}>
            {isScheduling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Schedule {itemsCount} Posts
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
