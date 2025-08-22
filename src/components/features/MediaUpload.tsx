"use client";

import Image from "next/image"
import Tessaract from "tesseract.js"
import { useRef, useEffect, useState, useCallback } from "react"
import { useDropzone } from "react-dropzone";
import { CloudUpload, FileVideo, ZoomIn, ZoomOut, X, Plus, Equal, Info, ImageIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([])
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [isHoveringImage, setIsHoveringImage] = useState<boolean>(false)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const imagePreviewRef = useRef<HTMLDivElement>(null)

  const handleFileAdd = useCallback((file: File) => {
    const mediaFile: MediaFile = {
      file,
      src: URL.createObjectURL(file),
      type: file.type,
    };

    // Perform OCR for images
    if (file.type.startsWith("image/")) {
      Tessaract.recognize(file, 'eng', { logger: console.log }).then(({ data: { text } }) => {
        console.log(text);
      });
    }

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
              <ZoomOut className="w-4 h-4 text-gray-500" />
              <Slider
                defaultValue={[50]}
                max={200}
                min={50}
                step={1}
                className="w-[100px]"
                onValueChange={handleZoomSliderChange}
                value={[zoomLevel * 50]} // Convert zoom level back to slider value
              />
              <ZoomIn className="w-4 h-4 text-gray-500" />
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
                        transform: isHoveringImage && zoomLevel > 1 ? `scale(${zoomLevel})` : "scale(1)",
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
        <CardFooter className="flex flex-row items-center justify-between p-4 border-t">
          <GoogleDrivePicker onFileSelect={handleFileAdd} />
        </CardFooter>
      </Card>
    </>
  )
}