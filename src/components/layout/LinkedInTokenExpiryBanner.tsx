"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ExpiredToken {
  type: "page" | "account";
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  expiredAt: string;
}

interface ExpiringToken {
  type: "page" | "account";
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  expiresAt: string;
  daysLeft: number;
}

interface TokenStatusResponse {
  expiredTokens: ExpiredToken[];
  expiringTokens: ExpiringToken[];
}

const DISMISSED_KEY = "linkedin_token_warning_dismissed";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed");
    return res.json();
  });

export default function LinkedInTokenExpiryBanner() {
  const { status } = useSession();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [reconnecting, setReconnecting] = useState<string | null>(null);

  // Load dismissed state from sessionStorage (resets on browser close)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DISMISSED_KEY);
      if (stored) setDismissed(JSON.parse(stored));
    } catch {}
  }, []);

  const { data, mutate } = useSWR<TokenStatusResponse>(
    status === "authenticated" ? "/api/accounts/token-status" : null,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // refresh every 5 min
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const handleDismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {}
  };

  const handleReconnect = async (
    token: ExpiredToken | ExpiringToken,
    brandId: string
  ) => {
    setReconnecting(token.id);
    try {
      // Redirect to LinkedIn Pages OAuth flow
      window.location.href = `/api/accounts/linkedin/pages/auth?brandId=${brandId}&returnUrl=${encodeURIComponent(window.location.pathname)}`;
    } catch {
      toast.error("Failed to start reconnection");
      setReconnecting(null);
    }
  };

  if (!data) return null;

  const { expiredTokens, expiringTokens } = data;

  // Filter out dismissed
  const visibleExpired = expiredTokens.filter((t) => !dismissed.includes(t.id));
  const visibleExpiring = expiringTokens.filter((t) => !dismissed.includes(t.id));

  if (visibleExpired.length === 0 && visibleExpiring.length === 0) return null;

  return (
    <div className="space-y-2 px-2 pt-2">
      {/* Expired tokens — red, urgent */}
      {visibleExpired.map((token) => (
        <div
          key={token.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span className="text-destructive font-medium truncate">
              LinkedIn token expired for{" "}
              <strong>{token.name}</strong>
              {token.brandName && (
                <span className="font-normal text-destructive/80">
                  {" "}({token.brandName})
                </span>
              )}
              {" "}— scheduled posts are failing.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="destructive"
              className="h-7 gap-1 text-xs"
              disabled={reconnecting === token.id}
              onClick={() => handleReconnect(token, token.brandId)}
            >
              <RefreshCw className={`h-3 w-3 ${reconnecting === token.id ? "animate-spin" : ""}`} />
              {reconnecting === token.id ? "Redirecting..." : "Renew Now"}
            </Button>
            <button
              onClick={() => handleDismiss(token.id)}
              className="text-destructive/60 hover:text-destructive transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Expiring tokens — yellow, warning */}
      {visibleExpiring.map((token) => (
        <div
          key={token.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <span className="text-yellow-800 dark:text-yellow-300 font-medium truncate">
              LinkedIn token for{" "}
              <strong>{token.name}</strong>
              {token.brandName && (
                <span className="font-normal">
                  {" "}({token.brandName})
                </span>
              )}
              {" "}expires in{" "}
              <strong>{token.daysLeft} day{token.daysLeft !== 1 ? "s" : ""}</strong>.
              Renew it to avoid posting failures.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs border-yellow-500/50 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-500/20"
              disabled={reconnecting === token.id}
              onClick={() => handleReconnect(token, token.brandId)}
            >
              <RefreshCw className={`h-3 w-3 ${reconnecting === token.id ? "animate-spin" : ""}`} />
              {reconnecting === token.id ? "Redirecting..." : "Renew Now"}
            </Button>
            <button
              onClick={() => handleDismiss(token.id)}
              className="text-yellow-600/60 hover:text-yellow-600 dark:text-yellow-400/60 dark:hover:text-yellow-400 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
