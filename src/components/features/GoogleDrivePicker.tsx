// components/GoogleDrivePicker.tsx
"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

import type { google } from "googleapis";

declare global {
  interface Window {
    gapi: {
      load: (api: string, options: { callback: () => void }) => void;
    };
    google: typeof google & {
      picker: {
        View: new (viewId: string) => GooglePickerView;
        ViewId: {
          DOCS: string;
        };
        PickerBuilder: new () => GooglePickerBuilder;
        Action: {
          PICKED: string;
        };
      };
    };
  }
}

interface GooglePickerView {
  setMimeTypes: (mimeTypes: string) => void;
}

interface GooglePickerBuilder {
  addView: (view: GooglePickerView) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
  build: () => GooglePicker;
}

interface GooglePicker {
  setVisible: (visible: boolean) => void;
}

interface GooglePickerResponse {
  action: string;
  docs: Array<{
    id: string;
    name: string;
    mimeType: string;
  }>;
}

interface GoogleDrivePickerProps {
  onFileSelect: (file: File) => void;
}

export default function GoogleDrivePicker({ onFileSelect }: GoogleDrivePickerProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchToken() {
      const res = await fetch("/api/accounts/google");

      if(!res.ok) {
        throw new Error("Failed to fetch token");
      }

      const data = await res.json();
      setAccessToken(data.account.accessToken);
    }
    fetchToken();
  }, []);

  useEffect(() => {
    if (!document.getElementById("gapi-script")) {
      const script = document.createElement("script");
      script.id = "gapi-script";
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => console.log("Google API script loaded");
      document.body.appendChild(script);
    }
  }, []);

  const downloadFileFromDrive = async (fileId: string, fileName: string, mimeType: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/accounts/google/drive/files/${fileId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: mimeType });
      onFileSelect(file);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file from Google Drive");
    } finally {
      setIsLoading(false);
    }
  };

  const openPicker = () => {
    if (!accessToken) {
      toast.error("No Google access token. Please connect your account first.");
      return;
    }

    if (!window.gapi) {
      toast.error("Google API not loaded yet");
      return;
    }

    window.gapi.load("picker", { callback: createPicker });

    function createPicker() {
      if (!window.google || !window.google.picker) {
        toast.error("Google Picker not available");
        return;
      }

      // Create view for images and videos
      const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
      view.setMimeTypes('image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mov,video/avi,video/webm');

      if(!accessToken) {
        toast.error("No Google access token. Please connect your account first.");
        return;
      }

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY!)
        .setCallback(pickerCallback)
        .build();

      picker.setVisible(true);
    }

    function pickerCallback(data: GooglePickerResponse) {
      if (data.action === window.google.picker.Action.PICKED) {
        const file = data.docs[0];
        
        // Download the selected file
        downloadFileFromDrive(file.id, file.name, file.mimeType);
      }
    }
  };

  return (
    <Button
      size={"lg"}
      variant="outline"
      onClick={openPicker}
      disabled={!accessToken || isLoading}
      className="flex items-center gap-2 bg-transparent"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 87.3 78"><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z"/><path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z"/><path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"/><path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"/></svg>
      {isLoading ? "Importing..." : "Import from Google Drive"}
    </Button>
  );
}