import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { ImageIcon, XIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ImageUpload({
  label,
  preview,
  onDrop,
  onRemove,
  isDragActive,
  helpText
}: {
  label: string;
  preview: string;
  onDrop: (acceptedFiles: File[]) => void;
  onRemove: () => void;
  isDragActive: boolean;
  helpText?: string;
}) {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        {label}
      </Label>
      {preview ? (
        <div className="relative group">
          <div className="relative w-full h-48 rounded-lg overflow-hidden border">
            <Image
              src={preview}
              alt={label}
              fill
              className="object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="w-10 h-10 text-muted-foreground" />
            <div className="text-sm">
              {isDragActive ? (
                <p className="text-primary">Drop the image here...</p>
              ) : (
                <p>Drag & drop an image, or click to select</p>
              )}
            </div>
            {helpText && (
              <p className="text-xs text-muted-foreground">{helpText}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
