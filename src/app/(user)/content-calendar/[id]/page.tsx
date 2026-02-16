"use client";

import { useState } from "react";
import useSwr from "swr";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  Send,
  Plus,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EditCalendarItemModal from "../_components/EditCalendarItemModal";
import AddCalendarItemModal from "../_components/AddCalendarItemModal";
import ScheduleAllModal from "../_components/ScheduleAllModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CalendarItem {
  id: string;
  day: number;
  topic: string;
  captionLinkedIn?: string;
  captionTwitter?: string;
  captionInstagram?: string;
  captionFacebook?: string;
  captionYouTube?: string;
  captionPinterest?: string;
  captionReddit?: string;
  captionTikTok?: string;
  hashtags: string[];
  imagePrompt?: string;
  imageUrl?: string;
  suggestedTime?: string;
  status: string;
  postGroup?: {
    posts: any[];
  };
}

export default function CalendarDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const { data, mutate, isLoading } = useSwr(
    `/api/content-calendar/${params.id}`,
    fetcher
  );

  const calendar = data?.calendar;
  const items: CalendarItem[] = calendar?.items || [];
  const platforms = calendar?.platforms || [];

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const response = await fetch(`/api/content-calendar/items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete item");

      toast.success("Item deleted successfully");
      mutate();
    } catch (error) {
      toast.error("Failed to delete item");
      console.error(error);
    }
  };

  const handleGenerateImages = async () => {
    // Count items without images
    const itemsWithoutImages = items.filter(item => !item.imageUrl && item.imagePrompt);
    
    if (itemsWithoutImages.length === 0) {
      toast.info("All items already have images or no image prompts");
      return;
    }

    if (!confirm(`Generate images for ${itemsWithoutImages.length} items? This may take 5-10 minutes.`)) {
      return;
    }

    setIsGeneratingImages(true);
    const toastId = toast.loading(`Generating images: 0 / ${itemsWithoutImages.length}`);

    try {
      const response = await fetch(`/api/content-calendar/generate-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: params.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate images");
      }

      const data = await response.json();
      
      toast.success(
        `Generated ${data.generated} images successfully!`,
        { id: toastId }
      );
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.errors.length} images failed to generate`);
      }

      mutate();
    } catch (error) {
      console.error("Error generating images:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate images",
        { id: toastId }
      );
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500";
      case "EDITED":
        return "bg-yellow-500";
      case "SCHEDULED":
        return "bg-blue-500";
      case "PUBLISHED":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Calendar not found</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const draftItems = items.filter((i) => i.status === "DRAFT" || i.status === "EDITED");
  const scheduledItems = items.filter((i) => i.status === "SCHEDULED");
  const publishedItems = items.filter((i) => i.status === "PUBLISHED");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{calendar.topic}</h1>
            <p className="text-muted-foreground mt-1">
              {calendar.duration} days • {items.length} posts • {calendar.brand.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleGenerateImages}
            disabled={isGeneratingImages}
          >
            {isGeneratingImages ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mr-2" />
                Generate Images
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Post
          </Button>
          {draftItems.length > 0 && (
            <Button onClick={() => setShowScheduleModal(true)}>
              <Send className="w-4 h-4 mr-2" />
              Schedule All ({draftItems.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedItems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Platforms */}
      <Card>
        <CardHeader>
          <CardTitle>Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform: string) => (
              <Badge key={platform} variant="outline" className="text-sm">
                {platform}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Items */}
      <Card>
        <CardHeader>
          <CardTitle>Content Calendar</CardTitle>
          <CardDescription>
            Review and edit your content before scheduling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({items.length})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({draftItems.length})</TabsTrigger>
              <TabsTrigger value="scheduled">
                Scheduled ({scheduledItems.length})
              </TabsTrigger>
              <TabsTrigger value="published">
                Published ({publishedItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {items.map((item) => (
                <CalendarItemCard
                  key={item.id}
                  item={item}
                  platforms={platforms}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDeleteItem(item.id)}
                  getStatusColor={getStatusColor}
                />
              ))}
            </TabsContent>

            <TabsContent value="draft" className="space-y-4 mt-4">
              {draftItems.map((item) => (
                <CalendarItemCard
                  key={item.id}
                  item={item}
                  platforms={platforms}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDeleteItem(item.id)}
                  getStatusColor={getStatusColor}
                />
              ))}
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4 mt-4">
              {scheduledItems.map((item) => (
                <CalendarItemCard
                  key={item.id}
                  item={item}
                  platforms={platforms}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDeleteItem(item.id)}
                  getStatusColor={getStatusColor}
                />
              ))}
            </TabsContent>

            <TabsContent value="published" className="space-y-4 mt-4">
              {publishedItems.map((item) => (
                <CalendarItemCard
                  key={item.id}
                  item={item}
                  platforms={platforms}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDeleteItem(item.id)}
                  getStatusColor={getStatusColor}
                />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      {editingItem && (
        <EditCalendarItemModal
          item={editingItem}
          platforms={platforms}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            mutate();
            setEditingItem(null);
          }}
        />
      )}

      {showAddModal && (
        <AddCalendarItemModal
          calendarId={params.id}
          platforms={platforms}
          nextDay={items.length + 1}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            mutate();
            setShowAddModal(false);
          }}
        />
      )}

      {showScheduleModal && (
        <ScheduleAllModal
          calendarId={params.id}
          itemsCount={draftItems.length}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            mutate();
            setShowScheduleModal(false);
            toast.success("All posts scheduled successfully!");
          }}
        />
      )}
    </div>
  );
}

// Calendar Item Card Component
function CalendarItemCard({
  item,
  platforms,
  onEdit,
  onDelete,
  getStatusColor,
}: {
  item: CalendarItem;
  platforms: string[];
  onEdit: () => void;
  onDelete: () => void;
  getStatusColor: (status: string) => string;
}) {
  const [showFullCaption, setShowFullCaption] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Badge variant="outline">Day {item.day}</Badge>
              <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
            </div>
            <CardTitle className="mt-2">{item.topic}</CardTitle>
            {item.suggestedTime && (
              <CardDescription className="mt-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                {new Date(item.suggestedTime).toLocaleString()}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Captions Preview */}
        <div className="space-y-3">
          {platforms.map((platform: string) => {
            const captionKey = `caption${platform.charAt(0) + platform.slice(1).toLowerCase()}` as keyof CalendarItem;
            const caption = item[captionKey] as string;
            
            if (!caption) return null;

            const truncated = caption.length > 150;
            const displayCaption = showFullCaption || !truncated 
              ? caption 
              : caption.substring(0, 150) + "...";

            return (
              <div key={platform} className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-1">{platform}</p>
                <p className="text-sm whitespace-pre-wrap">{displayCaption}</p>
                {truncated && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-1"
                    onClick={() => setShowFullCaption(!showFullCaption)}
                  >
                    {showFullCaption ? "Show less" : "Show more"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Hashtags */}
        {item.hashtags && item.hashtags.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Hashtags:</p>
            <div className="flex flex-wrap gap-2">
              {item.hashtags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Image Prompt or Generated Image */}
        {item.imageUrl ? (
          <div className="border rounded-lg overflow-hidden">
            <img 
              src={item.imageUrl} 
              alt={item.topic}
              className="w-full h-48 object-cover"
            />
            <div className="p-2 bg-muted">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Generated Image
              </p>
            </div>
          </div>
        ) : item.imagePrompt ? (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-semibold mb-1 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Image Prompt:
            </p>
            <p className="text-sm text-muted-foreground">{item.imagePrompt}</p>
          </div>
        ) : null}

        {/* Published Posts */}
        {item.postGroup && item.postGroup.posts.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-sm font-semibold mb-2">Published Posts:</p>
            <div className="space-y-2">
              {item.postGroup.posts.map((post: any) => (
                <div key={post.id} className="flex items-center justify-between text-sm">
                  <span>{post.platform}</span>
                  <Badge variant="outline">{post.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
