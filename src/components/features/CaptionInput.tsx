"use client"

import type * as React from "react"
import { Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
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
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <IconComponent className="size-5" />
          <CardDescription className="text-sm font-medium">{platformName}</CardDescription>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <span>
            {currentLength}/{wordLimit}
          </span>
          <Info className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder={`Write your caption for ${platformName}...`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={wordLimit}
          className="min-h-[120px] resize-y"
          disabled={disabled}
        />
      </CardContent>
    </Card>
  )
}
