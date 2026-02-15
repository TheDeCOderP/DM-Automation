"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InactivePage() {
  const router = useRouter();

  useEffect(() => {
    // Sign out the user when they land on this page
    signOut({ redirect: false });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
            <AlertCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-2xl">Account Inactive</CardTitle>
          <CardDescription className="text-base">
            Your account is pending approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-2">What does this mean?</p>
            <p>
              Your account has been created successfully, but it needs to be
              activated by an administrator before you can access the platform.
            </p>
          </div>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <strong>Next steps:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>An admin will review your account shortly</li>
              <li>You'll receive an email once your account is activated</li>
              <li>Contact support if you need immediate access</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={() => router.push("/login")}
            className="w-full"
            variant="default"
          >
            Back to Login
          </Button>
          <Button
            onClick={() => router.push("/")}
            className="w-full"
            variant="outline"
          >
            Go to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
