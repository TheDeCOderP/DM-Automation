"use client";

import { useState, use, useEffect } from "react";
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
  Sparkles,
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
import BulkRegenerateModal from "../_components/BulkRegenerateModal";
import EditPlatformAccountModal from "../_components/EditPlatformAccountModal";
import { formatDateTime, formatDateTimeUKIndia } from "@/utils/format";

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
  postGroupId?: string;
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
  const [showBulkRegenerate, setShowBulkRegenerate] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSwr(
    `/api/content-calendar/${resolvedParams.id}`,
    fetcher
  );

  const calendar = data?.calendar;
  const items: CalendarItem[] = calendar?.items || [];
  const platforms = calendar?.platforms || [];

  // Fetch social accounts to show account names in the platforms card
  const { data: accountsData } = useSwr(
    calendar?.brandId ? `/api/brands/${calendar.brandId}/social-accounts` : null,
    fetcher
  );
  const socialAccounts = accountsData?.accounts || [];

  // Derive the selected account/page per platform from the first scheduled item
  const getAccountLabelForPlatform = (platform: string) => {
    const scheduledItem = items.find(
      (item) => item.postGroupId && item.postGroup?.posts && item.postGroup.posts.length > 0
    );
    if (!scheduledItem) return null;

    const posts = scheduledItem.postGroup?.posts?.filter(
      (p: any) => p.platform === platform
    );
    if (!posts || posts.length === 0) return null;

    return posts.map((post: any) => {
      const account = socialAccounts.find((a: any) => a.id === post.socialAccountId);
      if (!account) return null;
      if (post.socialAccountPageId) {
        const page = account.pages?.find((pg: any) => pg.id === post.socialAccountPageId);
        return page ? `${account.platformUsername} › ${page.pageName}` : account.platformUsername;
      }
      return account.platformUsername;
    }).filter(Boolean).join(", ");
  };

  const getCurrentSelectionsForPlatform = (platform: string) => {
    const scheduledItem = items.find(
      (item) => item.postGroupId && item.postGroup?.posts && item.postGroup.posts.length > 0
    );
    if (!scheduledItem) return [];
    return (scheduledItem.postGroup?.posts || [])
      .filter((p: any) => p.platform === platform)
      .map((p: any) => ({
        socialAccountId: p.socialAccountId,
        gbpLocationId: p.gbpLocationId ?? null,
        socialAccountPageId: p.socialAccountPageId ?? null,
      }));
  };

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
        return "bg-primary";
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
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
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
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-full w-full sm:w-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
<div className="flex-1 w-full min-w-0">
  {/* Line-clamp-2 allows text to wrap to a second line before truncating */}
  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold line-clamp-2">
    {calendar.topic}
  </h1>

  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
    {calendar.duration} days • {items.length} posts • {calendar.brand.name}
  </p>
</div>
        </div>
      </div>

      {/* Action Buttons - Responsive Grid */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <Button 
          variant="outline" 
          onClick={handleGenerateImages}
          disabled={isGeneratingImages}
          className="col-span-2 sm:col-span-1 text-xs sm:text-sm"
        >
          {isGeneratingImages ? (
            <>
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
              <span className="hidden xs:inline">Generating...</span>
              <span className="xs:hidden">Gen...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Generate Images</span>
              <span className="xs:hidden">Images</span>
            </>
          )}
        </Button>
        <Button variant="outline" onClick={() => setShowBulkRegenerate(true)} className="text-xs sm:text-sm">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Bulk Regenerate</span>
          <span className="xs:hidden">Regenerate</span>
        </Button>
        <Button variant="outline" onClick={() => setShowAddModal(true)} className="text-xs sm:text-sm">
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Add Post</span>
          <span className="xs:hidden">Add</span>
        </Button>
        {draftItems.length > 0 && (
          <Button onClick={() => setShowScheduleModal(true)} className="col-span-2 sm:col-span-1 text-xs sm:text-sm">
            <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Schedule All ({draftItems.length})</span>
            <span className="xs:hidden">Schedule ({draftItems.length})</span>
          </Button>
        )}
      </div>

      {/* Stats - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Posts</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{draftItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{scheduledItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{publishedItems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Platforms - Responsive */}
      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Platforms</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {platforms.map((platform: string) => {
              const accountLabel = getAccountLabelForPlatform(platform);
              return (
                <div
                  key={platform}
                  className="flex flex-col gap-0.5 sm:gap-1 cursor-pointer group"
                  onClick={() => setEditingPlatform(platform)}
                  title="Click to change account"
                >
                  <Badge variant="outline" className="text-xs sm:text-sm group-hover:border-primary group-hover:text-primary transition-colors">
                    {platform}
                  </Badge>
                  {accountLabel ? (
                    <span className="text-[10px] sm:text-xs text-muted-foreground pl-1 group-hover:text-primary transition-colors max-w-[120px] sm:max-w-none truncate">
                      {accountLabel}
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs text-muted-foreground/50 pl-1">
                      no account
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Items */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 sm:gap-0">
          <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">All ({items.length})</TabsTrigger>
          <TabsTrigger value="draft" className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">Draft ({draftItems.length})</TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
            Scheduled ({scheduledItems.length})
          </TabsTrigger>
          <TabsTrigger value="published" className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
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

      {/* Modals */}
      {editingPlatform && (
        <EditPlatformAccountModal
          calendarId={resolvedParams.id}
          platform={editingPlatform}
          accounts={socialAccounts}
          currentSelections={getCurrentSelectionsForPlatform(editingPlatform)}
          onClose={() => setEditingPlatform(null)}
          onSuccess={() => {
            mutate();
            setEditingPlatform(null);
          }}
        />
      )}

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
          items={items}
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

      {showBulkRegenerate && (
        <BulkRegenerateModal
          items={items}
          platforms={platforms}
          onClose={() => setShowBulkRegenerate(false)}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  );
}

function useTimeRemaining(targetDate: string | undefined) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!targetDate) {
      setLabel("");
      return;
    }

    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("overdue");
        return;
      }
      const totalMinutes = Math.floor(diff / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
      setLabel(parts.join(" ") + " remaining");
    };

    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [targetDate]);

  return label;
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
      <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm sm:text-base">
        No items found
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 sm:w-16 text-xs sm:text-sm">#</TableHead>
              <TableHead className="w-16 sm:w-20 text-xs sm:text-sm">Day</TableHead>
              <TableHead className="w-24 sm:w-32 text-xs sm:text-sm">Status</TableHead>
              <TableHead className="min-w-[100px] text-xs sm:text-sm">Topic</TableHead>
              <TableHead className="hidden md:table-cell w-48 text-xs sm:text-sm">Scheduled Time</TableHead>
              <TableHead className="w-16 sm:w-24 text-xs sm:text-sm">Image</TableHead>
              <TableHead className="w-28 sm:w-32 text-right text-xs sm:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                <CalendarItemRow
                  item={item}
                  index={index}
                  platforms={platforms}
                  expandedRow={expandedRow}
                  setExpandedRow={setExpandedRow}
                  setImagePreview={setImagePreview}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onSchedule={onSchedule}
                  getStatusColor={getStatusColor}
                />
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

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

function CalendarItemRow({
  item,
  index,
  platforms,
  expandedRow,
  setExpandedRow,
  setImagePreview,
  onEdit,
  onDelete,
  onSchedule,
  getStatusColor,
}: {
  item: CalendarItem;
  index: number;
  platforms: string[];
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
  setImagePreview: (url: string | null) => void;
  onEdit: (item: CalendarItem) => void;
  onDelete: (id: string) => void;
  onSchedule: (item: CalendarItem) => void;
  getStatusColor: (status: string) => string;
}) {
  // Prefer the actual scheduled time on the linked post(s) over the calendar
  // item's suggestedTime — suggestedTime can drift if the item is edited after
  // scheduling, which would falsely show "overdue" while the post is still
  // queued for its real scheduledAt.
  const effectiveScheduledTime =
    item.status === "SCHEDULED"
      ? (item.postGroup?.posts?.[0]?.scheduledAt as string | undefined) || item.suggestedTime
      : undefined;
  const timeRemaining = useTimeRemaining(effectiveScheduledTime);

  return (
    <React.Fragment>
      <TableRow className="cursor-pointer hover:bg-muted/50">
        <TableCell className="font-medium text-xs sm:text-sm">{index + 1}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-[10px] sm:text-xs">Day {item.day}</Badge>
        </TableCell>
        <TableCell>
          <Badge className={`${getStatusColor(item.status)} text-[10px] sm:text-xs`}>{item.status}</Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[150px] md:max-w-[200px]">
              {item.topic}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
              className="h-6 w-6 sm:h-7 sm:w-7 p-0"
            >
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {item.suggestedTime ? (
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-muted-foreground">
                <Calendar className="w-2 h-2 sm:w-3 sm:h-3" />
                <span>UK / India</span>
              </div>
              {(() => {
                const times = formatDateTimeUKIndia(item.suggestedTime);
                return (
                  <>
                    <div className="text-[10px] sm:text-xs font-medium">🇬🇧 {times.uk}</div>
                    <div className="text-[10px] sm:text-xs font-medium">🇮🇳 {times.india}</div>
                  </>
                );
              })()}
              {timeRemaining && (
                <div className={`text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1 ${timeRemaining === "overdue" ? "text-destructive" : "text-primary"}`}>
                  ⏱ {timeRemaining}
                </div>
              )}
              {item.status === "COMPLETED" && item.postGroup?.posts?.length ? (
                <div className="flex flex-col gap-0.5 mt-0.5 sm:mt-1">
                  {item.postGroup.posts
                    .filter((p: any) => p.url)
                    .map((p: any) => (
                      <a
                        key={p.id}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] sm:text-xs font-medium text-primary hover:underline truncate max-w-[150px]"
                        title={p.url}
                      >
                        🔗 {p.platform}
                      </a>
                    ))}
                </div>
              ) : null}
            </div>
          ) : (
            <span className="text-muted-foreground text-[10px] sm:text-sm">Not set</span>
          )}
        </TableCell>
        <TableCell>
          {item.imageUrl ? (
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm text-green-600 hover:text-green-700 p-1 sm:p-2"
              onClick={() => setImagePreview(item.imageUrl!)}
            >
              <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Yes</span>
            </Button>
          ) : item.imagePrompt ? (
            <span className="text-muted-foreground text-[10px] sm:text-sm">Pending</span>
          ) : (
            <span className="text-muted-foreground text-[10px] sm:text-sm">No</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-0.5 sm:gap-1 justify-end">
            {item.status === "PUBLISHED" && item.postGroup?.posts?.some((post: any) => post.status === "PUBLISHED" && post.url) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const publishedPost = item.postGroup?.posts?.find((post: any) => post.status === "PUBLISHED" && post.url);
                  if (publishedPost?.url) window.open(publishedPost.url, "_blank");
                }}
                title="View published post"
                className="h-6 w-6 sm:h-8 sm:w-8"
              >
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            )}
            {(item.status === "DRAFT" || item.status === "EDITED") && (
              <Button
                variant="default"
                size="icon"
                onClick={() => onSchedule(item)}
                title="Schedule Now"
                className="h-6 w-6 sm:h-8 sm:w-8"
              >
                <Send className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-6 w-6 sm:h-8 sm:w-8">
              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="h-6 w-6 sm:h-8 sm:w-8">
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expandedRow === item.id && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-2 sm:p-4">
            <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
              <div className="space-y-2 sm:space-y-3">
                <h4 className="font-semibold text-xs sm:text-sm">Captions:</h4>
                {platforms.map((platform: string) => {
                  const captionKey = `caption${platform.charAt(0) + platform.slice(1).toLowerCase()}` as keyof CalendarItem;
                  const caption = item[captionKey] as string;
                  if (!caption) return null;
                  return (
                    <div key={platform} className="p-2 sm:p-3 bg-background rounded-lg border">
                      <p className="text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1">{platform}</p>
                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{caption}</p>
                    </div>
                  );
                })}
              </div>
              {item.hashtags && item.hashtags.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm mb-1 sm:mb-2">Hashtags:</h4>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {item.hashtags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] sm:text-xs">#{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {item.imageUrl ? (
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm mb-1 sm:mb-2">Generated Image:</h4>
                  <div className="border rounded-lg overflow-hidden max-w-full sm:max-w-md">
                    <img src={item.imageUrl} alt={item.topic} className="w-full h-48 sm:h-64 object-cover" />
                  </div>
                </div>
              ) : item.imagePrompt ? (
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm mb-1 sm:mb-2">Image Prompt:</h4>
                  <div className="p-2 sm:p-3 bg-background rounded-lg border">
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">{item.imagePrompt}</p>
                  </div>
                </div>
              ) : null}
              {item.postGroup && item.postGroup.posts.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm mb-1 sm:mb-2">Posts:</h4>
                  <div className="space-y-1 sm:space-y-2">
                    {item.postGroup.posts.map((post: any) => (
                      <div key={post.id} className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1 xs:gap-2 text-xs sm:text-sm p-2 bg-background rounded border">
                        <span>{post.platform}</span>
                        <div className="flex items-center gap-1 sm:gap-2 w-full xs:w-auto justify-between xs:justify-end">
                          <Badge variant="outline" className="text-[10px] sm:text-xs">{post.status}</Badge>
                          {post.status === "PUBLISHED" && post.url && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => window.open(post.url, "_blank")}>
                              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
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
  );
}