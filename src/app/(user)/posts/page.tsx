"use client";

import React, { useCallback } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPlatformIcon } from "@/utils/ui/icons";
import { formatDate } from "@/utils/format";
import {
  FileText,
  Search,
  Filter,
  ExternalLink,
  Calendar,
  Image as ImageIcon,
  Video,
  Eye,
  List,
  LayoutGrid,
  Edit,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Platform, Status } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Post {
  id: string;
  title: string | null;
  content: string;
  platform: Platform;
  status: Status;
  url: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
  brand: { id: string; name: string };
  socialAccountPage: {
    pageName: string;
    platform: Platform;
  } | null;
  socialAccount: {
    platform: Platform;
    platformUsername: string;
    platformUserImage: string | null;
  } | null;
  media: { id: string; url: string; type: string }[];
}

interface ApiResponse {
  posts: Post[];
  brands: { id: string; name: string; logo: string | null }[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalPosts: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const PLATFORMS = [
  "FACEBOOK", "INSTAGRAM", "TWITTER", "LINKEDIN",
  "YOUTUBE", "TIKTOK", "PINTEREST", "REDDIT",
];

const STATUS_OPTIONS = ["PUBLISHED", "SCHEDULED", "DRAFTED", "FAILED"];

const statusColor: Record<string, string> = {
  PUBLISHED: "bg-green-500/10 text-green-700 dark:text-green-400",
  SCHEDULED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  DRAFTED: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  FAILED: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function PostsListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const brand = searchParams.get("brand") || "ALL";
  const platform = searchParams.get("platform") || "ALL";
  const status = searchParams.get("status") || "ALL";
  const search = searchParams.get("search") || "";
  const view = (searchParams.get("view") || "grid") as "grid" | "list";
  const page = parseInt(searchParams.get("page") || "1");

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "ALL" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Reset to page 1 on filter change (except page itself)
      if (key !== "page") params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const buildApiUrl = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "12");
    if (brand !== "ALL") params.set("brandId", brand);
    if (platform !== "ALL") params.set("platform", platform);
    if (status !== "ALL") params.set("status", status);
    if (search) params.set("search", search);
    return `/api/posts?${params.toString()}`;
  };

  const { data, isLoading } = useSWR<ApiResponse>(buildApiUrl(), fetcher);

  // Fetch brands independently so the dropdown is always populated
  const { data: brandsData } = useSWR<{ data: { id: string; name: string; logo: string | null }[] }>("/api/brands", fetcher);

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters = brand !== "ALL" || platform !== "ALL" || status !== "ALL" || search !== "";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
            <p className="text-muted-foreground text-sm">
              {data?.pagination.totalPosts ?? "..."} posts across all brands
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/posts/create")}>Create Post</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={search}
                onChange={(e) => updateParam("search", e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Brand */}
            <Select value={brand} onValueChange={(v) => updateParam("brand", v)}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Brands</SelectItem>
                {brandsData?.data?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Platform */}
            <Select value={platform} onValueChange={(v) => updateParam("platform", v)}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={status} onValueChange={(v) => updateParam("status", v)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <Button
                variant={view === "grid" ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateParam("view", "grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => updateParam("view", "list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="h-9" onClick={clearFilters}>
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-40 w-full mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.posts?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No posts found</h3>
            <p className="text-muted-foreground text-sm mb-4">Try adjusting your filters</p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            )}
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.posts?.map((post, index) => {
            const PlatformIcon = getPlatformIcon(post.platform);
            const firstMedia = post.media?.[0];
            const accountName = post.socialAccountPage?.pageName
              || post.socialAccount?.platformUsername
              || null;

            return (
              <Card
                key={post.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/posts/${post.id}`)}
              >
                {/* Media */}
                <div className="relative h-44 bg-muted">
                  {firstMedia ? (
                    firstMedia.type === "IMAGE" ? (
                      <img src={firstMedia.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black">
                        <Video className="h-10 w-10 text-white" />
                      </div>
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="font-mono text-xs">#{(page - 1) * 12 + index + 1}</Badge>
                  </div>
                  {post.media.length > 1 && (
                    <Badge className="absolute top-2 right-2 text-xs">+{post.media.length - 1}</Badge>
                  )}
                </div>

                <CardContent className="p-3 space-y-2.5">
                  {/* Platform + Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {PlatformIcon}
                      <span className="text-xs font-medium capitalize">
                        {post.platform.toLowerCase()}
                      </span>
                      {accountName && (
                        <span className="text-xs text-muted-foreground">· @{accountName}</span>
                      )}
                    </div>
                    <Badge className={`text-xs ${statusColor[post.status]}`}>{post.status}</Badge>
                  </div>

                  {/* Content */}
                  <div>
                    {post.title && <p className="font-medium text-sm line-clamp-1">{post.title}</p>}
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{post.content}</p>
                  </div>

                  {/* Brand + Date + Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{post.brand.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.publishedAt || post.scheduledAt || post.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {post.url && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                          <a href={post.url} target="_blank" rel="noopener noreferrer" title="View on platform">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {(post.status === "DRAFTED" || post.status === "FAILED" || post.status === "SCHEDULED") && (
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => router.push(`/posts/${post.id}`)}
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => router.push(`/posts/${post.id}`)}
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-16">Media</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="w-32">Platform / Account</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-32">Brand</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.posts?.map((post, index) => {
                const PlatformIcon = getPlatformIcon(post.platform);
                const firstMedia = post.media?.[0];
                const accountName = post.socialAccountPage?.pageName
                  || post.socialAccount?.platformUsername
                  || null;

                return (
                  <TableRow
                    key={post.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/posts/${post.id}`)}
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {(page - 1) * 12 + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="w-11 h-11 rounded overflow-hidden bg-muted flex items-center justify-center">
                        {firstMedia ? (
                          firstMedia.type === "IMAGE" ? (
                            <img src={firstMedia.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Video className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {post.title && <p className="font-medium text-sm line-clamp-1">{post.title}</p>}
                        <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {PlatformIcon}
                        <div>
                          <p className="text-xs font-medium capitalize">{post.platform.toLowerCase()}</p>
                          {accountName && (
                            <p className="text-xs text-muted-foreground">@{accountName}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusColor[post.status]}`}>{post.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{post.brand.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(post.publishedAt || post.scheduledAt || post.createdAt)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {post.url && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                            <a href={post.url} target="_blank" rel="noopener noreferrer" title="View on platform">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        {(post.status === "DRAFTED" || post.status === "FAILED" || post.status === "SCHEDULED") && (
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => router.push(`/posts/${post.id}`)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => router.push(`/posts/${post.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.pagination.currentPage} of {data.pagination.totalPages} · {data.pagination.totalPosts} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              disabled={!data.pagination.hasPreviousPage}
              onClick={() => updateParam("page", String(page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={!data.pagination.hasNextPage}
              onClick={() => updateParam("page", String(page + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
