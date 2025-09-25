"use client"

import { toast } from "sonner"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSpeechToText } from "@/hooks/useSpeechToText"

interface MicrophoneProps {
  setText: Dispatch<SetStateAction<string[]>>
  className?: string
  size?: "small" | "default" | "large"
}

export default function Microphone({
  setText,
  className = "",
  size = "default",
}: MicrophoneProps) {
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false)
  const {
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechToText({
    continuous: true,
    lang: "en-US",
  })

  // Size variants
  const sizeClasses = {
    small: "h-8 w-8",
    default: "h-12 w-12",
    large: "h-16 w-16",
  }

  const iconSizes = {
    small: "h-4 w-4",
    default: "h-5 w-5",
    large: "h-20 w-20",
  }

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.")
    }
  }, [browserSupportsSpeechRecognition])

  // Update parent with transcript
  useEffect(() => {
    if (transcript) {
      setText(prev => [...prev, transcript])
      resetTranscript()
    }
  }, [transcript, setText, resetTranscript])

  // Sync microphone state with listening
  useEffect(() => {
    if (isMicrophoneOn) {
      startListening()
    } else {
      stopListening()
    }
  }, [isMicrophoneOn, startListening, stopListening])

  const handleToggle = () => {
    if (!browserSupportsSpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.")
      return
    }
    setIsMicrophoneOn(prev => !prev)
  }

  return (
    <Button
      variant="ghost"
      type="button"
      onClick={handleToggle}
      className={`relative ${sizeClasses[size]} ${className} hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50 focus-visible:ring-0 focus-visible:ring-offset-0`}
      aria-label={isMicrophoneOn ? "Turn off microphone" : "Turn on microphone"}
    >
      {isMicrophoneOn ? (
        <MicOff className={`${iconSizes[size]} text-foreground dark:text-white`} />
      ) : (
        <Mic className={`${iconSizes[size]} text-foreground dark:text-white`} />
      )}
    </Button>
  )
}
