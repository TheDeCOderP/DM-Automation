"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const errorMessages: Record<string, string> = {
  OAuthCallback: "There was a problem with the OAuth callback. Please try again.",
  OAuthSignin: "Could not start the sign-in process. Please try again.",
  OAuthCreateAccount: "Could not create your account. Please contact support.",
  Callback: "An error occurred during the callback. Please try again.",
  AccessDenied: "Access denied. Your account may be inactive.",
  Verification: "The verification link is invalid or has expired.",
  Default: "An unexpected error occurred. Please try again.",
};

function AuthErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") ?? "Default";
  const message = errorMessages[error] ?? errorMessages.Default;

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center space-y-6 p-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl max-w-md mx-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-white">Authentication Error</h1>
        <p className="text-white/80">{message}</p>
        {error !== "Default" && (
          <p className="text-xs text-white/50 font-mono bg-white/5 px-3 py-1 rounded">
            Error code: {error}
          </p>
        )}
        <Button asChild className="bg-white text-black hover:bg-white/90">
          <Link href="/">Back to Login</Link>
        </Button>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
