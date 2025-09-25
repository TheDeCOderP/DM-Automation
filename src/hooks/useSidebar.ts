"use client";

import useSWR from "swr";

// Fetch and unwrap the API response to return only the theme object
const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const json = await res.json();
    return json?.data ?? null;
  });

export function useSidebar() {
  const { data, error, isLoading } = useSWR(`/api/site-settings/sidebar`, fetcher);

  return {
    sidebar: data,
    isLoading,
    isError: error,
  };
}
