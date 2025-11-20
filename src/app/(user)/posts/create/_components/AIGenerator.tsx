"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Sparkles, ImageIcon, Video, Upload, X } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AIGeneratorProps {
  onFileSelect: (file: File) => void;
}

export default function AIGenerator({ onFileSelect }: AIGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please upload a valid image file");
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai-agent/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate image");
      }

      const data = await response.json();

      if (data.imageBase64) {
        // Convert base64 to File object
        const base64Data = data.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });

        const file = new File([blob], `ai-generated-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        onFileSelect(file);
        toast.success("AI image generated successfully!");
        handleClose();
      } else {
        throw new Error("No image data returned from API");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setVideoStatus("Starting video generation...");

    try {
      let imageBase64 = null;

      // Convert uploaded image to base64 if provided
      if (uploadedImage) {
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(uploadedImage);
        });
      }

      const response = await fetch("/api/ai-agent/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt,
          imageBase64 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to start video generation");
      }

      const data = await response.json();

      if (data.success && data.taskId) {
        toast.success("Video generation started! This may take a few minutes...");
        pollVideoStatus(data.taskId);
      } else {
        throw new Error(data.error || "Failed to start video generation");
      }
    } catch (error) {
      console.error("Error generating video:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate video");
      setIsGenerating(false);
      setVideoStatus(null);
    }
  };

  const pollVideoStatus = async (taskId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/ai-agent/generate-video?taskId=${taskId}`);

        if (!response.ok) {
          throw new Error("Failed to check video status");
        }

        const data = await response.json();
        const status = data.status?.toLowerCase();

        setVideoStatus(`Status: ${status || "processing"}... (${attempts + 1}/${maxAttempts})`);

        if (status === "completed") {
          // Video is ready, fetch and add to files
          if (data.output && data.output[0]) {
            const videoUrl = data.output[0];
            const videoResponse = await fetch(videoUrl);
            const videoBlob = await videoResponse.blob();
            const file = new File([videoBlob], `ai-video-${Date.now()}.mp4`, {
              type: "video/mp4",
            });

            onFileSelect(file);
            toast.success("Video generated successfully!");
            handleClose();
            return;
          }
        } else if (status === "failed") {
          throw new Error(data.error || "Video generation failed");
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          throw new Error("Video generation timeout");
        }
      } catch (error) {
        console.error("Error polling video status:", error);
        toast.error(error instanceof Error ? error.message : "Failed to check video status");
        setIsGenerating(false);
        setVideoStatus(null);
      }
    };

    checkStatus();
  };

  const handleGenerate = () => {
    if (activeTab === "image") {
      handleGenerateImage();
    } else {
      handleGenerateVideo();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPrompt("");
    setVideoStatus(null);
    setIsGenerating(false);
    handleRemoveImage();
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 w-full sm:w-auto">
        <Sparkles className="size-4 mr-2" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-purple-600" />
              AI Media Generator
            </DialogTitle>
            <DialogDescription>
              Generate images or videos using AI. Choose your media type and describe what you want to create.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "image" | "video")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="image" className="flex items-center gap-2">
                <ImageIcon className="size-4" />
                Image
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-2">
                <Video className="size-4" />
                Video
              </TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="image-prompt">Describe your image</Label>
                <Textarea
                  id="image-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., a majestic lion roaring in the savanna at sunset, photorealistic, 4k"
                  className="min-h-[100px]"
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about style, mood, colors, and details for best results.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="video" className="space-y-4 mt-4">
              <div className="grid gap-4">
                {/* Image Upload Section for Video */}
                <div className="grid gap-2">
                  <Label>Starting Image (Optional)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {imagePreview ? (
                      <div className="relative">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          width={200}
                          height={200}
                          className="w-full h-48 object-cover rounded-md"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                          disabled={isGenerating}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="size-8 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          Upload an image to animate
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Or generate video from prompt only
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isGenerating}
                    />
                  </div>
                </div>

                {/* Video Prompt */}
                <div className="grid gap-2">
                  <Label htmlFor="video-prompt">
                    {uploadedImage ? "Describe the motion/animation" : "Describe your video"}
                  </Label>
                  <Textarea
                    id="video-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      uploadedImage
                        ? "E.g., camera slowly zooms in, wind blowing through hair"
                        : "E.g., a peaceful ocean wave rolling onto a sandy beach, cinematic camera movement"
                    }
                    className="min-h-[100px]"
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">
                    {uploadedImage
                      ? "Describe how the image should move or animate."
                      : "Video generation may take 2-5 minutes. Describe the motion and scene you want."}
                  </p>
                </div>
              </div>

              {videoStatus && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300">{videoStatus}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button variant="outline" onClick={handleClose} disabled={isGenerating} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {activeTab === "image" ? "Generating Image..." : "Generating Video..."}
                </>
              ) : (
                <>Generate {activeTab === "image" ? "Image" : "Video"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}