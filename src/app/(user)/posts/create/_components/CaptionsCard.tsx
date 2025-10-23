"use client"
import { toast } from "sonner";
import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { Sparkles, Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react"

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import CaptionInput from "./CaptionInput";

interface SocialPlatform {
  id: string
  name: string
  icon: React.ElementType
  wordLimit: number
}

const socialMediaPlatforms: SocialPlatform[] = [
  { id: "FACEBOOK", name: "Facebook", icon: Facebook, wordLimit: 63206 },
  { id: "INSTAGRAM", name: "Instagram", icon: Instagram, wordLimit: 2200 },
  { id: "LINKEDIN", name: "LinkedIn", icon: Linkedin, wordLimit: 3000 },
  { id: "TWITTER", name: "Twitter", icon: Twitter, wordLimit: 280 },
  { id: "YOUTUBE", name: "YouTube", icon: Youtube, wordLimit: 5000 },
  { id: "PINTEREST", name: "Pinterest", icon: Sparkles, wordLimit: 5000 },
]

interface CaptionInputProps {
  selectedPlatforms: string[]
  platformCaptions: { [key: string]: string }
  setPlatformCaptions: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>
}

export default function CaptionsCard({ selectedPlatforms = [], platformCaptions, setPlatformCaptions }: CaptionInputProps) {
  const [useSameCaption, setUseSameCaption] = useState(true)
  const [commonCaption, setCommonCaption] = useState("")
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Use ref to track if we're initializing to prevent loops
  const isInitializing = useRef(false)

  const handleCaptionChange = (platformId: string, value: string) => {
    if (useSameCaption) {
      setCommonCaption(value)
      // Update all selected platforms with the same caption
      setPlatformCaptions((prev) => {
        const newCaptions = { ...prev }
        selectedPlatforms.forEach((platform) => {
          newCaptions[platform] = value
        })
        return newCaptions
      })
    } else {
      setPlatformCaptions((prev) => ({
        ...prev,
        [platformId]: value,
      }))
    }
  }

  // Handle initialization and mode switching
  useEffect(() => {
    if (isInitializing.current) return
    
    isInitializing.current = true
    
    if (useSameCaption && selectedPlatforms.length > 0) {
      // When using same caption, sync commonCaption with the first selected platform
      const firstSelectedPlatform = selectedPlatforms[0]
      const firstPlatformCaption = platformCaptions[firstSelectedPlatform] || ""
      
      if (commonCaption !== firstPlatformCaption) {
        setCommonCaption(firstPlatformCaption)
      }
      
      // Sync all platforms with the common caption
      const needsUpdate = selectedPlatforms.some(
        platformId => platformCaptions[platformId] !== firstPlatformCaption
      )
      
      if (needsUpdate) {
        setPlatformCaptions((prev) => {
          const newCaptions = { ...prev }
          selectedPlatforms.forEach((platformId) => {
            newCaptions[platformId] = firstPlatformCaption
          })
          return newCaptions
        })
      }
    }
    
    isInitializing.current = false
  }, [useSameCaption, selectedPlatforms.join(',')]) // Only depend on mode and platform list changes

  const handleGenerateClick = () => {
    setIsPromptDialogOpen(true)
  }

  const handleGenerateCaptions = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai-agent/generate-captions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          platforms: selectedPlatforms,
          useSameCaptions: useSameCaption,
          currentCaptions: useSameCaption ? commonCaption : platformCaptions
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate captions")
      }

      const data = await response.json()

      if (useSameCaption) {
        setCommonCaption(data.commonCaption)
        // Also update all selected platforms with the common caption
        setPlatformCaptions(prev => {
          const newCaptions = { ...prev }
          selectedPlatforms.forEach((platformId) => {
            newCaptions[platformId] = data.commonCaption
          })
          return newCaptions
        })
      } else {
        setPlatformCaptions(prev => ({
          ...prev,
          ...data.platformCaptions
        }))
      }

      toast.success("Captions generated successfully")
      setIsPromptDialogOpen(false)
      setAiPrompt("")
    } catch (error) {
      console.error("Error generating captions:", error)
      toast.error("Failed to generate captions")
    } finally {
      setIsGenerating(false)
    }
  }

  // Get the first selected platform for the common caption field
  const firstSelectedPlatform = selectedPlatforms.length > 0 
    ? socialMediaPlatforms.find(p => p.id === selectedPlatforms[0])
    : null

  return (
    <>
      <Label className="block text-sm font-medium mb-2"> <strong className="mr-2 text-xl">Step 3:</strong>Enter/Generate Captions</Label>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center size-6 rounded-full bg-black text-white text-xs font-bold">
              {selectedPlatforms.length}
            </span>
            <CardTitle className="text-lg font-semibold">Captions</CardTitle>
          </div>
          <Button 
            onClick={handleGenerateClick}
            className="bg-purple-600 text-white hover:bg-purple-700"
            disabled={selectedPlatforms.length === 0}
          >
            <Sparkles className="size-4 mr-2" />
            Generate AI Captions
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="same-caption" className="text-sm font-normal">
              Use same caption for all platforms
            </Label>
            <Switch 
              id="same-caption" 
              checked={useSameCaption} 
              onCheckedChange={setUseSameCaption} 
              disabled={selectedPlatforms.length === 0}
            />
          </div>

          {useSameCaption && firstSelectedPlatform ? (
            <CaptionInput
              key={`common-${firstSelectedPlatform.id}`}
              platformName={`Common Caption (based on ${firstSelectedPlatform.name})`}
              IconComponent={firstSelectedPlatform.icon}
              wordLimit={firstSelectedPlatform.wordLimit}
              value={commonCaption}
              onChange={(value: string) => handleCaptionChange(firstSelectedPlatform.id, value)}
              disabled={false}
            />
          ) : (
            selectedPlatforms.map((platformId) => {
              const platform = socialMediaPlatforms.find(p => p.id === platformId)
              if (!platform) return null
              
              return (
                <CaptionInput
                  key={platform.id}
                  platformName={platform.name}
                  IconComponent={platform.icon}
                  wordLimit={platform.wordLimit}
                  value={platformCaptions[platform.id] || ""}
                  onChange={(value: string) => handleCaptionChange(platform.id, value)}
                  disabled={false}
                />
              )
            })
          )}
        </CardContent>
      </Card>

      {/* AI Prompt Dialog */}
      <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Captions</DialogTitle>
            <DialogDescription>
              Enter a prompt to generate captions for your selected platforms.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ai-prompt">Your Prompt</Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="E.g., 'Create engaging captions about our new product launch'"
              />
            </div>
            <div className="grid gap-2">
              <Label>Selected Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {selectedPlatforms.map(platformId => {
                  const platform = socialMediaPlatforms.find(p => p.id === platformId)
                  return platform ? (
                    <div key={platform.id} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                      <platform.icon className="size-4" />
                      <span>{platform.name}</span>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPromptDialogOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateCaptions}
              disabled={isGenerating || !aiPrompt.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? "Generating..." : "Generate Captions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}