"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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

interface Selection {
  socialAccountId: string;
  socialAccountPageId: string | null;
}

interface EditPlatformAccountModalProps {
  calendarId: string;
  platform: string;
  accounts: SocialAccount[];
  currentSelections: Selection[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPlatformAccountModal({
  calendarId,
  platform,
  accounts,
  currentSelections,
  onClose,
  onSuccess,
}: EditPlatformAccountModalProps) {
  const [selected, setSelected] = useState<Selection[]>(currentSelections);
  const [isSaving, setIsSaving] = useState(false);

  const platformAccounts = accounts.filter((a) => a.platform === platform);

  const isSelected = (accountId: string, pageId: string | null) =>
    selected.some(
      (s) => s.socialAccountId === accountId && s.socialAccountPageId === pageId
    );

  const toggle = (accountId: string, pageId: string | null) => {
    setSelected((prev) => {
      const exists = prev.some(
        (s) => s.socialAccountId === accountId && s.socialAccountPageId === pageId
      );
      if (exists) {
        return prev.filter(
          (s) => !(s.socialAccountId === accountId && s.socialAccountPageId === pageId)
        );
      }
      return [...prev, { socialAccountId: accountId, socialAccountPageId: pageId }];
    });
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one account or page");
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
          <DialogTitle>Change Account — {platform}</DialogTitle>
          <DialogDescription>
            Select accounts/pages for all scheduled {platform} posts. Multiple selection allowed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {platformAccounts.length === 0 ? (
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
              disabled={isSaving || selected.length === 0 || platformAccounts.length === 0}
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
