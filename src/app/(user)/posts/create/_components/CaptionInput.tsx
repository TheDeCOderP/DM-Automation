"use client"

import type * as React from "react"
import { Info } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface CaptionInputProps {
  platformName: string
  IconComponent: React.ElementType
  wordLimit: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function CaptionInput({ platformName, IconComponent, wordLimit, value, onChange, disabled }: CaptionInputProps) {
  const currentLength = value.length

  return (
    <div className="w-full">
      <div className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <IconComponent className="size-5" />
          <span className="text-sm font-medium text-gray-600">{platformName}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <span>
            {currentLength}/{wordLimit}
          </span>
          <Info className="size-4" />
        </div>
      </div>
      <Textarea
        placeholder={`Write your caption for ${platformName}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={wordLimit}
        className="min-h-[120px] resize-y"
        disabled={disabled}
      />
    </div>
  )
}