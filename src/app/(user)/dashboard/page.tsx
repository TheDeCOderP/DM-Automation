"use client";

import useSWR from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import {
  FileText, Share2, BarChart3, Calendar, Building2,
  Globe, Bell, CheckCircle2, Clock, XCircle, TrendingUp,
  Plus, ArrowRight, Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlatformIcon } from "@/utils/ui/icons";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  PUBLISHED: { label: "Published", icon: CheckCircle2, className: "text-green-600 bg-green-50 dark:bg-green-950/30" },
  SCHEDULED: { label: "Scheduled", icon: Clock, className: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
  DRAFTED:   { label: "Draft",     icon: FileText,    className: "text-gray-600 bg-gray-50 dark:bg-gray-950/30" },
  FAILED:    { label: "Failed",    icon: XCircle,     className: "text-red-600 bg-red-50 dark:bg-red-950/30" },
};

function StatCard({
  title, value, icon: Icon, description, href, color,
}: {
  title: string; value: number | undefined; icon: React.ElementType;
  description?: string; href?: string; color: string;
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold">{value}</p>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function UserDashboard() {
  const { data: session } = useSession();
  const { data, isLoading } = useSWR("/api/dashboard/stats", fetcher);

  const stats = data?.stats;
  const recentPosts = data?.recentPosts ?? [];
  const recentNotifications = data?.recentNotifications ?? [];

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {session?.user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening across your brands</p>
        </div>
        <Link href="/posts/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Pending invites alert */}
      {stats?.pendingInvites > 0 && (
        <Link href="/accounts">
          <Card className="border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Bell className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm">
                You have <span className="font-semibold">{stats.pendingInvites}</span> pending brand invitation{stats.pendingInvites > 1 ? "s" : ""}.
              </p>
              <ArrowRight className="h-4 w-4 text-primary ml-auto shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="xl:col-span-1">
          <StatCard title="Total Posts" value={stats?.totalPosts} icon={FileText}
            href="/posts" color="bg-primary/10 text-primary" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="Published" value={stats?.publishedPosts} icon={CheckCircle2}
            href="/posts?status=PUBLISHED" color="bg-green-100 text-green-600 dark:bg-green-950/40" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="Scheduled" value={stats?.scheduledPosts} icon={Clock}
            href="/posts?status=SCHEDULED" color="bg-blue-100 text-blue-600 dark:bg-blue-950/40" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="Failed" value={stats?.failedPosts} icon={XCircle}
            href="/posts?status=FAILED" color="bg-red-100 text-red-600 dark:bg-red-950/40" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="Brands" value={stats?.totalBrands} icon={Building2}
            href="/accounts" color="bg-purple-100 text-purple-600 dark:bg-purple-950/40" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="Connected Accounts" value={stats?.connectedAccounts} icon={Globe}
            href="/accounts" color="bg-orange-100 text-orange-600 dark:bg-orange-950/40" />
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Posts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Posts</CardTitle>
              <CardDescription>Your latest content activity</CardDescription>
            </div>
            <Link href="/posts">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : recentPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No posts yet</p>
                <Link href="/posts/create">
                  <Button variant="link" size="sm" className="mt-1">Create your first post</Button>
                </Link>
              </div>
            ) : (
              recentPosts.map((post: any) => {
                const cfg = statusConfig[post.status] ?? statusConfig.DRAFTED;
                const StatusIcon = cfg.icon;
                return (
                  <Link key={post.id} href={`/posts/${post.id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="shrink-0">
                        {getPlatformIcon(post.platform, "h-7 w-7")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {post.title || post.content.substring(0, 50)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {post.brand.name} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className={`gap-1 text-xs shrink-0 ${cfg.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Unread alerts</CardDescription>
              </div>
              <Link href="/notifications">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))
              ) : recentNotifications.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground justify-center">
                  <Bell className="h-4 w-4 opacity-40" />
                  <p className="text-sm">All caught up</p>
                </div>
              ) : (
                recentNotifications.map((n: any) => (
                  <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <Bell className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: "New Post", icon: FileText, href: "/posts/create" },
                { label: "Analytics", icon: TrendingUp, href: "/analytics" },
                { label: "Calendar", icon: Calendar, href: "/content-calendar" },
                { label: "Accounts", icon: Share2, href: "/accounts" },
              ].map(({ label, icon: Icon, href }) => (
                <Link key={href} href={href}>
                  <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
