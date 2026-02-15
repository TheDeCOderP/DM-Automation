"use client";

import Image from "next/image";
import { useRef, useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload, FileVideo, ZoomIn, ZoomOut, X, Plus, Equal, Info, ImageIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import ZohoWorkDrivePicker from "@/components/features/ZohoWorkDrive";
import GoogleDrivePicker from "@/components/features/GoogleDrivePicker";
import AIGenerator from "./AIGenerator";

interface MediaFile {
  file: File;
  src: string;
  type: string;
}

interface MediaUploadProps {
  onFilesChange: (files: File[]) => void;
}

export default function MediaUpload({ onFilesChange }: MediaUploadProps) {
  const imagePreviewRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);
  const [isHoveringImage, setIsHoveringImage] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleFileAdd = useCallback(
    (file: File) => {
      const mediaFile: MediaFile = {
        file,
        src: URL.createObjectURL(file),
        type: file.type,
      };

      setUploadedFiles((prev) => {
        const updatedFiles = [...prev, mediaFile];
        setTimeout(() => onFilesChange(updatedFiles.map((mf) => mf.file)), 0);
        return updatedFiles;
      });

      if (!selectedFile) {
        setSelectedFile(mediaFile);
      }
    },
    [onFilesChange, selectedFile]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach(handleFileAdd);
    },
    [handleFileAdd]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".png", ".gif", ".webp"],
      "video/*": [".mp4", ".mov", ".avi", ".webm"],
    },
    multiple: true,
    noClick: true,
  });

  const filesRef = useRef<MediaFile[]>([]);
  useEffect(() => {
    filesRef.current = uploadedFiles;
  }, [uploadedFiles]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((mediaFile) => URL.revokeObjectURL(mediaFile.src));
    };
  }, []);

  const handleRemoveFile = (fileToRemove: MediaFile) => {
    setUploadedFiles((prev) => {
      const updatedFiles = prev.filter((mf) => mf !== fileToRemove);
      setTimeout(() => onFilesChange(updatedFiles.map((mf) => mf.file)), 0);
      return updatedFiles;
    });

    if (selectedFile === fileToRemove) {
      setSelectedFile(() => {
        const updatedFiles = uploadedFiles.filter((mf) => mf !== fileToRemove);
        return updatedFiles.length > 0 ? updatedFiles[0] : null;
      });
    }

    URL.revokeObjectURL(fileToRemove.src);
  };

  useEffect(() => {
    setZoomLevel(1);
  }, [selectedFile]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDimensions = (file: File) => {
    if (file.type.startsWith("video/")) {
      return "Video";
    }
    return "Image";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (imagePreviewRef.current && selectedFile?.type.startsWith("image/")) {
      const { left, top, width, height } = imagePreviewRef.current.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;
      setMousePosition({ x, y });
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.min(prev + 0.1, 4);
      return Math.round(newZoom * 10) / 10;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(prev - 0.1, 0.1);
      return Math.round(newZoom * 10) / 10;
    });
  };

  const zoomSliderValue = zoomLevel * 50;

  return (
    <Card className="border-2">
      {/* Header */}
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Upload Media</CardTitle>
            {uploadedFiles.length > 0 && selectedFile && (
              <CardDescription className="flex items-center gap-2 text-sm mt-1">
                {selectedFile.type.startsWith("video/") ? (
                  <FileVideo className="w-4 h-4" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                {getDimensions(selectedFile.file)} • {formatFileSize(selectedFile.file.size)}
              </CardDescription>
            )}
          </div>
        </div>
        {uploadedFiles.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
              disabled={zoomLevel <= 0.1}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <Slider
              max={200}
              min={5}
              step={5}
              className="w-24"
              onValueChange={(value) => setZoomLevel(value[0] / 50)}
              value={[zoomSliderValue]}
            />
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
              disabled={zoomLevel >= 4}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        )}
      </CardHeader>

        {/* Content - Responsive */}
        <CardContent className="p-0">
          {uploadedFiles.length === 0 ? (
            <div
              {...getRootProps({ onClick: open })}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-3 sm:gap-4 cursor-pointer min-h-[200px] m-3 sm:m-4"
            >
              <input {...getInputProps()} />
              <CloudUpload className="size-8 sm:size-10 text-gray-400" />
              <p className="text-xs sm:text-sm text-gray-600">
                {isDragActive ? "Drop the files here ..." : "Drag and drop media here"}
                <br />
                or click to browse
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row h-auto sm:h-[500px]">
              {/* Thumbnails - Responsive */}
              <div className="w-full sm:w-32 p-3 sm:p-4 border-b sm:border-b-0 sm:border-r flex flex-row sm:flex-col gap-3 sm:gap-4 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto flex-shrink-0 no-scrollbar">
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  {uploadedFiles.length}/10 files
                </p>
                {uploadedFiles.map((mediaFile, index) => (
                  <div
                    key={mediaFile.src}
                    className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden cursor-pointer group flex-shrink-0 ${
                      selectedFile === mediaFile ? "border-2 border-blue-500" : "border"
                    }`}
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
                      <video
                        src={mediaFile.src}
                        className="w-full h-full object-cover rounded-md"
                        preload="metadata"
                      />
                    )}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 sm:w-6 sm:h-6 bg-black/50 text-white hover:bg-black/70"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Equal className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 sm:w-6 sm:h-6 bg-black/50 text-white hover:bg-black/70"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(mediaFile);
                        }}
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div
                  {...getRootProps({ onClick: open })}
                  className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50 flex-shrink-0"
                >
                  <input {...getInputProps()} />
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                </div>
              </div>

              {/* Preview - Responsive */}
              <div
                ref={imagePreviewRef}
                className="flex-1 p-3 sm:p-4 flex items-center justify-center bg-gray-50 relative overflow-hidden min-h-[300px] sm:min-h-0"
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
                          isHoveringImage && zoomLevel > 1
                            ? `${mousePosition.x}% ${mousePosition.y}%`
                            : "center center",
                        transition: "transform 0.1s ease-out",
                        cursor: isHoveringImage && zoomLevel > 1 ? "zoom-out" : "zoom-in",
                      }}
                      className="rounded-md"
                    />
                  ) : (
                    <video src={selectedFile.src} controls className="w-full h-full object-contain rounded-md" />
                  )
                ) : (
                  <div className="text-gray-500 text-sm">Select a file to preview</div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer - Responsive */}
        <CardFooter className="flex flex-col gap-3 p-3 sm:p-4 border-t">
          <div className={`grid grid-cols-3 gap-2 w-full`}>
            <GoogleDrivePicker onFileSelect={handleFileAdd} />
            <ZohoWorkDrivePicker onFileSelect={handleFileAdd} />
            <AIGenerator onFileSelect={handleFileAdd} />
          </div>
        </CardFooter>
      </Card>
  );
}