"use client";
import { useEffect, useCallback, useState, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import Script from "next/script";

// Define proper TypeScript interfaces
interface CredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleAccounts {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: CredentialResponse) => void;
      context?: string;
      ux_mode?: string;
      auto_select?: boolean;
      use_fedcm_for_prompt?: boolean;
    }) => void;
    prompt: (notificationCallback?: (notification: PromptNotification) => void) => void;
    cancel: () => void;
  };
}

interface PromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  getDismissedReason: () => string;
}

export default function GoogleOneTap() {
  const { data: session } = useSession();
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);
  const initialized = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log("Session:", session);

  const handleCredentialResponse = useCallback((response: CredentialResponse) => {
    signIn("google", {
      credential: response.credential,
      redirect: false,
    }).catch((error: Error) => {
      console.error("Error signing in:", error);
    });
  }, []);

  const initializeGoogleOneTap = useCallback(() => {
    // Prevent multiple initializations
    if (initialized.current || !window.google || session) {
      return;
    }

    try {
      initialized.current = true;

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: handleCredentialResponse,
        context: "signin",
        ux_mode: "popup",
        auto_select: false,
        use_fedcm_for_prompt: true,
      });

      window.google.accounts.id.prompt((notification: PromptNotification) => {
        if (notification.isNotDisplayed()) {
          console.log(
            "One Tap was not displayed:",
            notification.getNotDisplayedReason()
          );
        } else if (notification.isSkippedMoment()) {
          console.log(
            "One Tap was skipped:",
            notification.getSkippedReason()
          );
        } else if (notification.isDismissedMoment()) {
          console.log(
            "One Tap was dismissed:",
            notification.getDismissedReason()
          );
        }
      });
    } catch (error) {
      // Reset initialization flag on error
      initialized.current = false;
      
      if (
        error instanceof Error &&
        error.message.includes(
          "Only one navigator.credentials.get request may be outstanding at one time"
        )
      ) {
        console.log(
          "FedCM request already in progress. Waiting before retrying..."
        );
        
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // Retry after delay
        timeoutRef.current = setTimeout(() => {
          initializeGoogleOneTap();
        }, 2000);
      } else {
        console.error("Error initializing Google One Tap:", error);
      }
    }
  }, [session, handleCredentialResponse]);

  useEffect(() => {
    if (isGoogleScriptLoaded) {
      initializeGoogleOneTap();
    }
  }, [isGoogleScriptLoaded, initializeGoogleOneTap]);

  useEffect(() => {
    if (session) {
      // If user is signed in, cancel any ongoing One Tap prompts
      window.google?.accounts.id.cancel();
      // Reset initialization flag
      initialized.current = false;
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      async
      defer
      onLoad={() => setIsGoogleScriptLoaded(true)}
      strategy="afterInteractive"
    />
  );
}