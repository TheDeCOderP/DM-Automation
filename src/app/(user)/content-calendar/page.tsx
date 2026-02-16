"use client";

import { useState, useEffect } from "react";
import useSwr from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Calendar, Eye, CheckCircle2, Clock, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface ContentCalendar {
  id: string;
  topic: string;
  duration: number;
  platforms: string[];
  postsPerWeek: number;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  brand: {
    id: string;
    name: string;
    logo?: string;
  };
  items: {
    id: string;
    imageUrl?: string;
  }[];
}

interface Brand {
  id: string;
  name: string;
  logo?: string;
  description?: string;
}

export default function ContentCalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandIdFromUrl = searchParams.get("brand");
  
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch brands
  const { data: brandsData } = useSwr("/api/brands", fetcher);
  const brands: Brand[] = brandsData?.data || [];

  // Set selected brand from URL parameter
  useEffect(() => {
    if (brandIdFromUrl && brands.length > 0) {
      const brandExists = brands.find(b => b.id === brandIdFromUrl);
      if (brandExists) {
        setSelectedBrandId(brandIdFromUrl);
      }
    }
  }, [brandIdFromUrl, brands]);

  // Fetch all calendars for all brands
  const { data: allCalendarsData, mutate } = useSwr(
    brands.length > 0 ? `/api/content-calendar/all-brands` : null,
    async () => {
      // Fetch calendars for each brand
      const calendarsPromises = brands.map(async (brand) => {
        try {
          const response = await fetch(`/api/content-calendar?brandId=${brand.id}`);
          const data = await response.json();
          return {
            brandId: brand.id,
            calendars: data.calendars || [],
          };
        } catch (error) {
          return {
            brandId: brand.id,
            calendars: [],
          };
        }
      });
      
      const results = await Promise.all(calendarsPromises);
      return results;
    }
  );

  // Get calendar stats for each brand
  const getBrandStats = (brandId: string) => {
    if (!allCalendarsData) return { total: 0, draft: 0, scheduled: 0, completed: 0, totalPosts: 0, withImages: 0 };
    
    const brandData = allCalendarsData.find((d: any) => d.brandId === brandId);
    if (!brandData) return { total: 0, draft: 0, scheduled: 0, completed: 0, totalPosts: 0, withImages: 0 };
    
    const calendars: ContentCalendar[] = brandData.calendars;
    const total = calendars.length;
    const draft = calendars.filter((c) => c.status === "DRAFT").length;
    const scheduled = calendars.filter((c) => c.status === "SCHEDULED").length;
    const completed = calendars.filter((c) => c.status === "COMPLETED").length;
    const totalPosts = calendars.reduce((sum, c) => sum + c.items.length, 0);
    const withImages = calendars.reduce((sum, c) => {
      const itemsWithImages = c.items.filter(item => item.imageUrl).length;
      return sum + itemsWithImages;
    }, 0);
    
    return { total, draft, scheduled, completed, totalPosts, withImages };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-500";
      case "SCHEDULED":
        return "bg-blue-500";
      case "COMPLETED":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  // Fetch selected brand's calendars
  const { data: selectedBrandCalendars, mutate: mutateSelectedBrand } = useSwr(
    selectedBrandId ? `/api/content-calendar?brandId=${selectedBrandId}` : null,
    fetcher
  );

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const calendars: ContentCalendar[] = selectedBrandCalendars?.calendars || [];

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
          <Button variant="outline" onClick={() => {
            setSelectedBrandId("");
            router.push("/content-calendar");
          }}>
            ← Back to All Brands
          </Button>
        )}
      </div>

      {/* Show calendars list if brand is selected */}
      {selectedBrandId && selectedBrand ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedBrand.logo ? (
                  <img
                    src={selectedBrand.logo}
                    alt={selectedBrand.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {selectedBrand.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <CardTitle>{selectedBrand.name} - Content Calendars</CardTitle>
                  <CardDescription>
                    {calendars.length} calendar{calendars.length !== 1 ? 's' : ''} generated
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
            {calendars.length === 0 ? (
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
                {calendars.map((calendar) => (
                  <Card 
                    key={calendar.id} 
                    className="hover:shadow-lg transition-all cursor-pointer hover:border-primary"
                    onClick={() => router.push(`/content-calendar/${calendar.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{calendar.topic}</CardTitle>
                          <CardDescription className="mt-1">
                            {calendar.duration} days • {calendar.items.length} posts
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(calendar.status)}>
                          {calendar.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Platforms */}
                      <div>
                        <p className="text-sm font-medium mb-2">Platforms:</p>
                        <div className="flex flex-wrap gap-1">
                          {calendar.platforms.slice(0, 4).map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                          {calendar.platforms.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{calendar.platforms.length - 4}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Posts/Week</p>
                          <p className="text-lg font-semibold">{calendar.postsPerWeek}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">With Images</p>
                          <p className="text-lg font-semibold">
                            {calendar.items.filter(i => i.imageUrl).length} / {calendar.items.length}
                          </p>
                        </div>
                      </div>

                      {/* Dates */}
                      {calendar.startDate && calendar.endDate && (
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          📅 {formatDate(calendar.startDate)} - {formatDate(calendar.endDate)}
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="pt-2">
                        <div className="flex items-center justify-center gap-2 p-3 bg-primary/5 rounded-lg text-primary font-medium text-sm">
                          <Eye className="w-4 h-4" />
                          Click to View & Edit Content
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Brands Table with Calendar Status */
      <Card>
        <CardHeader>
          <CardTitle>Brands & Content Status</CardTitle>
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
              {brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No brands found. Create a brand first to generate content calendars.
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand, index) => {
                  const stats = getBrandStats(brand.id);
                  const hasContent = stats.total > 0;
                  
                  return (
                    <TableRow key={brand.id}>
                      {/* S. No. */}
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      
                      {/* Brand Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {brand.logo ? (
                            <img
                              src={brand.logo}
                              alt={brand.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">
                                {brand.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{brand.name}</p>
                            {brand.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs">
                                {brand.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Calendars Count */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-2xl font-bold">{stats.total}</span>
                          {stats.total > 0 && (
                            <div className="flex gap-1 text-xs">
                              {stats.draft > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {stats.draft} Draft
                                </Badge>
                              )}
                              {stats.scheduled > 0 && (
                                <Badge variant="outline" className="text-xs bg-blue-50">
                                  {stats.scheduled} Scheduled
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Total Posts */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-2xl font-bold">{stats.totalPosts}</span>
                          <span className="text-xs text-muted-foreground">posts</span>
                        </div>
                      </TableCell>

                      {/* Images */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-lg font-semibold">{stats.withImages}</span>
                            <span className="text-muted-foreground">/ {stats.totalPosts}</span>
                          </div>
                          {stats.totalPosts > 0 && (
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className="bg-primary h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${(stats.withImages / stats.totalPosts) * 100}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {hasContent ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Content Ready
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {stats.completed} completed
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50">
                            <Clock className="w-3 h-3 mr-1" />
                            No Content
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
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
                              View ({stats.total})
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
          onClose={() => {
            setShowCreateModal(false);
            setSelectedBrandId("");
          }}
          onSuccess={() => {
            mutate();
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
