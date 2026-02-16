"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPlatformIcon } from "@/utils/ui/icons";
import { ArrowLeft, Calendar, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ScheduledPostsPage() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data, isLoading, mutate } = useSWR("/api/posts/scheduled", fetcher, {
    refreshInterval: 30000, // Auto-refresh every 30 seconds
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setIsRefreshing(false);
    toast.success("Refreshed scheduled posts");
  };

  const handleManualTrigger = async () => {
    try {
      const response = await fetch("/api/cron-jobs/publish-post", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET_TOKEN || ""}`,
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Published ${result.successCount} posts`);
        await mutate();
      } else {
        toast.error(result.error || "Failed to trigger publishing");
      }
    } catch (error) {
      console.error("Error triggering cron:", error);
      toast.error("Failed to trigger publishing");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const posts = data?.posts || [];
  const pastDuePosts = posts.filter((p: any) => p.isPastDue);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/posts")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Scheduled Posts</h1>
            <p className="text-muted-foreground">
              {posts.length} posts scheduled • Last updated:{" "}
              {data?.currentTime ? format(new Date(data.currentTime), "HH:mm:ss") : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Past Due Alert */}
      {pastDuePosts.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900 dark:text-orange-100">
                  {pastDuePosts.length} post(s) past scheduled time
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  These posts should have been published by now. The cron job may not be running.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Posts ({posts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No scheduled posts</h3>
              <p className="text-muted-foreground mb-4">
                All your posts have been published or are in draft.
              </p>
              <Button onClick={() => router.push("/posts/create")}>
                Create New Post
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Time Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post: any) => {
                  const PlatformIcon = getPlatformIcon(post.platform);
                  return (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          {post.title && (
                            <p className="font-medium truncate">{post.title}</p>
                          )}
                          <p className="text-sm text-muted-foreground truncate">
                            {post.content}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {PlatformIcon}
                          <span className="text-sm">{post.platform}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{post.brand?.name || "Unknown"}</span>
                      </TableCell>
                      <TableCell>
                        {post.scheduledAt ? (
                          <div className="text-sm">
                            <p>{format(new Date(post.scheduledAt), "MMM d, yyyy")}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(post.scheduledAt), "HH:mm:ss")}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={post.isPastDue ? "destructive" : "secondary"}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {post.timeUntilFormatted}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                          SCHEDULED
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/posts/${post.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Server Time:</span>
            <span className="font-mono">
              {data?.currentTime ? format(new Date(data.currentTime), "yyyy-MM-dd HH:mm:ss") : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auto-refresh:</span>
            <span>Every 30 seconds</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Scheduled:</span>
            <span>{posts.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Past Due:</span>
            <span className={pastDuePosts.length > 0 ? "text-orange-600 font-semibold" : ""}>
              {pastDuePosts.length}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
