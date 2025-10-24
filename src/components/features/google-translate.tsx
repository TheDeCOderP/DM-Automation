"use client";

import React, { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { Button } from "../ui/button";

// Define the type for a language object
type Language = {
  code: string;
  name: string;
};

const languages: Language[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "hi", name: "Hindi" },
  { code: "pa", name: "Punjabi" },
  { code: "gu", name: "Gujarati" },
  { code: "te", name: "Telugu" },
  { code: "ta", name: "Tamil" },
  { code: "kn", name: "Kannada" },
  { code: "ar", name: "Arabic" },
  { code: "it", name: "Italian" },
  { code: "ml", name: "Malayalam" },
  { code: "bn", name: "Bengali" },
  { code: "ru", name: "Russian" },
  { code: "de", name: "German" },
  { code: "ro", name: "Romanian" },
  { code: "zh-CN", name: "Chinese" },
  { code: "ko", name: "Korean" },
  { code: "pt", name: "Portuguese" },
];

export default function GoogleTranslate() {
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          autoDisplay: false,
        },
        "google_translate_element"
      );

      setTimeout(() => {
        const selectElem = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (selectElem) selectElem.style.display = "none";
      }, 1000);
    };
  }, []);

  const changeLanguage = (lang: string) => {
    const selectElem = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (selectElem) {
      selectElem.value = lang;
      selectElem.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <div id="google_translate_element" className="hidden" />

      <Button
        variant="ghost" 
        size="icon" 
        className="relative border rounded-full h-10 w-10"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <Languages className='w-5 h-5 dark:text-white' />
      </Button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 bg-background text-foreground shadow-lg rounded-lg p-2 w-48 max-h-60 overflow-y-auto border border-input z-50">
          {languages.map((lang: Language) => (
            <button
              key={lang.code}
              className="block w-full text-left p-2 hover:bg-accent hover:text-accent-foreground text-sm transition-colors"
              onClick={() => changeLanguage(lang.code)}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
