"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Loader2, Save, Upload, Image as ImageIcon, Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { toDateTimeLocalString, fromDateTimeLocalString } from "@/utils/format";

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

interface EditCalendarItemModalProps {
  item: any;
  platforms: string[];
  onClose: () => void;
  onSuccess: () => void;
}

// Reference image configurations
const REFERENCE_IMAGES = [
  { 
    value: 'square-1-1', 
    label: 'Square (1:1)', 
    file: '/reference-images/square-1-1.png',
    platforms: ['LINKEDIN', 'INSTAGRAM', 'FACEBOOK'],
    size: '1080x1080'
  },
  { 
    value: 'landscape-16-9', 
    label: 'Landscape (16:9)', 
    file: '/reference-images/landscape-16-9.png',
    platforms: ['YOUTUBE', 'TWITTER', 'REDDIT'],
    size: '1920x1080'
  },
  { 
    value: 'portrait-9-16', 
    label: 'Portrait (9:16)', 
    file: '/reference-images/portrait-9-16.png',
    platforms: ['TIKTOK', 'INSTAGRAM'],
    size: '1080x1920'
  },
  { 
    value: 'standard-4-3', 
    label: 'Standard (4:3)', 
    file: '/reference-images/standard-4-3.png',
    platforms: ['FACEBOOK'],
    size: '1600x1200'
  },
  { 
    value: 'portrait-3-4', 
    label: 'Portrait (3:4)', 
    file: '/reference-images/portrait-3-4.png',
    platforms: ['PINTEREST'],
    size: '1200x1600'
  },
];

export default function EditCalendarItemModal({
  item,
  platforms,
  onClose,
  onSuccess,
}: EditCalendarItemModalProps) {
  const [topic, setTopic] = useState(item.topic);
  const [captions, setCaptions] = useState({
    LINKEDIN: item.captionLinkedIn || "",
    TWITTER: item.captionTwitter || "",
    INSTAGRAM: item.captionInstagram || "",
    FACEBOOK: item.captionFacebook || "",
    YOUTUBE: item.captionYouTube || "",
    PINTEREST: item.captionPinterest || "",
    REDDIT: item.captionReddit || "",
    TIKTOK: item.captionTikTok || "",
  });
  const [hashtags, setHashtags] = useState<string[]>(item.hashtags || []);
  const [hashtagInput, setHashtagInput] = useState("");
  const [imagePrompt, setImagePrompt] = useState(item.imagePrompt || "");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item.imageUrl || null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("");
  const [suggestedTime, setSuggestedTime] = useState(
    toDateTimeLocalString(item.suggestedTime)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Regenerate caption state
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [regenTone, setRegenTone] = useState("professional");
  const [regenCta, setRegenCta] = useState("engagement");
  const [regenHashtagCount, setRegenHashtagCount] = useState(5);
  const [regenCustom, setRegenCustom] = useState("");
  const [keepExisting, setKeepExisting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingPlatform, setRegeneratingPlatform] = useState<string | null>(null);

  // Update imagePreview when item changes (when modal reopens with updated data)
  useEffect(() => {
    if (item.imageUrl) {
      setImagePreview(item.imageUrl);
    }
  }, [item.imageUrl]);

  // Sync suggestedTime when item changes
  useEffect(() => {
    setSuggestedTime(toDateTimeLocalString(item.suggestedTime));
  }, [item.suggestedTime]);

  // Auto-select aspect ratio based on platforms
  useEffect(() => {
    if (platforms.length > 0 && !selectedAspectRatio) {
      const platform = platforms[0];
      const matchingRef = REFERENCE_IMAGES.find(ref => 
        ref.platforms.includes(platform)
      );
      if (matchingRef) {
        setSelectedAspectRatio(matchingRef.value);
      }
    }
  }, [platforms, selectedAspectRatio]);

  const handleCaptionChange = (platform: string, value: string) => {
    setCaptions((prev) => ({ ...prev, [platform]: value }));
  };

  const handleAddHashtag = () => {
    if (hashtagInput.trim()) {
      const tag = hashtagInput.trim().replace(/^#/, "");
      if (!hashtags.includes(tag)) {
        setHashtags([...hashtags, tag]);
      }
      setHashtagInput("");
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      
      // Convert to base64 for preview and saving
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        toast.success("Image uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Please enter an image prompt");
      return;
    }

    if (!selectedAspectRatio) {
      toast.error("Please select an aspect ratio");
      return;
    }

    setIsGeneratingImage(true);

    try {
      // Get reference image from public folder
      const referenceImage = REFERENCE_IMAGES.find(ref => ref.value === selectedAspectRatio);
      if (!referenceImage) {
        throw new Error("Reference image not found");
      }

      // Fetch reference image and convert to base64
      const response = await fetch(referenceImage.file);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Generate image with reference
      const generateResponse = await fetch("/api/ai-agent/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          referenceImageBase64: base64,
        }),
      });

      if (!generateResponse.ok) {
        const error = await generateResponse.json();
        throw new Error(error.error || "Failed to generate image");
      }

      const data = await generateResponse.json();
      
      // Set the generated image as preview
      setImagePreview(data.imageUrl);
      toast.success(`Image generated successfully in ${referenceImage.label} format!`);
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate image"
      );
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleRegenerateCaptions = async (platformFilter?: string) => {
    if (platformFilter) setRegeneratingPlatform(platformFilter);
    else setIsRegenerating(true);

    try {
      const res = await fetch("/api/content-calendar/regenerate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          platforms: platformFilter ? [platformFilter] : platforms,
          tone: regenTone,
          ctaStyle: regenCta,
          hashtagCount: regenHashtagCount,
          customInstructions: regenCustom.trim() || undefined,
          keepExisting,
          existingCaptions: keepExisting ? captions : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to regenerate");
      }

      const data = await res.json();
      const updated = data.captions as Record<string, { caption: string; hashtags: string[] }>;

      setCaptions((prev) => {
        const next = { ...prev };
        for (const [platform, val] of Object.entries(updated)) {
          if (platform in next) next[platform as keyof typeof next] = val.caption;
        }
        return next;
      });

      // Merge new hashtags
      const newTags = Object.values(updated).flatMap((v) => v.hashtags);
      setHashtags((prev) => Array.from(new Set([...prev, ...newTags])));

      toast.success(platformFilter ? `${platformFilter} caption regenerated` : "All captions regenerated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate");
    } finally {
      setIsRegenerating(false);
      setRegeneratingPlatform(null);
    }
  };

  const handleSave = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    // Validate suggested time is in the future
    if (suggestedTime) {
      const scheduledDate = new Date(suggestedTime);
      const now = new Date();
      if (scheduledDate <= now) {
        toast.error("Suggested time must be in the future");
        return;
      }
    }

    setIsSaving(true);

    try {
      // Save all changes including suggestedTime to database
      const response = await fetch(`/api/content-calendar/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          captionLinkedIn: captions.LINKEDIN,
          captionTwitter: captions.TWITTER,
          captionInstagram: captions.INSTAGRAM,
          captionFacebook: captions.FACEBOOK,
          captionYouTube: captions.YOUTUBE,
          captionPinterest: captions.PINTEREST,
          captionReddit: captions.REDDIT,
          captionTikTok: captions.TIKTOK,
          hashtags,
          imagePrompt,
          imageUrl: imagePreview || item.imageUrl,
          suggestedTime: suggestedTime ? fromDateTimeLocalString(suggestedTime) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update item");
      }

      toast.success("Item updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update item"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      LINKEDIN: "💼",
      TWITTER: "🐦",
      INSTAGRAM: "📸",
      FACEBOOK: "👥",
      YOUTUBE: "📺",
      PINTEREST: "📌",
      REDDIT: "🤖",
      TIKTOK: "🎵",
    };
    return icons[platform] || "📱";
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="!max-w-[1300px] !w-[98vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Calendar Item - Day {item.day}</DialogTitle>
          <DialogDescription>
            Edit captions, hashtags, and scheduling details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Suggested Time */}
          <DateTimePicker
            value={suggestedTime}
            onChange={setSuggestedTime}
            disabled={isSaving}
            label="Suggested Posting Time"
            required
          />

          {/* Regenerate Captions */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              onClick={() => setShowRegenerate(!showRegenerate)}
              disabled={isSaving}
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                Regenerate Captions with AI
              </span>
              {showRegenerate ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRegenerate && (
              <div className="px-4 pb-4 pt-2 space-y-4 border-t bg-muted/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tone / Voice</Label>
                    <Select value={regenTone} onValueChange={setRegenTone}>
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
                    <Select value={regenCta} onValueChange={setRegenCta}>
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
                        variant={regenHashtagCount === n ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRegenHashtagCount(n)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom Instructions</Label>
                  <Textarea
                    placeholder="e.g., Mention our free trial. Use UK English. Include a statistic."
                    value={regenCustom}
                    onChange={(e) => setRegenCustom(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/40">
                  <input
                    type="checkbox"
                    id="keepExisting"
                    checked={keepExisting}
                    onChange={(e) => setKeepExisting(e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="keepExisting" className="text-sm font-medium cursor-pointer">
                      Keep existing content, only enhance
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AI will keep your current captions and only append the CTA, custom instructions, or additional content — without rewriting from scratch.
                    </p>
                  </div>
                </div>

                {/* Per-platform buttons + regenerate all */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Regenerate specific platform</Label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <Button
                        key={platform}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isRegenerating || regeneratingPlatform !== null}
                        onClick={() => handleRegenerateCaptions(platform)}
                      >
                        {regeneratingPlatform === platform ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        {getPlatformIcon(platform)} {platform}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => handleRegenerateCaptions()}
                  disabled={isRegenerating || regeneratingPlatform !== null}
                >
                  {isRegenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Regenerating all platforms...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Regenerate All Platforms</>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Platform Captions */}
          <div className="space-y-2">
            <Label>Platform Captions</Label>
            <Tabs defaultValue={platforms[0]} className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${platforms.length}, 1fr)` }}>
                {platforms.map((platform: string) => (
                  <TabsTrigger key={platform} value={platform}>
                    <span className="mr-1">{getPlatformIcon(platform)}</span>
                    {platform}
                  </TabsTrigger>
                ))}
              </TabsList>

              {platforms.map((platform: string) => (
                <TabsContent key={platform} value={platform} className="space-y-2">
                  <Textarea
                    placeholder={`Enter ${platform} caption...`}
                    value={captions[platform as keyof typeof captions]}
                    onChange={(e) => handleCaptionChange(platform, e.target.value)}
                    rows={8}
                    disabled={isSaving}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground">
                    {captions[platform as keyof typeof captions].length} characters
                  </p>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add hashtag (without #)"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddHashtag();
                  }
                }}
                disabled={isSaving}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddHashtag}
                disabled={isSaving}
              >
                Add
              </Button>
            </div>
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {hashtags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveHashtag(tag)}
                  >
                    #{tag} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Image Generation */}
          <div className="space-y-3">
            <Label>Image</Label>
            
            <Tabs defaultValue="generate" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generate">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </TabsTrigger>
              </TabsList>

              {/* AI Generation Tab */}
              <TabsContent value="generate" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column - Form Fields */}
                  <div className="space-y-3">
                    {/* Aspect Ratio Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="aspectRatio">
                        Aspect Ratio <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={selectedAspectRatio}
                        onValueChange={setSelectedAspectRatio}
                        disabled={isGeneratingImage}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select aspect ratio" />
                        </SelectTrigger>
                        <SelectContent>
                          {REFERENCE_IMAGES.map((ref) => (
                            <SelectItem key={ref.value} value={ref.value}>
                              <div className="flex items-center justify-between w-full">
                                <span>{ref.label}</span>
                                <Badge variant="outline" className="ml-2">
                                  {ref.size}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedAspectRatio && (
                        <p className="text-xs text-muted-foreground">
                          Best for: {REFERENCE_IMAGES.find(r => r.value === selectedAspectRatio)?.platforms.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Image Prompt */}
                    <div className="space-y-2">
                      <Label htmlFor="imagePrompt">
                        Image Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="imagePrompt"
                        placeholder="Describe the image you want AI to generate..."
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        rows={4}
                        disabled={isGeneratingImage}
                        className="resize-none"
                      />
                    </div>

                    {/* Generate Button */}
                    <Button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={!imagePrompt.trim() || !selectedAspectRatio || isGeneratingImage}
                      className="w-full"
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Image...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Image with AI
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      💡 AI will automatically generate image in the selected aspect ratio
                    </p>
                  </div>

                  {/* Right Column - Preview */}
                  <div className="flex items-start justify-center">
                    {imagePreview ? (
                      <div className="border rounded-lg p-4 w-full">
                        <Label className="text-sm mb-2 block">Preview:</Label>
                        <img
                          src={imagePreview}
                          alt="Generated"
                          className="max-h-60 mx-auto rounded"
                        />
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-8 w-full flex items-center justify-center text-muted-foreground text-sm">
                        Preview will appear here
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Upload Tab */}
              <TabsContent value="upload" className="space-y-3">
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isSaving}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-60 mx-auto rounded"
                        />
                        <p className="text-sm text-muted-foreground">
                          Click to change image
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-medium mb-1">
                          Click to upload image
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WebP up to 10MB
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
