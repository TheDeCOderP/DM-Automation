"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Filter } from "lucide-react"
import { MetricsOverview } from "./_components/metrics-overview"
import { PlatformHealth } from "./_components/platform-health"
import { PostsAnalytics } from "./_components/posts-analytics"
import { RealtimeNotifications } from "./_components/realtime-notifications"
import { UserActivity } from "./_components/user-activity"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <main className="flex-1 overflow-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage your social media platform</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <RealtimeNotifications />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <MetricsOverview />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UserActivity />
              <PlatformHealth />
            </div>
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            <PostsAnalytics />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserActivity detailed />
          </TabsContent>

          <TabsContent value="platforms" className="space-y-6">
            <PlatformHealth detailed />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <PostsAnalytics />
              <MetricsOverview />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
