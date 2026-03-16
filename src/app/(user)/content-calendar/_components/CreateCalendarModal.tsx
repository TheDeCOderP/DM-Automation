"use client";

import { useState } from "react";
import { toast } from "sonner";
import { 
  X, 
  Loader2, 
  Sparkles, 
  AlertTriangle,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Pin,
  MessageCircle,
  Music,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/utils/format";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Platform } from "@prisma/client";

interface CreateCalendarModalProps {
  brandId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PLATFORMS = [
  { value: "LINKEDIN", label: "LinkedIn", icon: Linkedin, color: "text-primary" },
  { value: "TWITTER", label: "Twitter", icon: Twitter, color: "text-sky-500" },
  { value: "INSTAGRAM", label: "Instagram", icon: Instagram, color: "text-pink-600" },
  { value: "FACEBOOK", label: "Facebook", icon: Facebook, color: "text-primary" },
  { value: "YOUTUBE", label: "YouTube", icon: Youtube, color: "text-red-600" },
  { value: "PINTEREST", label: "Pinterest", icon: Pin, color: "text-red-500" },
  { value: "REDDIT", label: "Reddit", icon: MessageCircle, color: "text-orange-600" },
  { value: "TIKTOK", label: "TikTok", icon: Music, color: "text-black dark:text-white" },
];

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
  { value: "traffic", label: "Drive Traffic (visit website, read more)" },
  { value: "leads", label: "Lead Gen (DM, sign up, download)" },
  { value: "sales", label: "Sales (buy, get offer, limited time)" },
  { value: "community", label: "Community (tag someone, join group)" },
  { value: "awareness", label: "Awareness (follow, save, subscribe)" },
];

const LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Spanish", label: "Spanish" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Hindi", label: "Hindi" },
  { value: "Arabic", label: "Arabic" },
  { value: "Italian", label: "Italian" },
  { value: "Dutch", label: "Dutch" },
  { value: "Japanese", label: "Japanese" },
];

const CONTENT_PILLAR_OPTIONS = [
  "Educational", "Inspirational", "Promotional", "Behind-the-scenes",
  "User-generated", "Trending/News", "Case studies", "Tips & Tricks",
  "Product showcase", "Community", "Storytelling", "How-to guides",
];

export default function CreateCalendarModal({
  brandId,
  onClose,
  onSuccess,
}: CreateCalendarModalProps) {
  // Basic fields
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);

  // Enhanced prompt fields
  const [tone, setTone] = useState("professional");
  const [ctaStyle, setCtaStyle] = useState("engagement");
  const [targetAudience, setTargetAudience] = useState("");
  const [language, setLanguage] = useState("English");
  const [hashtagCount, setHashtagCount] = useState(5);
  const [selectedPillars, setSelectedPillars] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const hasFormData = () =>
    topic.trim() !== "" ||
    selectedPlatforms.length > 0 ||
    duration !== 30 ||
    postsPerWeek !== 5 ||
    startDate !== new Date().toISOString().split("T")[0];

  const handleCloseAttempt = () => {
    if (isGenerating) {
      toast.error("Please wait while content is being generated...");
      return;
    }
    if (hasFormData()) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);
  const endDateStr = endDate.toISOString().split("T")[0];

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handlePillarToggle = (pillar: string) => {
    setSelectedPillars((prev) =>
      prev.includes(pillar) ? prev.filter((p) => p !== pillar) : [...prev, pillar]
    );
  };

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error("Please enter a topic"); return; }
    if (selectedPlatforms.length === 0) { toast.error("Please select at least one platform"); return; }
    if (duration < 7 || duration > 90) { toast.error("Duration must be between 7 and 90 days"); return; }
    if (postsPerWeek < 1 || postsPerWeek > 14) { toast.error("Posts per week must be between 1 and 14"); return; }

    setIsGenerating(true);
    setProgress("Creating calendar structure...");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      setProgress("Generating content ideas (this may take 30-60 seconds)...");

      const response = await fetch("/api/content-calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          topic,
          duration,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate.toISOString(),
          platforms: selectedPlatforms,
          postsPerWeek,
          // Enhanced fields
          tone,
          ctaStyle,
          targetAudience: targetAudience.trim() || undefined,
          language,
          hashtagCount,
          contentPillars: selectedPillars.length > 0 ? selectedPillars : undefined,
          customInstructions: customInstructions.trim() || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 503) throw new Error("AI service is experiencing high demand. Please try again in a few moments.");
        else if (response.status === 429) throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        throw new Error(error.error || "Failed to generate calendar");
      }

      const data = await response.json();

      if (data.needsCaptions && data.calendar?.items) {
        setProgress(`Generating captions for ${data.calendar.items.length} posts...`);
        const itemIds = data.calendar.items.map((item: any) => item.id);
        const BATCH_SIZE = 3;

        for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
          const batchIds = itemIds.slice(i, i + BATCH_SIZE);
          setProgress(`Generating captions ${i + 1}-${Math.min(i + BATCH_SIZE, itemIds.length)} of ${itemIds.length}...`);

          try {
            const captionController = new AbortController();
            const captionTimeoutId = setTimeout(() => captionController.abort(), 120000);

            await fetch("/api/content-calendar/generate-captions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                calendarId: data.calendar.id,
                itemIds: batchIds,
                // Pass enhanced settings to caption generation
                tone,
                ctaStyle,
                targetAudience: targetAudience.trim() || undefined,
                language,
                hashtagCount,
                contentPillars: selectedPillars.length > 0 ? selectedPillars : undefined,
                customInstructions: customInstructions.trim() || undefined,
              }),
              signal: captionController.signal,
            });

            clearTimeout(captionTimeoutId);
          } catch (batchError) {
            console.error(`Error in caption batch ${i}:`, batchError);
          }
        }
      }

      toast.success(`Calendar generated! ${data.calendar.items.length} posts created.`);
      onSuccess();
    } catch (error: any) {
      console.error("Error generating calendar:", error);
      if (error.name === "AbortError") {
        toast.error("Request timed out. Please try again.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to generate calendar");
      }
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  const totalPosts = Math.ceil((duration / 7) * postsPerWeek) * selectedPlatforms.length;

  return (
    <>
      <Dialog open onOpenChange={handleCloseAttempt}>
        <DialogContent
          className="!max-w-[1200px] !w-[95vw] max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            if (isGenerating) { e.preventDefault(); toast.error("Please wait while content is being generated..."); }
          }}
          onEscapeKeyDown={(e) => {
            if (isGenerating) { e.preventDefault(); toast.error("Please wait while content is being generated..."); }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Content Calendar
            </DialogTitle>
            <DialogDescription>
              AI will generate platform-specific content for your selected duration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="topic">
                Topic / Theme <span className="text-red-500">*</span>
              </Label>
              <Input
                id="topic"
                placeholder="e.g., Digital Marketing Tips, Fitness Motivation, Cooking Recipes"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            {/* Date + Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date <span className="text-red-500">*</span></Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isGenerating}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Days) <span className="text-red-500">*</span></Label>
                <div className="flex gap-2 mb-2">
                  {[7, 14, 30, 90].map((d) => (
                    <Button key={d} type="button" variant={duration === d ? "default" : "outline"} size="sm"
                      onClick={() => setDuration(d)} disabled={isGenerating}>
                      {d === 7 ? "1W" : d === 14 ? "2W" : d === 30 ? "1M" : "3M"}
                    </Button>
                  ))}
                </div>
                <Input id="duration" type="number" min={7} max={90} value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))} disabled={isGenerating} />
              </div>
            </div>

            {/* Posts Per Week */}
            <div className="space-y-2">
              <Label htmlFor="postsPerWeek">Posts Per Week <span className="text-red-500">*</span></Label>
              <Input id="postsPerWeek" type="number" min={1} max={14} value={postsPerWeek}
                onChange={(e) => setPostsPerWeek(parseInt(e.target.value))} disabled={isGenerating} />
            </div>

            {/* Platforms */}
            <div className="space-y-3">
              <Label>Select Platforms <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PLATFORMS.map((platform) => {
                  const IconComponent = platform.icon;
                  return (
                    <div key={platform.value}
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPlatforms.includes(platform.value as Platform)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handlePlatformToggle(platform.value as Platform)}
                    >
                      <Checkbox checked={selectedPlatforms.includes(platform.value as Platform)}
                        onCheckedChange={() => handlePlatformToggle(platform.value as Platform)} />
                      <IconComponent className={`w-5 h-5 ${platform.color}`} />
                      <Label className="cursor-pointer flex-1">{platform.label}</Label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tone + Language */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand Tone / Voice <span className="text-red-500">*</span></Label>
                <Select value={tone} onValueChange={setTone} disabled={isGenerating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language <span className="text-red-500">*</span></Label>
                <Select value={language} onValueChange={setLanguage} disabled={isGenerating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CTA Style + Hashtag Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTA Goal <span className="text-red-500">*</span></Label>
                <Select value={ctaStyle} onValueChange={setCtaStyle} disabled={isGenerating}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CTA_STYLES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hashtagCount">Hashtags Per Post</Label>
                <div className="flex gap-2">
                  {[3, 5, 10, 15, 20].map((n) => (
                    <Button key={n} type="button" variant={hashtagCount === n ? "default" : "outline"} size="sm"
                      onClick={() => setHashtagCount(n)} disabled={isGenerating}>
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Input
                id="targetAudience"
                placeholder="e.g., Small business owners aged 25-45, fitness enthusiasts, B2B SaaS founders"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            {/* Content Pillars */}
            <div className="space-y-2">
              <Label>Content Pillars (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_PILLAR_OPTIONS.map((pillar) => (
                  <Badge
                    key={pillar}
                    variant={selectedPillars.includes(pillar) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => !isGenerating && handlePillarToggle(pillar)}
                  >
                    {pillar}
                  </Badge>
                ))}
              </div>
              {selectedPillars.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedPillars.length} pillar(s) selected</p>
              )}
            </div>

            {/* Advanced / Custom Instructions toggle */}
            <div>
              <Button type="button" variant="ghost" size="sm" className="gap-1 px-0 text-muted-foreground"
                onClick={() => setShowAdvanced(!showAdvanced)} disabled={isGenerating}>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAdvanced ? "Hide" : "Show"} custom instructions
              </Button>
              {showAdvanced && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="customInstructions">Custom Instructions</Label>
                  <Textarea
                    id="customInstructions"
                    placeholder="e.g., Always mention our free trial. Avoid competitor names. Use UK English spelling. Include a statistic in every post."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={3}
                    disabled={isGenerating}
                    className="resize-none"
                  />
                </div>
              )}
            </div>

            {/* Summary */}
            {selectedPlatforms.length > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-1 text-sm">
                <p className="font-semibold mb-2">Summary</p>
                <p>• Date range: {formatDate(startDate)} — {formatDate(endDateStr)}</p>
                <p>• {Math.ceil((duration / 7) * postsPerWeek)} content ideas across {selectedPlatforms.length} platform(s)</p>
                <p>• Tone: {TONE_OPTIONS.find(t => t.value === tone)?.label} · Language: {language}</p>
                <p>• CTA goal: {CTA_STYLES.find(c => c.value === ctaStyle)?.label}</p>
                <p>• ~{hashtagCount} hashtags per post</p>
                {selectedPillars.length > 0 && <p>• Pillars: {selectedPillars.join(", ")}</p>}
                {targetAudience && <p>• Audience: {targetAudience}</p>}
                <p className="text-muted-foreground pt-1">Estimated time: 2–5 minutes</p>
              </div>
            )}

            {/* Progress */}
            {isGenerating && (
              <div className="p-4 bg-primary/5 rounded-lg flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                <div>
                  <p className="font-medium">{progress}</p>
                  <p className="text-sm text-muted-foreground">Please don't close this window.</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCloseAttempt} disabled={isGenerating}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate Calendar</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Discard Changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowCloseConfirm(false); onClose(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
