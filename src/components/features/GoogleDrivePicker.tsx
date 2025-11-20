// components/GoogleDrivePicker.tsx
"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { getPlatformIcon } from "@/utils/ui/icons";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      const res = await fetch("/api/accounts/google/drive");

      if(!res.ok) {
        if(setIsConnected) setIsConnected(false);
        return;
        //throw new Error("Failed to fetch Google account");
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

  const handleGoogleDriveConnect = async () => {
    try {
      window.location.href = `/api/accounts/google/auth`;
    } catch (error) {
      console.error("Connection failed:", error);
      toast.error("Failed to initiate connection");
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
    <>
      {isConnected ? (
        <Button
          size={"lg"}
          variant="outline"
          onClick={openPicker}
          disabled={!accessToken || isLoading}
          className="flex items-center gap-2 bg-transparent"
        >
          {getPlatformIcon("GOOGLE DRIVE", "h-5 w-5")}
        </Button>
      ) : (
        <Button
          size={"lg"}
          variant="outline"
          onClick={handleGoogleDriveConnect}
          className="flex items-center gap-2 bg-transparent"
        >
          {getPlatformIcon("GOOGLE DRIVE", "h-5 w-5")}
        </Button>
      )}
    </>
  );
}