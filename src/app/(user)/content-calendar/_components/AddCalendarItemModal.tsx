"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Upload, Sparkles, Image as ImageIcon } from "lucide-react";
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

interface AddCalendarItemModalProps {
  calendarId: string;
  platforms: string[];
  nextDay: number;
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

export default function AddCalendarItemModal({
  calendarId,
  platforms,
  nextDay,
  onClose,
  onSuccess,
}: AddCalendarItemModalProps) {
  const [topic, setTopic] = useState("");
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [imagePrompt, setImagePrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
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

  const handleAdd = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    // Check if at least one caption is provided
    const hasCaptions = Object.values(captions).some((c) => c.trim());
    if (!hasCaptions) {
      toast.error("Please provide at least one caption");
      return;
    }

    setIsAdding(true);

    try {
      // First create the item
      const response = await fetch(`/api/content-calendar/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId,
          day: nextDay,
          topic,
          captionLinkedIn: captions.LINKEDIN || null,
          captionTwitter: captions.TWITTER || null,
          captionInstagram: captions.INSTAGRAM || null,
          captionFacebook: captions.FACEBOOK || null,
          captionYouTube: captions.YOUTUBE || null,
          captionPinterest: captions.PINTEREST || null,
          captionReddit: captions.REDDIT || null,
          captionTikTok: captions.TIKTOK || null,
          hashtags: [],
          status: "DRAFT",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add item");
      }

      toast.success("Item added successfully");
      onSuccess();
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add item"
      );
    } finally {
      setIsAdding(false);
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
          <DialogTitle>Add New Calendar Item</DialogTitle>
          <DialogDescription>
            Manually add a new post to your content calendar (Day {nextDay})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">
              Topic <span className="text-red-500">*</span>
            </Label>
            <Input
              id="topic"
              placeholder="e.g., 5 Tips for Better Marketing"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isAdding}
            />
          </div>

          {/* Platform Captions */}
          <div className="space-y-2">
            <Label>
              Platform Captions <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              Provide captions for the platforms you want to post on
            </p>
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
                    value={captions[platform] || ""}
                    onChange={(e) => handleCaptionChange(platform, e.target.value)}
                    rows={8}
                    disabled={isAdding}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground">
                    {(captions[platform] || "").length} characters
                  </p>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Image Generation */}
          <div className="space-y-3">
            <Label>Image (Optional)</Label>
            
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
                {/* Aspect Ratio Selection */}
                <div className="space-y-2">
                  <Label htmlFor="aspectRatio">Aspect Ratio</Label>
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
                  <Label htmlFor="imagePrompt">Image Description</Label>
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

                {/* Preview */}
                {imagePreview && (
                  <div className="border rounded-lg p-4">
                    <Label className="text-sm mb-2 block">Preview:</Label>
                    <img
                      src={imagePreview}
                      alt="Generated"
                      className="max-h-60 mx-auto rounded"
                    />
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  💡 AI will automatically generate image in the selected aspect ratio
                </p>
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
                    disabled={isAdding}
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
          <Button variant="outline" onClick={onClose} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isAdding}>
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
