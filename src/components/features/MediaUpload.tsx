'use client'

import * as React from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { CloudUpload } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface MediaUploadProps {
  onFilesChange: (files: File[]) => void
}

export default function MediaUpload({ onFilesChange }: MediaUploadProps) {
  const [previewFiles, setPreviewFiles] = React.useState<string[]>([])

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    onFilesChange(acceptedFiles)
    setPreviewFiles(acceptedFiles.map(file => URL.createObjectURL(file)))
  }, [onFilesChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi'],
    },
    multiple: true,
  })

  React.useEffect(() => {
    // Clean up object URLs when component unmounts or files change
    return () => previewFiles.forEach(file => URL.revokeObjectURL(file))
  }, [previewFiles])

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[200px]"
    >
      <input {...getInputProps()} />
      {previewFiles.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
          {previewFiles.map((src, index) => (
            <div key={index} className="relative w-full aspect-square rounded-md overflow-hidden">
              {/* Using next/image for optimized image display [^2] */}
              <Image
                src={src || "/placeholder.svg"}
                alt={`Preview ${index}`}
                layout="fill"
                objectFit="cover"
                className="rounded-md"
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          <CloudUpload className="size-10 text-gray-400" />
          <p className="text-sm text-gray-600">
            {isDragActive ? 'Drop the files here ...' : 'Drag and drop media here'}
            <br />
            or click to browse
          </p>
        </>
      )}
      <Button variant="outline" className="mt-2" onClick={(e) => e.stopPropagation()}>
        Choose from Canva
      </Button>
    </div>
  )
}