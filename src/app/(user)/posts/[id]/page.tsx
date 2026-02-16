"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Edit,
  Save,
  Send,
  Calendar,
  Clock,
  ExternalLink,
  Trash2,
  Image as ImageIcon,
  Video,
  X,
  AlertCircle,
} from "lucide-react";
import { getPlatformIcon } from "@/utils/ui/icons";
import { Platform, Status } from "@prisma/client";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((res) => res.json()).then((data) => data.post || data);

interface Post {
  id: string;
  title: string | null;
  content: string;
  platform: Platform;
  status: Status;
  url: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  user: {
    name: string | null;
    email: string;
  };
  brand?: {
    id: string;
    name: string;
  };
  socialAccountPage: {
    id: string;
    name: string;
    pageName: string;
    platform: Platform;
    socialAccount: {
      platformUsername: string;
    };
  } | null;
  media: {
    id: string;
    url: string;
    type: string;
  }[];
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPost, setEditedPost] = useState<Partial<Post>>({});

  const { data: post, isLoading, mutate } = useSWR<Post>(
    `/api/posts/${params.id}`,
    fetcher
  );

  useEffect(() => {
    if (post) {
      setEditedPost({
        title: post.title,
        content: post.content,
        platform: post.platform,
        scheduledAt: post.scheduledAt,
      });
    }
  }, [post]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (post) {
      setEditedPost({
        title: post.title,
        content: post.content,
        platform: post.platform,
        scheduledAt: post.scheduledAt,
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/posts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedPost),
      });

      if (!response.ok) throw new Error("Failed to update post");

      toast.success("Post updated successfully");
      setIsEditing(false);
      mutate();
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/posts/${params.id}/publish`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to publish post");

      toast.success("Post published successfully");
      mutate();
    } catch (error) {
      console.error("Error publishing post:", error);
      toast.error("Failed to publish post");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!editedPost.scheduledAt) {
      toast.error("Please select a schedule time");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/posts/${params.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: editedPost.scheduledAt }),
      });

      if (!response.ok) throw new Error("Failed to schedule post");

      toast.success("Post scheduled successfully");
      mutate();
    } catch (error) {
      console.error("Error scheduling post:", error);
      toast.error("Failed to schedule post");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const response = await fetch(`/api/posts/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete post");

      toast.success("Post deleted successfully");
      router.push("/posts");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "SCHEDULED":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "DRAFTED":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
      case "FAILED":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700";
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

  if (!post) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Post not found</h3>
          <p className="text-muted-foreground mb-4">
            The post you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => router.push("/posts")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Posts
          </Button>
        </CardContent>
      </Card>
    );
  }

  const PlatformIcon = getPlatformIcon(post.platform);
  const canEdit = post.status === "DRAFTED" || post.status === "FAILED" || post.status === "SCHEDULED";
  const canPublish = post.status === "DRAFTED";
  const canSchedule = post.status === "DRAFTED";

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
            <h1 className="text-3xl font-bold">
              {post.title || "Untitled Post"}
            </h1>
            <p className="text-muted-foreground">
              {post.brand?.name || "Unknown Brand"} • Created{" "}
              {post.createdAt ? format(new Date(post.createdAt), "MMM d, yyyy") : "Unknown"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && canEdit && (
            <Button onClick={handleEdit} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button onClick={handleCancel} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
          <Button
            onClick={handleDelete}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Content */}
          <Card>
            <CardHeader>
              <CardTitle>Post Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title (Optional)</Label>
                    <Input
                      id="title"
                      value={editedPost.title || ""}
                      onChange={(e) =>
                        setEditedPost({ ...editedPost, title: e.target.value })
                      }
                      placeholder="Enter post title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={editedPost.content || ""}
                      onChange={(e) =>
                        setEditedPost({
                          ...editedPost,
                          content: e.target.value,
                        })
                      }
                      placeholder="Enter post content"
                      rows={10}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {editedPost.content?.length || 0} characters
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {post.title && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        {post.title}
                      </h3>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm">
                    {post.content}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Media */}
          {post.media.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Media ({post.media.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {post.media.map((media) => (
                    <div
                      key={media.id}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      {media.type === "IMAGE" ? (
                        <img
                          src={media.url}
                          alt="Post media"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge className={getStatusColor(post.status)}>
                  {post.status}
                </Badge>
              </div>

              <Separator />

              {canPublish && (
                <Button
                  onClick={handlePublish}
                  disabled={isSaving}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish Now
                </Button>
              )}

              {canSchedule && (
                <div className="space-y-2">
                  <Label htmlFor="scheduleTime">Schedule for later</Label>
                  <Input
                    id="scheduleTime"
                    type="datetime-local"
                    value={
                      editedPost.scheduledAt
                        ? format(
                            new Date(editedPost.scheduledAt),
                            "yyyy-MM-dd'T'HH:mm"
                          )
                        : ""
                    }
                    onChange={(e) =>
                      setEditedPost({
                        ...editedPost,
                        scheduledAt: e.target.value,
                      })
                    }
                    min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                  />
                  <Button
                    onClick={handleSchedule}
                    disabled={isSaving || !editedPost.scheduledAt}
                    variant="outline"
                    className="w-full"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Post
                  </Button>
                </div>
              )}

              {post.url && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(post.url!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on {post.platform}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Platform & Account */}
          <Card>
            <CardHeader>
              <CardTitle>Platform & Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {PlatformIcon}
                <span className="font-medium">{post.platform}</span>
              </div>

              {post.socialAccountPage && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Posted via</p>
                  <p className="font-medium">
                    @{post.socialAccountPage.socialAccount.platformUsername}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {post.socialAccountPage.pageName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{post.createdAt ? format(new Date(post.createdAt), "MMM d, yyyy HH:mm") : "Unknown"}</span>
              </div>
              {post.scheduledAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(post.scheduledAt), "MMM d, yyyy HH:mm")}
                  </span>
                </div>
              )}
              {post.publishedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <span>{format(new Date(post.publishedAt), "MMM d, yyyy HH:mm")}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{post.updatedAt ? format(new Date(post.updatedAt), "MMM d, yyyy HH:mm") : "Unknown"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
