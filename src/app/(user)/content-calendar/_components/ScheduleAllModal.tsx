"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ScheduleAllModalProps {
  calendarId: string;
  itemsCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScheduleAllModal({
  calendarId,
  itemsCount,
  onClose,
  onSuccess,
}: ScheduleAllModalProps) {
  const [isScheduling, setIsScheduling] = useState(false);
  const [progress, setProgress] = useState("");

  const handleSchedule = async () => {
    setIsScheduling(true);
    setProgress("Creating posts and cron jobs...");

    try {
      const response = await fetch("/api/content-calendar/schedule-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to schedule posts");
      }

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        toast.warning(
          `Scheduled ${data.scheduled} posts with ${data.errors.length} errors`
        );
      } else {
        toast.success(`Successfully scheduled ${data.scheduled} posts!`);
      }

      onSuccess();
    } catch (error) {
      console.error("Error scheduling posts:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to schedule posts"
      );
    } finally {
      setIsScheduling(false);
      setProgress("");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule All Posts</DialogTitle>
          <DialogDescription>
            This will schedule {itemsCount} calendar items for automatic publishing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Posts will be created for all selected platforms</li>
                <li>Cron jobs will be set up for automatic publishing</li>
                <li>Posts will publish at their suggested times</li>
                <li>You can view scheduled posts in the Posts page</li>
              </ul>
            </AlertDescription>
          </Alert>

          {isScheduling && (
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{progress}</p>
                  <p className="text-sm text-muted-foreground">
                    This may take 10-30 seconds...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isScheduling}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isScheduling}>
            {isScheduling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Schedule {itemsCount} Posts
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
