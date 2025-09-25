// types/global.d.ts
import type { google } from "googleapis";

declare global {
  interface Window {
    gapi: {
      load: (api: string, options: { callback: () => void }) => void;
    };
    google: typeof google & {
      // Google Picker API (for GoogleDrivePicker)
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
      // Google Translate API (for GoogleTranslate)
      translate: {
        TranslateElement: new (options: {
          pageLanguage: string;
          autoDisplay: boolean;
        }, elementId: string) => void;
      };
    };
    googleTranslateElementInit: () => void;
  }
}

// Google Picker interfaces
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