"use client";

import { useState, use } from "react";
import React from "react";
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
  Eye,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EditCalendarItemModal from "../_components/EditCalendarItemModal";
import AddCalendarItemModal from "../_components/AddCalendarItemModal";
import ScheduleAllModal from "../_components/ScheduleAllModal";
import ScheduleItemModal from "../_components/ScheduleItemModal";
import { formatDateTime } from "@/utils/format";

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

export default function CalendarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingItem, setSchedulingItem] = useState<CalendarItem | null>(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const { data, mutate, isLoading } = useSwr(
    `/api/content-calendar/${resolvedParams.id}`,
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

  const handleScheduleItem = async (item: CalendarItem) => {
    if (!item.suggestedTime) {
      toast.error("Please set a suggested time first by editing the post");
      return;
    }

    // Open the schedule modal
    setSchedulingItem(item);
  };

  const handleGenerateImages = async () => {
    // Count items without images
    const itemsWithoutImages = items.filter(item => !item.imageUrl && item.imagePrompt);
    
    if (itemsWithoutImages.length === 0) {
      toast.info("All items already have images or no image prompts");
      return;
    }

    if (!confirm(`Generate images for ${itemsWithoutImages.length} items? This will be done in batches to avoid timeouts.`)) {
      return;
    }

    setIsGeneratingImages(true);
    let totalGenerated = 0;
    const toastId = toast.loading(`Generating images: 0 / ${itemsWithoutImages.length}`);

    try {
      // Keep calling the API until all images are generated
      let hasMoreToGenerate = true;
      let attempts = 0;
      const MAX_ATTEMPTS = 20; // Safety limit
      
      while (hasMoreToGenerate && attempts < MAX_ATTEMPTS) {
        attempts++;
        
        const response = await fetch(`/api/content-calendar/generate-images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId: resolvedParams.id,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to generate images");
        }

        const data = await response.json();
        totalGenerated += data.generated;
        
        // Update progress
        toast.loading(
          `Generating images: ${totalGenerated} / ${itemsWithoutImages.length}`,
          { id: toastId }
        );
        
        // Check if there are more images to generate
        hasMoreToGenerate = data.needsMoreGeneration && data.remaining > 0;
        
        if (!hasMoreToGenerate) {
          break;
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      toast.success(
        `Generated ${totalGenerated} images successfully!`,
        { id: toastId }
      );

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

            <TabsContent value="all" className="mt-4">
              <CalendarItemsTable
                items={items}
                platforms={platforms}
                onEdit={setEditingItem}
                onDelete={handleDeleteItem}
                onSchedule={handleScheduleItem}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="draft" className="mt-4">
              <CalendarItemsTable
                items={draftItems}
                platforms={platforms}
                onEdit={setEditingItem}
                onDelete={handleDeleteItem}
                onSchedule={handleScheduleItem}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="scheduled" className="mt-4">
              <CalendarItemsTable
                items={scheduledItems}
                platforms={platforms}
                onEdit={setEditingItem}
                onDelete={handleDeleteItem}
                onSchedule={handleScheduleItem}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="published" className="mt-4">
              <CalendarItemsTable
                items={publishedItems}
                platforms={platforms}
                onEdit={setEditingItem}
                onDelete={handleDeleteItem}
                onSchedule={handleScheduleItem}
                getStatusColor={getStatusColor}
              />
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
          calendarId={resolvedParams.id}
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
          calendarId={resolvedParams.id}
          itemsCount={draftItems.length}
          platforms={platforms}
          brandId={calendar.brandId}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => {
            mutate();
            setShowScheduleModal(false);
            toast.success("All posts scheduled successfully!");
          }}
        />
      )}

      {schedulingItem && (
        <ScheduleItemModal
          item={schedulingItem}
          platforms={platforms}
          brandId={calendar.brandId}
          onClose={() => setSchedulingItem(null)}
          onSuccess={() => {
            mutate();
            setSchedulingItem(null);
          }}
        />
      )}
    </div>
  );
}

// Calendar Items Table Component
function CalendarItemsTable({
  items,
  platforms,
  onEdit,
  onDelete,
  onSchedule,
  getStatusColor,
}: {
  items: CalendarItem[];
  platforms: string[];
  onEdit: (item: CalendarItem) => void;
  onDelete: (itemId: string) => void;
  onSchedule: (item: CalendarItem) => void;
  getStatusColor: (status: string) => string;
}) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No items found
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">S. No.</TableHead>
            <TableHead className="w-20">Day</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead className="w-48">Scheduled Time</TableHead>
            <TableHead className="w-24">Image</TableHead>
            <TableHead className="w-32 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              <TableRow className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  <Badge variant="outline">Day {item.day}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.topic}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {item.suggestedTime ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3" />
                      {formatDateTime(item.suggestedTime)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Not set</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.imageUrl ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                      onClick={() => setImagePreview(item.imageUrl!)}
                    >
                      <ImageIcon className="w-4 h-4" />
                      Yes
                    </Button>
                  ) : item.imagePrompt ? (
                    <span className="text-muted-foreground text-sm">Pending</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">No</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    {item.status === "PUBLISHED" && item.postGroup?.posts?.some((post: any) => post.status === "PUBLISHED" && post.url) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const publishedPost = item.postGroup?.posts?.find((post: any) => post.status === "PUBLISHED" && post.url);
                          if (publishedPost?.url) window.open(publishedPost.url, '_blank');
                        }}
                        title="View published post"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    {(item.status === "DRAFT" || item.status === "EDITED") && (
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => onSchedule(item)}
                        title="Schedule Now"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              
              {/* Expanded Row Details */}
              {expandedRow === item.id && (
                <TableRow>
                  <TableCell colSpan={7} className="bg-muted/30">
                    <div className="p-4 space-y-4">
                      {/* Captions */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Captions:</h4>
                        {platforms.map((platform: string) => {
                          const captionKey = `caption${platform.charAt(0) + platform.slice(1).toLowerCase()}` as keyof CalendarItem;
                          const caption = item[captionKey] as string;
                          
                          if (!caption) return null;

                          return (
                            <div key={platform} className="p-3 bg-background rounded-lg border">
                              <p className="text-sm font-semibold mb-1">{platform}</p>
                              <p className="text-sm whitespace-pre-wrap">{caption}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Hashtags */}
                      {item.hashtags && item.hashtags.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Hashtags:</h4>
                          <div className="flex flex-wrap gap-2">
                            {item.hashtags.map((tag: string, idx: number) => (
                              <Badge key={idx} variant="secondary">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Image */}
                      {item.imageUrl ? (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Generated Image:</h4>
                          <div className="border rounded-lg overflow-hidden max-w-md">
                            <img 
                              src={item.imageUrl} 
                              alt={item.topic}
                              className="w-full h-64 object-cover"
                            />
                          </div>
                        </div>
                      ) : item.imagePrompt ? (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Image Prompt:</h4>
                          <div className="p-3 bg-background rounded-lg border">
                            <p className="text-sm text-muted-foreground">{item.imagePrompt}</p>
                          </div>
                        </div>
                      ) : null}

                      {/* Published Posts */}
                      {item.postGroup && item.postGroup.posts.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Published Posts:</h4>
                          <div className="space-y-2">
                            {item.postGroup.posts.map((post: any) => (
                              <div key={post.id} className="flex items-center justify-between text-sm p-2 bg-background rounded border">
                                <span>{post.platform}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{post.status}</Badge>
                                  {post.status === "PUBLISHED" && post.url && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => window.open(post.url, '_blank')}
                                      title="View published post"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-2xl w-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-10 right-0 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setImagePreview(null)}
            >
              <span className="text-2xl">×</span>
            </Button>
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
