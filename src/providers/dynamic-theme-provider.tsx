'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { useTheme } from 'next-themes';
import { hexToHsl } from '@/utils/color';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function applyFavicon(url?: string | null) {
  if (!url) return;
  const link =
    document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
    document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = url;
  if (!link.parentNode) {
    document.head.appendChild(link);
  }
}

function resetDynamicStyles() {
  // Reset CSS variables
  document.documentElement.style.removeProperty("--primary");
  document.documentElement.style.removeProperty("--secondary");
  document.documentElement.style.removeProperty("--tertiary");
  document.documentElement.style.removeProperty("--background");
  document.documentElement.style.removeProperty("--foreground");
  
  // Reset font
  document.body.style.fontFamily = '';
}

export function DynamicThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: theme } = useSWR('/api/site-theme', fetcher, {
    revalidateOnFocus: false,
  });
  const { theme: currentTheme } = useTheme();

  useEffect(() => {
    if (currentTheme === 'dark') {
      resetDynamicStyles();
      return;
    }

    if (!theme?.data) return;

    const setHslVar = (name: string, hex?: string | null) => {
      if (!hex) return;
      const { h, s, l } = hexToHsl(hex);
      document.documentElement.style.setProperty(name, `hsl(${h} ${s}% ${l}%)`);
    };

    setHslVar("--primary", theme.data.primaryColor);
    setHslVar("--secondary", theme.data.secondaryColor);
    setHslVar("--tertiary", theme.data.tertiaryColor);
    setHslVar("--background", theme.data.backgroundColor);
    setHslVar("--foreground", theme.data.textColor);

    if (theme.data.font) {
      const map: Record<string, string> = {
        montserrat: 'Montserrat, system-ui, sans-serif',
        poppins: 'Poppins, system-ui, sans-serif',
      };
      const normalized = String(theme.data.font).toLowerCase();
      document.body.style.fontFamily = map[normalized] || 'Montserrat, system-ui, sans-serif';
    } else {
      document.body.style.fontFamily = 'Montserrat, system-ui, sans-serif';
    }

    applyFavicon(theme.data.faviconUrl);

    // Cleanup function to reset styles when component unmounts
    return () => {
      resetDynamicStyles();
    };
  }, [theme?.data, currentTheme]);

  return <>{children}</>;
}