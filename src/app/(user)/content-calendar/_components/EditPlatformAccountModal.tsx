"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Store, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Page {
  id: string;
  pageName: string;
  pageImage?: string;
}

interface SocialAccount {
  id: string;
  platform: string;
  platformUsername: string;
  platformUserImage?: string;
  pages?: Page[];
}

interface GbpLocation {
  id: string;
  title: string;
  storeCode?: string | null;
  socialAccountId: string;
}

interface Selection {
  socialAccountId: string;
  socialAccountPageId: string | null;
  gbpLocationId?: string | null;
}

interface EditPlatformAccountModalProps {
  calendarId: string;
  platform: string;
  accounts: SocialAccount[];
  gbpLocations?: GbpLocation[];
  currentSelections: Selection[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPlatformAccountModal({
  calendarId,
  platform,
  accounts,
  gbpLocations = [],
  currentSelections,
  onClose,
  onSuccess,
}: EditPlatformAccountModalProps) {
  const [selected, setSelected] = useState<Selection[]>(currentSelections);
  const [isSaving, setIsSaving] = useState(false);

  const platformAccounts = accounts.filter((a) => a.platform === platform);
  const isGbpPlatform = platform === "GOOGLE_BUSINESS_PROFILE";

  const isSelected = (accountId: string, pageId: string | null, gbpLocId?: string | null) =>
    selected.some(
      (s) =>
        gbpLocId
          ? s.gbpLocationId === gbpLocId
          : s.socialAccountId === accountId && s.socialAccountPageId === pageId
    );

  const toggle = (accountId: string, pageId: string | null, gbpLocId?: string | null) => {
    setSelected((prev) => {
      const exists = prev.some((s) =>
        gbpLocId
          ? s.gbpLocationId === gbpLocId
          : s.socialAccountId === accountId && s.socialAccountPageId === pageId
      );
      
      if (exists) {
        return prev.filter((s) =>
          gbpLocId
            ? s.gbpLocationId !== gbpLocId
            : !(s.socialAccountId === accountId && s.socialAccountPageId === pageId)
        );
      }
      
      return [...prev, { socialAccountId: accountId, socialAccountPageId: pageId, gbpLocationId: gbpLocId }];
    });
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one account, page, or location");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/content-calendar/${calendarId}/update-platform-account`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, selections: selected }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }

      toast.success("Account selection updated for all posts");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Account — {isGbpPlatform ? "Google Business" : platform}</DialogTitle>
          <DialogDescription>
            Select {isGbpPlatform ? "locations" : "accounts/pages"} for all scheduled {isGbpPlatform ? "Google Business" : platform} posts. Multiple selection allowed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-2">
          {isGbpPlatform ? (
            /* ─── GOOGLE BUSINESS PROFILE LOCATIONS ─── */
            gbpLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Google Business locations connected to this brand.
              </p>
            ) : (
              gbpLocations.map((location) => (
                <div key={location.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`loc-${location.id}`}
                    checked={isSelected(location.socialAccountId, null, location.id)}
                    onCheckedChange={() => toggle(location.socialAccountId, null, location.id)}
                  />
                  <Avatar className="size-10 bg-blue-50">
                    <AvatarFallback className="bg-blue-50 text-blue-700">
                      <Store className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={`loc-${location.id}`} className="cursor-pointer font-semibold text-sm block truncate">
                      {location.title}
                    </Label>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                      <MapPin className="size-3 shrink-0" />
                      {location.storeCode || "Primary location"}
                    </p>
                  </div>
                </div>
              ))
            )
          ) : (
            /* ─── STANDARD SOCIAL ACCOUNTS & PAGES ─── */
            platformAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No {platform} accounts connected to this brand.
              </p>
            ) : (
              platformAccounts.map((account) => (
                <div key={account.id} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                  {/* Account row */}
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 border-b pb-3">
                    <Checkbox
                      checked={isSelected(account.id, null)}
                      onCheckedChange={() => toggle(account.id, null)}
                    />
                    {account.platformUserImage && (
                      <img
                        src={account.platformUserImage}
                        alt={account.platformUsername}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <Label className="flex-1 cursor-pointer font-medium text-sm">
                      {account.platformUsername}
                    </Label>
                  </div>

                  {/* Pages */}
                  {account.pages && account.pages.length > 0 && (
                    <div className="ml-4 space-y-1">
                      <p className="text-xs text-muted-foreground mb-1">Pages:</p>
                      {account.pages.map((page) => (
                        <div
                          key={page.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 border"
                        >
                          <Checkbox
                            checked={isSelected(account.id, page.id)}
                            onCheckedChange={() => toggle(account.id, page.id)}
                          />
                          {page.pageImage && (
                            <img
                              src={page.pageImage}
                              alt={page.pageName}
                              className="w-5 h-5 rounded-full"
                            />
                          )}
                          <Label className="flex-1 cursor-pointer text-sm">
                            {page.pageName}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {selected.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || selected.length === 0 || (isGbpPlatform ? gbpLocations.length === 0 : platformAccounts.length === 0)}
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Apply to All Posts
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}