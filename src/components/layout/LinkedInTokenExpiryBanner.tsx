"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";
import { AlertTriangle, X, RefreshCw, Building2, User } from "lucide-react";
import { useState, useEffect } from "react";
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

type AnyToken = ExpiredToken | ExpiringToken;

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

function isExpired(t: AnyToken): t is ExpiredToken {
  return "expiredAt" in t;
}

function TokenCard({
  token,
  onDismiss,
}: {
  token: AnyToken;
  onDismiss: (id: string) => void;
}) {
  const [reconnecting, setReconnecting] = useState(false);
  const expired = isExpired(token);

  const handleReconnect = () => {
    setReconnecting(true);
    // For page tokens reconnect via pages OAuth, for personal account via personal OAuth
    if (token.type === "page") {
      window.location.href = `/api/accounts/linkedin/pages/auth?brandId=${token.brandId}&returnUrl=${encodeURIComponent(window.location.pathname)}`;
    } else {
      // Personal LinkedIn account reconnect
      window.location.href = `/api/accounts/linkedin/auth?userId=me&brandId=${token.brandId}&returnUrl=${encodeURIComponent(window.location.pathname)}`;
    }
  };

  const borderClass = expired
    ? "border-destructive/40 bg-destructive/10"
    : "border-yellow-500/40 bg-yellow-500/10";

  const iconClass = expired
    ? "text-destructive"
    : "text-yellow-600 dark:text-yellow-400";

  const textClass = expired
    ? "text-destructive"
    : "text-yellow-800 dark:text-yellow-300";

  const dismissClass = expired
    ? "text-destructive/50 hover:text-destructive"
    : "text-yellow-600/50 hover:text-yellow-600 dark:text-yellow-400/50 dark:hover:text-yellow-400";

  const btnClass = expired
    ? undefined
    : "border-yellow-500/50 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-500/20";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm ${borderClass}`}
    >
      {/* Left: icon + info */}
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className={`h-4 w-4 shrink-0 ${iconClass}`} />

        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {/* Page / Account icon + name */}
          <span className={`flex items-center gap-1 font-semibold ${textClass}`}>
            {token.type === "page" ? (
              <Building2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <User className="h-3.5 w-3.5 shrink-0" />
            )}
            {token.name}
          </span>

          {/* Brand badge */}
          <span className="text-xs px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-muted-foreground shrink-0">
            {token.brandName}
          </span>

          {/* Status text */}
          <span className={`${textClass} opacity-80`}>
            {expired
              ? "— token expired. Posts are failing."
              : `— expires in ${(token as ExpiringToken).daysLeft} day${(token as ExpiringToken).daysLeft !== 1 ? "s" : ""}.`}
          </span>
        </div>
      </div>

      {/* Right: Renew + dismiss */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          size="sm"
          variant={expired ? "destructive" : "outline"}
          className={`h-7 gap-1.5 text-xs ${btnClass ?? ""}`}
          disabled={reconnecting}
          onClick={handleReconnect}
        >
          <RefreshCw className={`h-3 w-3 ${reconnecting ? "animate-spin" : ""}`} />
          {reconnecting ? "Redirecting..." : "Renew Now"}
        </Button>

        <button
          type="button"
          onClick={() => onDismiss(token.id)}
          className={`transition-colors ${dismissClass}`}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function LinkedInTokenExpiryBanner() {
  const { status } = useSession();
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Load dismissed state from sessionStorage (resets on browser close)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DISMISSED_KEY);
      if (stored) setDismissed(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const { data } = useSWR<TokenStatusResponse>(
    status === "authenticated" ? "/api/accounts/token-status" : null,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const handleDismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  if (!data) return null;

  const { expiredTokens, expiringTokens } = data;

  const visibleExpired = expiredTokens.filter((t) => !dismissed.includes(t.id));
  const visibleExpiring = expiringTokens.filter((t) => !dismissed.includes(t.id));

  if (visibleExpired.length === 0 && visibleExpiring.length === 0) return null;

  return (
    <div className="space-y-1.5 px-2 pt-2">
      {visibleExpired.map((token) => (
        <TokenCard key={token.id} token={token} onDismiss={handleDismiss} />
      ))}
      {visibleExpiring.map((token) => (
        <TokenCard key={token.id} token={token} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
