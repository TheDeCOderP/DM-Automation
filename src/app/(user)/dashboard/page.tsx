"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  FileText, 
  Share2, 
  BarChart3, 
  Users, 
  Settings 
} from "lucide-react";
import Link from "next/link";

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "Create Post",
      description: "Create and schedule new posts",
      icon: FileText,
      href: "/posts",
      color: "text-primary"
    },
    {
      title: "Social Accounts",
      description: "Manage your connected accounts",
      icon: Share2,
      href: "/accounts",
      color: "text-green-600"
    },
    {
      title: "Analytics",
      description: "View your post performance",
      icon: BarChart3,
      href: "/analytics",
      color: "text-purple-600"
    },
    {
      title: "Media Library",
      description: "Manage your media files",
      icon: Settings,
      href: "/media",
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session?.user?.name || "User"}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your social media accounts
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {action.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${action.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>
              Get started with your social media management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/accounts">
              <Button variant="outline" className="w-full justify-start">
                <Share2 className="mr-2 h-4 w-4" />
                Connect Social Accounts
              </Button>
            </Link>
            <Link href="/posts">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Create Your First Post
              </Button>
            </Link>
            <Link href="/blogs">
              <Button variant="outline" className="w-full justify-start">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Manage Blogs
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest actions and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>No recent activity to display</p>
              <Link href="/posts">
                <Button variant="link" className="px-0 mt-2">
                  View all posts →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
