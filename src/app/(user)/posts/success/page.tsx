"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Plus, ArrowLeft, Calendar } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent mb-2">
            Post Published Successfully!
          </h1>
          <p className="text-lg text-muted-foreground">
            Your post has been created and scheduled for publication across your selected social media accounts.
          </p>
        </div>

        {/* Success Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">All set!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your content will be automatically published according to your schedule.
                You can track the performance and engagement in your dashboard.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => router.push('/posts/create')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Another Post
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/posts/calendar')}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            View Calendar
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/accounts')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>
    </div>
  );
}
