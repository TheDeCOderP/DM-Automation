"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & Friendly" },
  { value: "inspirational", label: "Inspirational" },
  { value: "educational", label: "Educational" },
  { value: "humorous", label: "Humorous" },
  { value: "authoritative", label: "Authoritative" },
  { value: "conversational", label: "Conversational" },
  { value: "storytelling", label: "Storytelling" },
];

const CTA_STYLES = [
  { value: "engagement", label: "Engagement (comment, share, like)" },
  { value: "traffic", label: "Drive Traffic (visit website)" },
  { value: "leads", label: "Lead Gen (DM, sign up, download)" },
  { value: "sales", label: "Sales (buy, get offer)" },
  { value: "community", label: "Community (tag someone, join group)" },
  { value: "awareness", label: "Awareness (follow, save, subscribe)" },
];

interface BulkRegenerateModalProps {
  items: { id: string; topic: string; captionLinkedIn?: string; captionTwitter?: string; captionInstagram?: string; captionFacebook?: string; captionYouTube?: string; captionPinterest?: string; captionReddit?: string; captionTikTok?: string }[];
  platforms: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const PLATFORM_CAPTION_MAP: Record<string, string> = {
  LINKEDIN: "captionLinkedIn",
  TWITTER: "captionTwitter",
  INSTAGRAM: "captionInstagram",
  FACEBOOK: "captionFacebook",
  YOUTUBE: "captionYouTube",
  PINTEREST: "captionPinterest",
  REDDIT: "captionReddit",
  TIKTOK: "captionTikTok",
};

export default function BulkRegenerateModal({ items, platforms, onClose, onSuccess }: BulkRegenerateModalProps) {
  const [tone, setTone] = useState("professional");
  const [ctaStyle, setCtaStyle] = useState("engagement");
  const [hashtagCount, setHashtagCount] = useState(5);
  const [customInstructions, setCustomInstructions] = useState("");
  const [keepExisting, setKeepExisting] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleRun = async () => {
    if (!confirm(`This will regenerate captions for all ${items.length} posts. Continue?`)) return;

    setIsRunning(true);
    setProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Build existingCaptions map for this item
      const existingCaptions: Record<string, string> = {};
      if (keepExisting) {
        for (const platform of platforms) {
          const key = PLATFORM_CAPTION_MAP[platform] as keyof typeof item;
          const val = item[key] as string | undefined;
          if (val) existingCaptions[platform] = val;
        }
      }

      try {
        const res = await fetch("/api/content-calendar/regenerate-caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: item.id,
            platforms,
            tone,
            ctaStyle,
            hashtagCount,
            customInstructions: customInstructions.trim() || undefined,
            keepExisting,
            existingCaptions: keepExisting ? existingCaptions : undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed");
        }

        successCount++;
      } catch {
        failCount++;
      }

      setProgress(i + 1);
    }

    setIsRunning(false);

    if (failCount === 0) {
      toast.success(`All ${successCount} posts updated successfully`);
    } else {
      toast.warning(`${successCount} updated, ${failCount} failed`);
    }

    onSuccess();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Bulk Regenerate All Posts
          </DialogTitle>
          <DialogDescription>
            Apply CTA, tone, and custom instructions to all {items.length} posts at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CTA Goal</Label>
              <Select value={ctaStyle} onValueChange={setCtaStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CTA_STYLES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Hashtags Per Post</Label>
            <div className="flex gap-2">
              {[3, 5, 10, 15, 20].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={hashtagCount === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHashtagCount(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Instructions</Label>
            <Textarea
              placeholder="e.g., Add a CTA to visit our website. Use UK English. Mention our free trial."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/40">
            <input
              type="checkbox"
              id="bulkKeepExisting"
              checked={keepExisting}
              onChange={(e) => setKeepExisting(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer"
            />
            <div>
              <label htmlFor="bulkKeepExisting" className="text-sm font-medium cursor-pointer">
                Keep existing content, only enhance
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI will keep current captions and only append the CTA / instructions. Uncheck to fully rewrite all posts.
              </p>
            </div>
          </div>

          {isRunning && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing posts...</span>
                <span>{progress} / {items.length}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(progress / items.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isRunning}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating {progress}/{items.length}...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Apply to All {items.length} Posts
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
