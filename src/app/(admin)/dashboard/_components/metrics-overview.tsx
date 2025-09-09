"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, FileText, Activity, TrendingUp, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react"

type AnalyticsResponse = {
  totalPosts: number
  successfulPosts: number
  failedPosts: number
  scheduledPosts: number
  draftedPosts: number
  successRate: number
}

type AccountsResponse = {
  data: Array<{
    platform: string
    isConnected: boolean
    pageTokens?: Array<{ id: string }>
  }>
}

export function MetricsOverview() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [connections, setConnections] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const [aRes, accRes] = await Promise.all([
          fetch("/api/analytics?period=1w"),
          fetch("/api/accounts"),
        ])
        if (!aRes.ok) throw new Error("Failed to load analytics")
        if (!accRes.ok) throw new Error("Failed to load accounts")

        const aJson = (await aRes.json()) as AnalyticsResponse
        const accJson = (await accRes.json()) as AccountsResponse

        if (!mounted) return
        setAnalytics(aJson)
        // Count total connections = social accounts + page tokens
        const socialCount = accJson.data.length
        const pageTokenCount = accJson.data.reduce((sum, sa) => sum + (sa.pageTokens?.length || 0), 0)
        setConnections(socialCount + pageTokenCount)
        setError(null)
      } catch (error) {
        if (!mounted) return
        setError(error as string || "Failed to load")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const metrics = [
    {
      title: "Total Posts",
      value: analytics ? analytics.totalPosts.toLocaleString() : "-",
      change: analytics ? `${analytics.successRate}% success` : "",
      trend: "up",
      icon: FileText,
      description: "Posts in selected period",
    },
    {
      title: "Posts Published",
      value: analytics ? analytics.successfulPosts.toLocaleString() : "-",
      change: analytics ? `${Math.max(0, analytics.successRate - 100)}% vs total` : "",
      trend: "up",
      icon: Activity,
      description: "Successfully published",
    },
    {
      title: "Platform Connections",
      value: connections != null ? connections.toLocaleString() : "-",
      change: "",
      trend: "up",
      icon: Users,
      description: "Social accounts and pages",
    },
    {
      title: "Success Rate",
      value: analytics ? `${analytics.successRate}%` : "-",
      change: analytics ? `${analytics.failedPosts} failed` : "",
      trend: "up",
      icon: TrendingUp,
      description: "Publish success ratio",
    },
  ]

  const statusMetrics = [
    { label: "Published", value: analytics?.successfulPosts || 0, color: "bg-chart-3", icon: CheckCircle },
    { label: "Scheduled", value: analytics?.scheduledPosts || 0, color: "bg-chart-2", icon: Clock },
    { label: "Failed", value: analytics?.failedPosts || 0, color: "bg-chart-4", icon: XCircle },
    { label: "Draft", value: analytics?.draftedPosts || 0, color: "bg-chart-1", icon: AlertCircle },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">{metric.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">
                  {loading ? "…" : metric.value}
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  {metric.change && (
                    <Badge variant={metric.trend === "up" ? "default" : "destructive"} className="text-xs">
                      {metric.change}
                    </Badge>
                  )}
                  <span>{metric.description}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Status Distribution</CardTitle>
          <CardDescription>Current status of all posts in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-sm text-red-500 mb-2">{error}</div>
          )}
          <div className="space-y-4">
            {statusMetrics.map((status) => {
              const Icon = status.icon
              const total = statusMetrics.reduce((sum, s) => sum + s.value, 0)
              const percentage = total > 0 ? (status.value / total) * 100 : 0

              return (
                <div key={status.label} className="flex items-center space-x-4">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-card-foreground">{status.label}</span>
                      <span className="text-sm text-muted-foreground">{loading ? "…" : status.value}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}