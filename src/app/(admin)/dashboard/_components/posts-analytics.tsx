"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import * as d3 from "d3"

type AnalyticsResponse = {
  dailyStats: Record<string, { total: number; successful: number; failed: number; scheduled: number; drafted: number }>
  platformStats: Record<string, { total: number; successful: number; failed: number; scheduled: number; drafted: number }>
}

export function PostsAnalytics() {
  const chartRef = useRef<SVGSVGElement>(null)
  const [timeRange, setTimeRange] = useState("7d")
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)

  useEffect(() => {
    async function load() {
      const period = timeRange === "7d" ? "1w" : timeRange === "30d" ? "1m" : "3m"
      const res = await fetch(`/api/analytics?period=${period}`)
      if (res.ok) setAnalytics(await res.json())
    }
    load()
  }, [timeRange])

  useEffect(() => {
    if (!chartRef.current || !analytics) return

    const svg = d3.select(chartRef.current)
    svg.selectAll("*").remove()

    const margin = { top: 20, right: 30, bottom: 40, left: 40 }
    const width = 600 - margin.left - margin.right
    const height = 300 - margin.top - margin.bottom

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const parseDate = d3.timeParse("%Y-%m-%d")
    const raw = Object.entries(analytics.dailyStats).map(([date, v]) => ({ date, ...v }))
    const data = raw
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, dateObj: parseDate(d.date)! }))

    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.dateObj) as [Date, Date])
      .range([0, width])

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.total)!])
      .range([height, 0])

    const line = d3
      .line<(typeof data)[0]>()
      .x((d) => x(d.dateObj))
      .y((d) => y(d.successful))
      .curve(d3.curveMonotoneX)

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%m/%d") as any))

    g.append("g").call(d3.axisLeft(y))

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--chart-1))")
      .attr("stroke-width", 2)
      .attr("d", line)

    g.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => x(d.dateObj))
      .attr("cy", (d) => y(d.successful))
      .attr("r", 4)
      .attr("fill", "hsl(var(--chart-1))")
  }, [analytics])

  const platformData = analytics
    ? Object.entries(analytics.platformStats).map(([platform, v]) => ({ platform, posts: v.total, engagement: Math.max(0, 100 - Math.round((v.failed / Math.max(1, v.total)) * 100)) }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Posts Analytics</h2>
          <p className="text-muted-foreground">Track post performance and publishing trends</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
            <SelectItem value="90d">90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Publishing Trends</CardTitle>
            <CardDescription>Posts published over time</CardDescription>
          </CardHeader>
          <CardContent>
            <svg ref={chartRef}></svg>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>Posts and engagement by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {platformData.map((platform) => (
                <div key={platform.platform} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-chart-1"></div>
                    <span className="font-medium text-card-foreground">{platform.platform}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-muted-foreground">{platform.posts} posts</span>
                    <Badge variant="secondary">{platform.engagement}% engagement</Badge>
                  </div>
                </div>
              ))}
              {platformData.length === 0 && (
                <div className="text-sm text-muted-foreground">No platform data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}