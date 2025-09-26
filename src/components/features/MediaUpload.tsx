"use client";

import Image from "next/image";
import { toast } from "sonner";
import { useRef, useEffect, useState, useCallback } from "react"
import { useDropzone } from "react-dropzone";
import { CloudUpload, FileVideo, ZoomIn, ZoomOut, X, Plus, Equal, Info, ImageIcon, Sparkles } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GoogleDrivePicker from "./GoogleDrivePicker";

interface MediaFile {
  file: File
  src: string
  type: string
}

interface MediaUploadProps {
  onFilesChange: (files: File[]) => void
}

export default function MediaUpload({ onFilesChange }: MediaUploadProps) {
  const imagePreviewRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);
  const [isHoveringImage, setIsHoveringImage] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleFileAdd = useCallback((file: File) => {
    const mediaFile: MediaFile = {
      file,
      src: URL.createObjectURL(file),
      type: file.type,
    };

    setUploadedFiles((prev) => {
      const updatedFiles = [...prev, mediaFile];
      // Call onFilesChange after state is updated
      setTimeout(() => onFilesChange(updatedFiles.map((mf) => mf.file)), 0);
      return updatedFiles;
    });

    if (!selectedFile) {
      setSelectedFile(mediaFile);
    }
  }, [onFilesChange, selectedFile]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(handleFileAdd);
    },
    [handleFileAdd],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".png", ".gif", ".webp"],
      "video/*": [".mp4", ".mov", ".avi", ".webm"],
    },
    multiple: true,
    noClick: true,
  })

  // Track latest files for unmount cleanup without revoking on every state change
  const filesRef = useRef<MediaFile[]>([]);
  useEffect(() => {
    filesRef.current = uploadedFiles;
  }, [uploadedFiles]);

  useEffect(() => {
    // Clean up object URLs when component unmounts
    return () => {
      filesRef.current.forEach((mediaFile) => URL.revokeObjectURL(mediaFile.src));
    };
  }, [])

  const handleRemoveFile = (fileToRemove: MediaFile) => {
    setUploadedFiles((prev) => {
      const updatedFiles = prev.filter((mf) => mf !== fileToRemove)
      // Call onFilesChange after state is updated
      setTimeout(() => onFilesChange(updatedFiles.map((mf) => mf.file)), 0)
      return updatedFiles
    })

    if (selectedFile === fileToRemove) {
      setSelectedFile(() => {
        const updatedFiles = uploadedFiles.filter((mf) => mf !== fileToRemove)
        return updatedFiles.length > 0 ? updatedFiles[0] : null
      })
    }

    // Revoke the URL for the removed file
    URL.revokeObjectURL(fileToRemove.src)
  }

  // Reset zoom level when selected file changes
  useEffect(() => {
    setZoomLevel(1);
  }, [selectedFile]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getDimensions = (file: File) => {
    if (file.type.startsWith("video/")) {
      return "1080x1920px"
    }
    return "N/A"
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (imagePreviewRef.current && selectedFile?.type.startsWith("image/")) {
      const { left, top, width, height } = imagePreviewRef.current.getBoundingClientRect()
      const x = ((e.clientX - left) / width) * 100
      const y = ((e.clientY - top) / height) * 100
      setMousePosition({ x, y })
    }
  }

  const handleZoomSliderChange = (value: number[]) => {
    setZoomLevel(value[0] / 50)
  }

  const handleGenerateClick = () => {
    setIsPromptDialogOpen(true)
  }

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai-agent/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt: aiPrompt,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate image")
      }

      const data = await response.json()
      
      if (data.imageBase64) {
        // Convert base64 to File object
        const byteCharacters = atob(data.imageBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        const file = new File([blob], `ai-generated-${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        handleFileAdd(file);
        toast.success("AI image generated and added successfully!");
      } else {
        throw new Error("No image data returned from API");
      }
      
      setIsPromptDialogOpen(false)
      setAiPrompt("")
    } catch (error) {
      console.error("Error generating image:", error)
      toast.error("Failed to generate image")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.min(prev + 0.1, 4); // Increased max zoom to 4x
      return Math.round(newZoom * 10) / 10; // Round to 1 decimal place
    })
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(prev - 0.1, 0.1); // Minimum zoom 0.1x
      return Math.round(newZoom * 10) / 10; // Round to 1 decimal place
    })
  }

  // Convert zoom level to slider value (1-200 range)
  const zoomSliderValue = zoomLevel * 50;

  return (
    <>
      <Label className="block text-sm font-medium mb-2"> <strong className="mr-2 text-xl">Step 4:</strong> Upload Media </Label>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <span className="bg-gray-100 dark:bg-gray-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
              Media
            </CardTitle>
            {uploadedFiles.length > 0 && selectedFile && (
              <>
                <CardDescription className="flex items-center gap-1 text-sm text-gray-600">
                  {selectedFile.type.startsWith("video/") ? (
                    <FileVideo className="w-4 h-4" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  {selectedFile.type.startsWith("video/") ? "Video" : "Image"}
                </CardDescription>
                <CardDescription className="text-sm text-gray-600">
                  {formatFileSize(selectedFile.file.size)}
                </CardDescription>
                <CardDescription className="text-sm text-gray-600">{getDimensions(selectedFile.file)}</CardDescription>
              </>
            )}
          </div>
          {uploadedFiles.length > 0 && (
            <div className="flex items-center gap-4">
              <button 
                onClick={handleZoomOut} 
                className="cursor-pointer p-1 hover:bg-gray-100 rounded transition-colors" 
                disabled={zoomLevel <= 0.1}
              > 
                <ZoomOut className="w-4 h-4 text-gray-500" />
              </button>
              <Slider
                max={200} // 200 = 4x zoom (200/50 = 4)
                min={5}   // 5 = 0.1x zoom (5/50 = 0.1)
                step={5}  // Step of 5 = 0.1x zoom increments
                className="w-[100px]"
                onValueChange={(value) => setZoomLevel(value[0] / 50)}
                value={[zoomSliderValue]}
              />
              <button 
                onClick={handleZoomIn}
                className="cursor-pointer p-1 hover:bg-gray-100 rounded transition-colors"
                disabled={zoomLevel >= 4}
              >
                <ZoomIn className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
          {uploadedFiles.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="w-4 h-4" />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {uploadedFiles.length === 0 ? (
            <div
              {...getRootProps({ onClick: open })}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[200px] m-4"
            >
              <input {...getInputProps()} />
              <CloudUpload className="size-10 text-gray-400" />
              <p className="text-sm text-gray-600">
                {isDragActive ? "Drop the files here ..." : "Drag and drop media here"}
                <br />
                or click to browse
              </p>
            </div>
          ) : (
            <div className="flex h-[500px]">
              {/* Media Preview Thumbnails */}
              <div className="w-32 p-4 border-r flex flex-col gap-4 overflow-y-auto flex-shrink-0 no-scrollbar">
                <p className="text-sm text-gray-600">{uploadedFiles.length}/10 files</p>
                {uploadedFiles.map((mediaFile, index) => (
                  <div
                    key={mediaFile.src}
                    className={`relative w-24 h-24 rounded-md overflow-hidden cursor-pointer group flex-shrink-0 ${selectedFile === mediaFile ? "border-2 border-blue-500" : "border"}`}
                    onClick={() => setSelectedFile(mediaFile)}
                  >
                    {mediaFile.type.startsWith("image/") ? (
                      <Image
                        src={mediaFile.src || "/placeholder.svg"}
                        alt={`Preview ${index}`}
                        fill
                        style={{ objectFit: "cover" }}
                        className="rounded-md"
                      />
                    ) : (
                      <video src={mediaFile.src} className="w-full h-full object-cover rounded-md" preload="metadata" />
                    )}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 bg-black/50 text-white hover:bg-black/70"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Equal className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 bg-black/50 text-white hover:bg-black/70"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFile(mediaFile)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div
                  {...getRootProps({ onClick: open })}
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50 flex-shrink-0"
                >
                  <input {...getInputProps()} />
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
              </div>
              {/* Main Media Display */}
              <div
                ref={imagePreviewRef}
                className="flex-1 p-4 flex items-center justify-center bg-gray-50 relative overflow-hidden"
                onMouseEnter={() => selectedFile?.type.startsWith("image/") && setIsHoveringImage(true)}
                onMouseLeave={() => setIsHoveringImage(false)}
                onMouseMove={handleMouseMove}
              >
                {selectedFile ? (
                  selectedFile.type.startsWith("image/") ? (
                    <Image
                      fill
                      src={selectedFile.src || "/placeholder.svg"}
                      alt="Selected media preview"
                      style={{
                        objectFit: isHoveringImage && zoomLevel > 1 ? "none" : "contain",
                        transform: `scale(${zoomLevel})`,
                        transformOrigin:
                          isHoveringImage && zoomLevel > 1 ? `${mousePosition.x}% ${mousePosition.y}%` : "center center",
                        transition: "transform 0.1s ease-out",
                        cursor: isHoveringImage && zoomLevel > 1 ? "zoom-out" : "zoom-in",
                      }}
                      className="rounded-md"
                    />
                  ) : (
                    <video src={selectedFile.src} controls className="w-full h-full object-contain rounded-md" />
                  )
                ) : (
                  <div className="text-gray-500">Select a file to preview</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row items-center justify-between border-t">
          <GoogleDrivePicker onFileSelect={handleFileAdd} />
          <Button 
            onClick={handleGenerateClick}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <Sparkles className="size-4 mr-2" />
            Generate AI Image
          </Button>
        </CardFooter>
      </Card>

      {/* AI Prompt Dialog */}
      <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Image</DialogTitle>
            <DialogDescription>
              Enter a prompt to generate image.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ai-prompt">Your Prompt</Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="E.g., a photo of a happy person with a smile on their face"
              />
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
              onClick={handleGenerateImage}
              disabled={isGenerating || !aiPrompt.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? "Generating..." : "Generate Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}