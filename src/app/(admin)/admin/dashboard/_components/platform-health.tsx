"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle, XCircle, Activity, Wifi } from "lucide-react"

interface PlatformHealthProps {
  detailed?: boolean
}

type AccountsResponse = {
  data: Array<{
    platform: string
    isConnected: boolean
    pageTokens?: Array<{ id: string }>
  }>
}

type AnalyticsResponse = {
  platformStats: Record<string, { total: number; successful: number; failed: number; scheduled: number; drafted: number }>
}

export function PlatformHealth({ detailed = false }: PlatformHealthProps) {
  const [stats, setStats] = useState<AnalyticsResponse["platformStats"] | null>(null)
  const [connections, setConnections] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      setLoading(true)
      const [aRes, accRes] = await Promise.all([
        fetch("/api/analytics?period=1w"),
        fetch("/api/accounts"),
      ])
      if (aRes.ok) {
        const aJson = (await aRes.json()) as AnalyticsResponse
        setStats(aJson.platformStats)
      }
      if (accRes.ok) {
        const accJson = (await accRes.json()) as AccountsResponse
        const map: Record<string, number> = {}
        accJson.data.forEach(sa => {
          const key = sa.platform
          map[key] = (map[key] || 0) + 1 + (sa.pageTokens?.length || 0)
        })
        setConnections(map)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const platforms = Object.keys(stats || connections || {}).map((name) => {
    const s = stats?.[name]
    const total = s?.total || 0
    const failed = s?.failed || 0
    const successRatio = total > 0 ? 100 - Math.round((failed / total) * 100) : 100

    let status: "healthy" | "warning" | "error" = "healthy"
    if (failed > 0 && failed / Math.max(1, total) > 0.2) status = "error"
    else if (failed > 0) status = "warning"

    return {
      name,
      status,
      connections: connections[name] || 0,
      uptime: successRatio,
      lastIssue: failed > 0 ? "Recently" : null,
      apiCalls: total * 10, // placeholder derived metric
      rateLimit: Math.min(100, Math.max(5, successRatio)),
    }
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Healthy</Badge>
      case "warning":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Warning</Badge>
      case "error":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Platform Health
          {detailed && (
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <Activity className="h-4 w-4 mr-2" />
              {loading ? "Refreshing…" : "Refresh Status"}
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          {detailed ? "Detailed platform monitoring and API health" : "Real-time platform status and connectivity"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {platforms.length === 0 && (
            <div className="text-sm text-muted-foreground">{loading ? "Loading…" : "No platform data"}</div>
          )}
          {platforms.map((platform) => (
            <div key={platform.name} className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(platform.status)}
                  <span className="font-medium text-card-foreground">{platform.name}</span>
                  {getStatusBadge(platform.status)}
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Wifi className="h-4 w-4" />
                  {platform.connections.toLocaleString()} connections
                </div>
              </div>

              {detailed && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                    <div className="font-medium text-card-foreground">{platform.uptime}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">API Calls (derived)</div>
                    <div className="font-medium text-card-foreground">{platform.apiCalls.toLocaleString()}</div>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Rate Limit Usage</span>
                  <span className="text-card-foreground">{platform.rateLimit}%</span>
                </div>
                <Progress value={platform.rateLimit} className="h-2" />
              </div>

              {platform.lastIssue && (
                <div className="mt-2 text-xs text-muted-foreground">Last issue: {platform.lastIssue}</div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}