"use client";

import { useState, useEffect } from "react";
import useSwr from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Calendar, Eye, CheckCircle2, Clock, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import CreateCalendarModal from "./_components/CreateCalendarModal";
import { formatDate } from "@/utils/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CalendarSummary {
  id: string;
  topic: string;
  duration: number;
  platforms: string[];
  postsPerWeek: number;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  itemCount: number;
  imageCount: number;
}

interface BrandOverview {
  total: number;
  draft: number;
  scheduled: number;
  completed: number;
  totalItems: number;
  itemsWithImages: number;
  calendars: CalendarSummary[];
}

interface SocialAccount {
  id: string;
  platform: string;
}

interface Brand {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  socialAccounts?: SocialAccount[];
}

// Skeleton row for the overview table
function BrandRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-8 w-10 mx-auto" /></TableCell>
      <TableCell><Skeleton className="h-8 w-10 mx-auto" /></TableCell>
      <TableCell><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ContentCalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandIdFromUrl = searchParams.get("brand");

  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandIdFromUrl || "");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [navigatingToCalendar, setNavigatingToCalendar] = useState<string | null>(null);
  const [deletingCalendar, setDeletingCalendar] = useState<string | null>(null);

  // Fetch brands (needed for brand name/logo and connected platforms)
  const { data: brandsData, isLoading: isLoadingBrands } = useSwr("/api/brands", fetcher);
  const brands: Brand[] = brandsData?.data || [];

  // Sync URL param → state (only after brands load so we can validate the id)
  useEffect(() => {
    if (brandIdFromUrl && brands.length > 0) {
      const exists = brands.find((b) => b.id === brandIdFromUrl);
      if (exists) setSelectedBrandId(brandIdFromUrl);
    }
  }, [brandIdFromUrl, brands]);

  // ── Overview: single endpoint instead of N fan-out calls ─────────────────
  const { data: overviewData, mutate: mutateOverview } = useSwr<{ overview: Record<string, BrandOverview> }>(
    "/api/content-calendar/overview",
    fetcher,
    { revalidateOnFocus: false }
  );

  // ── Selected brand's calendar list (only when drilling into a brand) ──────
  const { data: selectedBrandCalendars, mutate: mutateSelectedBrand, isLoading: isLoadingCalendars } = useSwr(
    selectedBrandId ? `/api/content-calendar?brandId=${selectedBrandId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  // Build the calendar list for the selected brand.
  // Prefer the dedicated fetch (has brand info); fall back to overview data.
  const selectedCalendars: CalendarSummary[] = selectedBrandCalendars?.calendars
    ? selectedBrandCalendars.calendars.map((c: any) => ({
        ...c,
        itemCount: c.items?.length ?? 0,
        imageCount: c.items?.filter((i: any) => !!i.imageUrl).length ?? 0,
      }))
    : overviewData?.overview?.[selectedBrandId]?.calendars ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":      return "bg-gray-500";
      case "SCHEDULED":  return "bg-primary";
      case "COMPLETED":  return "bg-green-500";
      default:           return "bg-gray-500";
    }
  };

  const getConnectedPlatforms = (brandId: string): string[] => {
    const brand = brands.find((b) => b.id === brandId);
    if (!brand?.socialAccounts?.length) return [];
    return [...new Set(brand.socialAccounts.map((sa) => sa.platform))];
  };

  const handleDeleteCalendar = async (calendarId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this calendar? This will delete all posts in this calendar.")) return;

    setDeletingCalendar(calendarId);
    try {
      const response = await fetch(`/api/content-calendar?calendarId=${calendarId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete calendar");
      toast.success("Calendar deleted successfully");
      mutateOverview();
      mutateSelectedBrand();
    } catch (error) {
      console.error("Error deleting calendar:", error);
      toast.error("Failed to delete calendar");
    } finally {
      setDeletingCalendar(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-2 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage bulk content for multiple platforms
          </p>
        </div>
        {selectedBrandId && (
          <Button
            variant="outline"
            onClick={() => {
              setSelectedBrandId("");
              router.push("/content-calendar");
            }}
          >
            ← Back to All Brands
          </Button>
        )}
      </div>

      {/* ── Brand-specific calendar grid ── */}
      {selectedBrandId && selectedBrand ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedBrand.logo ? (
                  <img src={selectedBrand.logo} alt={selectedBrand.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">{selectedBrand.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <CardTitle>{selectedBrand.name} — Content Calendars</CardTitle>
                  <CardDescription>
                    {selectedCalendars.length} calendar{selectedCalendars.length !== 1 ? "s" : ""} generated
                  </CardDescription>
                </div>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Generate New Calendar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingCalendars ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-10 w-full mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : selectedCalendars.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No calendars generated yet</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Your First Calendar
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedCalendars.map((calendar) => (
                  <Card
                    key={calendar.id}
                    className="hover:shadow-lg transition-all cursor-pointer hover:border-primary relative"
                    onClick={() => {
                      setNavigatingToCalendar(calendar.id);
                      router.push(`/content-calendar/${calendar.id}`);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{calendar.topic}</CardTitle>
                          <CardDescription className="mt-1">
                            {calendar.duration} days • {calendar.itemCount} posts
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(calendar.status)}>{calendar.status}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteCalendar(calendar.id, e)}
                            disabled={deletingCalendar === calendar.id}
                          >
                            {deletingCalendar === calendar.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Platforms:</p>
                        <div className="flex flex-wrap gap-1">
                          {(calendar.platforms as string[]).slice(0, 4).map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs">{platform}</Badge>
                          ))}
                          {(calendar.platforms as string[]).length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{(calendar.platforms as string[]).length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Posts/Week</p>
                          <p className="text-lg font-semibold">{calendar.postsPerWeek}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">With Images</p>
                          <p className="text-lg font-semibold">
                            {calendar.imageCount} / {calendar.itemCount}
                          </p>
                        </div>
                      </div>

                      {calendar.startDate && calendar.endDate && (
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          📅 {formatDate(calendar.startDate)} — {formatDate(calendar.endDate)}
                        </div>
                      )}

                      <div className="pt-2">
                        {navigatingToCalendar === calendar.id ? (
                          <div className="flex items-center justify-center gap-2 p-3 bg-primary/5 rounded-lg text-primary font-medium text-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                            Loading...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 p-3 bg-primary/5 rounded-lg text-primary font-medium text-sm">
                            <Eye className="w-4 h-4" />
                            Click to View &amp; Edit Content
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ── All-brands overview table ── */
        <Card>
          <CardHeader>
            <CardTitle>Brands &amp; Content Status</CardTitle>
            <CardDescription>
              View content calendar status for each brand and generate new calendars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">S. No.</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-center">Calendars</TableHead>
                  <TableHead className="text-center">Total Posts</TableHead>
                  <TableHead className="text-center">With Images</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingBrands ? (
                  Array.from({ length: 3 }).map((_, i) => <BrandRowSkeleton key={i} />)
                ) : brands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No brands found. Create a brand first to generate content calendars.
                    </TableCell>
                  </TableRow>
                ) : (
                  brands.map((brand, index) => {
                    const stats = overviewData?.overview?.[brand.id];
                    const hasContent = (stats?.total ?? 0) > 0;

                    return (
                      <TableRow key={brand.id}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            {brand.logo ? (
                              <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg font-bold text-primary">{brand.name.charAt(0)}</span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{brand.name}</p>
                              {brand.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-xs">{brand.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          {!overviewData ? (
                            <Skeleton className="h-8 w-10 mx-auto" />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-2xl font-bold">{stats?.total ?? 0}</span>
                              {(stats?.total ?? 0) > 0 && (
                                <div className="flex gap-1 text-xs">
                                  {(stats?.draft ?? 0) > 0 && (
                                    <Badge variant="outline" className="text-xs">{stats?.draft} Draft</Badge>
                                  )}
                                  {(stats?.scheduled ?? 0) > 0 && (
                                    <Badge variant="outline" className="text-xs bg-blue-50">{stats?.scheduled} Scheduled</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {!overviewData ? (
                            <Skeleton className="h-8 w-10 mx-auto" />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-2xl font-bold">{stats?.totalItems ?? 0}</span>
                              <span className="text-xs text-muted-foreground">posts</span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {!overviewData ? (
                            <Skeleton className="h-8 w-16 mx-auto" />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1">
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-lg font-semibold">{stats?.itemsWithImages ?? 0}</span>
                                <span className="text-muted-foreground">/ {stats?.totalItems ?? 0}</span>
                              </div>
                              {(stats?.totalItems ?? 0) > 0 && (
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div
                                    className="bg-primary h-1.5 rounded-full transition-all"
                                    style={{ width: `${((stats?.itemsWithImages ?? 0) / (stats?.totalItems ?? 1)) * 100}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {!overviewData ? (
                            <Skeleton className="h-6 w-24 mx-auto" />
                          ) : hasContent ? (
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Content Ready
                              </Badge>
                              <span className="text-xs text-muted-foreground">{stats?.completed ?? 0} completed</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50">
                              <Clock className="w-3 h-3 mr-1" />
                              No Content
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {hasContent && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBrandId(brand.id);
                                  router.push(`/content-calendar?brand=${brand.id}`);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View ({stats?.total ?? 0})
                              </Button>
                            )}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedBrandId(brand.id);
                                setShowCreateModal(true);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Generate
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Calendar Modal */}
      {showCreateModal && selectedBrandId && (
        <CreateCalendarModal
          brandId={selectedBrandId}
          connectedPlatforms={getConnectedPlatforms(selectedBrandId)}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedBrandId("");
          }}
          onSuccess={() => {
            mutateOverview();
            mutateSelectedBrand();
            setShowCreateModal(false);
            setSelectedBrandId("");
            toast.success("Calendar generated successfully!");
          }}
        />
      )}
    </div>
  );
}
