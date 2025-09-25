"use client";

import useSWR, { SWRResponse } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface HeaderConfig {
  headerSearchEnabled?: boolean;
  headerNotificationsEnabled?: boolean;
  headerThemeToggleEnabled?: boolean;
  headerLanguageEnabled?: boolean;
}

interface HeaderFeaturesData {
  config: HeaderConfig;
}

export function useHeaderFeatures() {
  const { data, error, mutate }: SWRResponse<HeaderFeaturesData> = useSWR("/api/site-settings/header", fetcher);

  const updateHeaderFeatures = async (features: Record<string, boolean>) => {
    // Optimistic UI update
    mutate(
      (currentData) => ({
        ...currentData,
        config: { ...currentData?.config, ...features },
      }),
      false
    );

    // Persist changes to the server
    try {
      await fetch("/api/site-settings/header", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      });
      // Re-fetch to confirm
      mutate();
    } catch (e) {
      // Revert on error
      mutate(); 
      console.error("Failed to update header features", e);
    }
  };

  return {
    config: data?.config,
    isLoading: !error && !data,
    isError: error,
    updateHeaderFeatures,
  };
}
