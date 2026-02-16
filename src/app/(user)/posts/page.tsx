"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { 
  FileText, 
  Search, 
  Filter, 
  ExternalLink,
  Calendar,
  User,
  Image as ImageIcon,
  Video,
  Eye,
  Grid3x3,
  List,
  LayoutGrid,
  Edit
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
  user: {
    name: string | null;
    email: string;
  };
  brand: {
    id: string;
    name: string;
  };
  socialAccountPage: {
    name: string;
    pageName: string;
    platform: Platform;
    socialAccount?: {
      platformUsername: string;
    };
  } | null;
  media: {
    id: string;
    url: string;
    type: string;
  }[];
}

type ViewMode = "grid" | "list";

export default function PostsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandIdFromUrl = searchParams.get("brand");
  
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [brandFilter, setBrandFilter] = useState<string>(brandIdFromUrl || "ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useSWR<{ posts: Post[] }>(
    "/api/posts?limit=1000",
    fetcher
  );

  // Update brand filter when URL changes
  useEffect(() => {
    if (brandIdFromUrl) {
      setBrandFilter(brandIdFromUrl);
    }
  }, [brandIdFromUrl]);

  // Get unique brands from posts
  const brands = data?.posts?.reduce((acc: any[], post) => {
    if (!acc.find(b => b.id === post.brand.id)) {
      acc.push(post.brand);
    }
    return acc;
  }, []) || [];

  const filteredPosts = data?.posts?.filter((post) => {
    const matchesPlatform = platformFilter === "ALL" || post.platform === platformFilter;
    const matchesStatus = statusFilter === "ALL" || post.status === statusFilter;
    const matchesBrand = brandFilter === "ALL" || post.brand.id === brandFilter;
    const matchesSearch =
      searchQuery === "" ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.brand.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesPlatform && matchesStatus && matchesBrand && matchesSearch;
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground text-lg">
            View all your posts across platforms
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Brands</SelectItem>
                {brands.map((brand: any) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Platforms</SelectItem>
                <SelectItem value="FACEBOOK">Facebook</SelectItem>
                <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                <SelectItem value="TWITTER">Twitter</SelectItem>
                <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                <SelectItem value="YOUTUBE">YouTube</SelectItem>
                <SelectItem value="TIKTOK">TikTok</SelectItem>
                <SelectItem value="PINTEREST">Pinterest</SelectItem>
                <SelectItem value="REDDIT">Reddit</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="DRAFTED">Drafted</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setPlatformFilter("ALL");
                setStatusFilter("ALL");
                setBrandFilter("ALL");
                setSearchQuery("");
                router.push("/posts");
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-48 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredPosts?.length || 0} posts
            </p>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts?.map((post, index) => {
                const PlatformIcon = getPlatformIcon(post.platform);
                const hasMedia = post.media && post.media.length > 0;
                const firstMedia = hasMedia ? post.media[0] : null;

                return (
                  <Card
                    key={post.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative"
                    onClick={() => router.push(`/posts/${post.id}`)}
                  >
                    {/* Serial Number Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <Badge variant="secondary" className="font-mono">
                        #{index + 1}
                      </Badge>
                    </div>

                    {/* Media Preview */}
                    {hasMedia && firstMedia ? (
                      <div className="relative h-48 bg-muted">
                        {firstMedia.type === "IMAGE" ? (
                          <img
                            src={firstMedia.url}
                            alt="Post media"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-black">
                            <Video className="h-12 w-12 text-white" />
                          </div>
                        )}
                        {post.media.length > 1 && (
                          <Badge className="absolute top-2 right-2">
                            +{post.media.length - 1}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="h-48 bg-muted flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    <CardContent className="p-4 space-y-3">
                      {/* Platform & Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {PlatformIcon}
                          <span className="text-sm font-medium">
                            {post.platform}
                          </span>
                        </div>
                        <Badge className={getStatusColor(post.status)}>
                          {post.status}
                        </Badge>
                      </div>

                      {/* Content */}
                      <div>
                        {post.title && (
                          <h3 className="font-semibold mb-1 line-clamp-1">
                            {post.title}
                          </h3>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.content}
                        </p>
                      </div>

                      {/* Social Account Info */}
                      {post.socialAccountPage && post.socialAccountPage.socialAccount && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>
                            @{post.socialAccountPage.socialAccount.platformUsername}
                          </span>
                          <span className="text-xs">•</span>
                          <span>{post.socialAccountPage.pageName}</span>
                        </div>
                      )}

                      {/* Brand */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{post.brand.name}</span>
                      </div>

                      {/* Date & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString()
                            : post.scheduledAt
                            ? new Date(post.scheduledAt).toLocaleDateString()
                            : new Date(post.createdAt).toLocaleDateString()}
                        </div>

                        <div className="flex items-center gap-2">
                          {(post.status === "DRAFTED" || post.status === "FAILED" || post.status === "SCHEDULED") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/posts/${post.id}`);
                              }}
                              title="Edit post"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {post.url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(post.url!, "_blank");
                              }}
                              title="View on platform"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            title="View details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">S.No</TableHead>
                    <TableHead className="w-[80px]">Media</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead className="w-[120px]">Platform</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[150px]">Brand</TableHead>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts?.map((post, index) => {
                    const PlatformIcon = getPlatformIcon(post.platform);
                    const hasMedia = post.media && post.media.length > 0;
                    const firstMedia = hasMedia ? post.media[0] : null;

                    return (
                      <TableRow
                        key={post.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/posts/${post.id}`)}
                      >
                        {/* Serial Number */}
                        <TableCell className="font-mono font-medium">
                          {index + 1}
                        </TableCell>

                        {/* Media Thumbnail */}
                        <TableCell>
                          <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                            {hasMedia && firstMedia ? (
                              firstMedia.type === "IMAGE" ? (
                                <img
                                  src={firstMedia.url}
                                  alt="Post media"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-black">
                                  <Video className="h-4 w-4 text-white" />
                                </div>
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            {post.media.length > 1 && (
                              <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[10px] px-1 rounded-tl">
                                +{post.media.length - 1}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Content */}
                        <TableCell>
                          <div className="max-w-md">
                            {post.title && (
                              <p className="font-semibold text-sm mb-1 line-clamp-1">
                                {post.title}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {post.content}
                            </p>
                            {post.socialAccountPage?.socialAccount && (
                              <p className="text-xs text-muted-foreground mt-1">
                                @{post.socialAccountPage.socialAccount.platformUsername}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Platform */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {PlatformIcon}
                            <span className="text-sm">{post.platform}</span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge className={getStatusColor(post.status)}>
                            {post.status}
                          </Badge>
                        </TableCell>

                        {/* Brand */}
                        <TableCell>
                          <span className="text-sm font-medium">
                            {post.brand.name}
                          </span>
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {post.publishedAt
                              ? new Date(post.publishedAt).toLocaleDateString()
                              : post.scheduledAt
                              ? new Date(post.scheduledAt).toLocaleDateString()
                              : new Date(post.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(post.status === "DRAFTED" || post.status === "FAILED" || post.status === "SCHEDULED") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/posts/${post.id}`);
                                }}
                                title="Edit post"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {post.url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(post.url!, "_blank");
                                }}
                                title="View on platform"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
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

          {filteredPosts?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or create a new post
                </p>
                <Button onClick={() => router.push("/posts/create")}>
                  Create Post
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
