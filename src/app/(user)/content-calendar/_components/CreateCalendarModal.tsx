"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Platform } from "@prisma/client";

interface CreateCalendarModalProps {
  brandId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PLATFORMS = [
  { value: "LINKEDIN", label: "LinkedIn", icon: "💼" },
  { value: "TWITTER", label: "Twitter", icon: "🐦" },
  { value: "INSTAGRAM", label: "Instagram", icon: "📸" },
  { value: "FACEBOOK", label: "Facebook", icon: "👥" },
  { value: "YOUTUBE", label: "YouTube", icon: "📺" },
  { value: "PINTEREST", label: "Pinterest", icon: "📌" },
  { value: "REDDIT", label: "Reddit", icon: "🤖" },
  { value: "TIKTOK", label: "TikTok", icon: "🎵" },
];

export default function CreateCalendarModal({
  brandId,
  onClose,
  onSuccess,
}: CreateCalendarModalProps) {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(30);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");

  // Calculate end date based on start date and duration
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);
  const endDateStr = endDate.toISOString().split("T")[0];

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    if (duration < 7 || duration > 90) {
      toast.error("Duration must be between 7 and 90 days");
      return;
    }

    if (postsPerWeek < 1 || postsPerWeek > 14) {
      toast.error("Posts per week must be between 1 and 14");
      return;
    }

    setIsGenerating(true);
    setProgress("Generating content ideas...");

    try {
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
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate calendar");
      }

      const data = await response.json();
      
      toast.success(
        `Calendar generated! ${data.calendar.items.length} posts created.`
      );
      onSuccess();
    } catch (error) {
      console.error("Error generating calendar:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate calendar"
      );
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  const totalPosts = Math.ceil((duration / 7) * postsPerWeek) * selectedPlatforms.length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <p className="text-sm text-muted-foreground">
              Main theme for your content calendar
            </p>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">
              Start Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isGenerating}
              min={new Date().toISOString().split("T")[0]}
            />
            <p className="text-sm text-muted-foreground">
              When should the calendar start?
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">
              Duration (Days) <span className="text-red-500">*</span>
            </Label>
            
            {/* Quick Presets */}
            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                variant={duration === 7 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(7)}
                disabled={isGenerating}
              >
                1 Week
              </Button>
              <Button
                type="button"
                variant={duration === 14 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(14)}
                disabled={isGenerating}
              >
                2 Weeks
              </Button>
              <Button
                type="button"
                variant={duration === 30 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(30)}
                disabled={isGenerating}
              >
                1 Month
              </Button>
              <Button
                type="button"
                variant={duration === 90 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(90)}
                disabled={isGenerating}
              >
                3 Months
              </Button>
            </div>
            
            <Input
              id="duration"
              type="number"
              min={7}
              max={90}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              disabled={isGenerating}
            />
            <p className="text-sm text-muted-foreground">
              Number of days (7-90) - Use presets or enter custom value
            </p>
          </div>

          {/* Posts Per Week */}
          <div className="space-y-2">
            <Label htmlFor="postsPerWeek">
              Posts Per Week <span className="text-red-500">*</span>
            </Label>
            <Input
              id="postsPerWeek"
              type="number"
              min={1}
              max={14}
              value={postsPerWeek}
              onChange={(e) => setPostsPerWeek(parseInt(e.target.value))}
              disabled={isGenerating}
            />
            <p className="text-sm text-muted-foreground">
              How many posts per week (1-14)
            </p>
          </div>

          {/* Platforms */}
          <div className="space-y-3">
            <Label>
              Select Platforms <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PLATFORMS.map((platform) => (
                <div
                  key={platform.value}
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPlatforms.includes(platform.value as Platform)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handlePlatformToggle(platform.value as Platform)}
                >
                  <Checkbox
                    checked={selectedPlatforms.includes(platform.value as Platform)}
                    onCheckedChange={() =>
                      handlePlatformToggle(platform.value as Platform)
                    }
                  />
                  <span className="text-xl">{platform.icon}</span>
                  <Label className="cursor-pointer flex-1">
                    {platform.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {selectedPlatforms.length > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold">Summary:</h4>
              <ul className="text-sm space-y-1">
                <li>
                  • <strong>Date Range:</strong> {new Date(startDate).toLocaleDateString()} - {endDate.toLocaleDateString()}
                </li>
                <li>
                  • {Math.ceil((duration / 7) * postsPerWeek)} content ideas will be
                  generated
                </li>
                <li>• {totalPosts} total posts (across all platforms)</li>
                <li>
                  • Each post will have platform-specific captions and hashtags
                </li>
                <li>• Estimated time: 2-5 minutes</li>
              </ul>
            </div>
          )}

          {/* Progress */}
          {isGenerating && (
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{progress}</p>
                  <p className="text-sm text-muted-foreground">
                    This may take 2-5 minutes. Please don't close this window.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Calendar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
