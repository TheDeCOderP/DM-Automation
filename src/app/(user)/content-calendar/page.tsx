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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage bulk content for multiple platforms
          </p>
        </div>
      </div>

      {/* Brands Table with Calendar Status */}
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No brands found. Create a brand first to generate content calendars.
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => {
                  const stats = getBrandStats(brand.id);
                  const hasContent = stats.total > 0;
                  
                  return (
                    <TableRow key={brand.id}>
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
            setShowCreateModal(false);
            setSelectedBrandId("");
            toast.success("Calendar generated successfully!");
          }}
        />
      )}
    </div>
  );
}
