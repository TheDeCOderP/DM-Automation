import { useState, useCallback } from "react";

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Your browser doesn’t support speech synthesis.");
      return;
    }

    // Stop any ongoing speech before starting new
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Adjust voice settings (optional)
    utterance.rate = 1;    // Speed (0.1 to 10)
    utterance.pitch = 1;   // Pitch (0 to 2)
    utterance.volume = 1;  // Volume (0 to 1)

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error("Something went wrong with speech synthesis:", event);
      setIsSpeaking(false);
    };

    setCurrentUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isSpeaking,
    speak,
    stop,
  };
};