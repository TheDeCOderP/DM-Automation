"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Eye,
  MousePointer,
  Clock,
  TrendingUp,
  Monitor,
  Smartphone,
  Tablet,
  BarChart3,
  Calendar,
  Loader2,
  Activity,
  Globe,
  Target,
  UserPlus,
  ArrowUp,
  ArrowDown,
  Chrome,
  FileBox as Firefox,
  Award as Safari,
} from "lucide-react"
import * as d3 from "d3"

interface AnalyticsData {
  main: {
    rows: Array<{
      dimensionValues: Array<{ value: string }>
      metricValues: Array<{ value: string }>
    }>
  }
  devices: {
    rows: Array<{
      dimensionValues: Array<{ value: string }>
      metricValues: Array<{ value: string }>
    }>
  }
  trafficSources: {
    rows: Array<{
      dimensionValues: Array<{ value: string }>
      metricValues: Array<{ value: string }>
    }>
  }
  geography: {
    rows: Array<{
      dimensionValues: Array<{ value: string }>
      metricValues: Array<{ value: string }>
    }>
  }
  pages: {
    rows: Array<{
      dimensionValues: Array<{ value: string }>
      metricValues: Array<{ value: string }>
    }>
  }
  browsers: {
    rows: Array<{
      dimensionValues: Array<{ value: string }>
      metricValues: Array<{ value: string }>
    }>
  }
  hourly: {
    rows: Array<{
      dimensionValues: Array<{ value: string }>
      metricValues: Array<{ value: string }>
    }>
  }
  previousPeriod: {
    rows: Array<{
      metricValues: Array<{ value: string }>
    }>
  }
  period: string
}

interface ChartDataPoint {
  date: string
  fullDate: string
  sessions: number
  users: number
  pageViews: number
  engagementRate: number
}

interface TrafficSourceData {
  source: string
  sessions: number
  newUsers: number
  conversions: number
}

interface HourlyData {
  hour: number
  sessions: number
}



const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d", "#ffc658"]

const PERIOD_OPTIONS = [
  { value: "7days", label: "Last 7 Days", icon: Calendar },
  { value: "28days", label: "Last 28 Days", icon: Calendar },
  { value: "90days", label: "Last 90 Days", icon: Calendar },
  { value: "6months", label: "Last 6 Months", icon: Calendar },
  { value: "1year", label: "Last Year", icon: Calendar },
]

// D3 Line Chart Component
const LineChart = ({ data, width = 800, height = 320 } : { 
  data: ChartDataPoint[], 
  width?: number, 
  height?: number 
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!data || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const margin = { top: 20, right: 80, bottom: 40, left: 60 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Scales
    const xScale = d3.scalePoint()
      .domain(data.map(d => d.date))
      .range([0, innerWidth])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, (d: ChartDataPoint) => Math.max(d.users, d.sessions, d.pageViews)) as number])
      .nice()
      .range([innerHeight, 0])

    const yScalePercent = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0])

    // Line generators
    const lineUsers = d3.line<ChartDataPoint>()
      .x((d: ChartDataPoint) => xScale(d.date) as number)
      .y((d: ChartDataPoint) => yScale(d.users))
      .curve(d3.curveMonotoneX)

    const lineSessions = d3.line<ChartDataPoint>()
      .x((d: ChartDataPoint) => xScale(d.date) as number)
      .y((d: ChartDataPoint) => yScale(d.sessions))
      .curve(d3.curveMonotoneX)

    const linePageViews = d3.line<ChartDataPoint>()
      .x((d: ChartDataPoint) => xScale(d.date) as number)
      .y((d: ChartDataPoint) => yScale(d.pageViews))
      .curve(d3.curveMonotoneX)

    const lineEngagement = d3.line<ChartDataPoint>()
      .x((d: ChartDataPoint) => xScale(d.date) as number)
      .y((d: ChartDataPoint) => yScalePercent(d.engagementRate))
      .curve(d3.curveMonotoneX)

    // Add grid
    g.selectAll(".grid-line")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("class", "grid-line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d: number) => yScale(d))
      .attr("y2", (d: number) => yScale(d))
      .attr("stroke", "#e5e7eb")
      .attr("stroke-dasharray", "3,3")

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-size", "12px")

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "12px")

    // Add lines
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3B82F6")
      .attr("stroke-width", 2)
      .attr("d", lineUsers)

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#10B981")
      .attr("stroke-width", 2)
      .attr("d", lineSessions)

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#8B5CF6")
      .attr("stroke-width", 2)
      .attr("d", linePageViews)

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#F59E0B")
      .attr("stroke-width", 2)
      .attr("d", lineEngagement)

    // Add legend
    const legend = g.append("g")
      .attr("transform", `translate(${innerWidth - 70}, 20)`)

    const legendData = [
      { label: "Users", color: "#3B82F6" },
      { label: "Sessions", color: "#10B981" },
      { label: "Page Views", color: "#8B5CF6" },
      { label: "Engagement %", color: "#F59E0B" }
    ]

    legendData.forEach((d, i) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`)

      legendItem.append("rect")
        .attr("width", 12)
        .attr("height", 2)
        .attr("fill", d.color)

      legendItem.append("text")
        .attr("x", 16)
        .attr("y", 5)
        .style("font-size", "12px")
        .style("fill", "#6b7280")
        .text(d.label)
    })

  }, [data, width, height])

  return <svg ref={svgRef} width={width} height={height} />
}

// D3 Pie Chart Component
const PieChart = ({ data, width = 320, height = 256 }: { data: TrafficSourceData[], width?: number, height?: number }) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!data || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const radius = Math.min(width, height) / 2 - 10
    const g = svg.append("g")
      .attr("transform", `translate(${width/2},${height/2})`)

    const pie = d3.pie<TrafficSourceData>()
      .value(d => d.sessions)
      .sort(null)

    const arc = d3.arc<d3.PieArcDatum<TrafficSourceData>>()
      .innerRadius(0)
      .outerRadius(radius)

    const arcLabel = d3.arc<d3.PieArcDatum<TrafficSourceData>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius * 0.6)

    const arcs = g.selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc")

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", (d: d3.PieArcDatum<TrafficSourceData>, i: number) => COLORS[i % COLORS.length])
      .attr("stroke", "white")
      .attr("stroke-width", 2)

    arcs.append("text")
      .attr("transform", (d: d3.PieArcDatum<TrafficSourceData>) => `translate(${arcLabel.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "white")
      .text((d: d3.PieArcDatum<TrafficSourceData>) => {
        const percent = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(0)
        return +percent > 5 ? `${d.data.source} ${percent}%` : ''
      })

  }, [data, width, height])

  return <svg ref={svgRef} width={width} height={height} />
}

// D3 Bar Chart Component
const BarChart = ({ data, width = 800, height = 256 }: { data: HourlyData[], width?: number, height?: number }) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!data || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const margin = { top: 20, right: 30, bottom: 40, left: 40 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    const xScale = d3.scaleBand()
      .domain(data.map((d: HourlyData) => `${d.hour}:00`))
      .range([0, innerWidth])
      .padding(0.1)

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, (d: HourlyData) => d.sessions) as number])
      .nice()
      .range([innerHeight, 0])

    // Add grid
    g.selectAll(".grid-line")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("class", "grid-line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d: number) => yScale(d))
      .attr("y2", (d: number) => yScale(d))
      .attr("stroke", "#e5e7eb")
      .attr("stroke-dasharray", "3,3")

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-size", "12px")

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "12px")

    // Add bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d: HourlyData) => xScale(`${d.hour}:00`) as number)
      .attr("y", (d: HourlyData) => yScale(d.sessions))
      .attr("width", xScale.bandwidth())
      .attr("height", (d: HourlyData) => innerHeight - yScale(d.sessions))
      .attr("fill", "#8884d8")
      .attr("rx", 2)

  }, [data, width, height])

  return <svg ref={svgRef} width={width} height={height} />
}

const getDeviceIcon = (device: string) => {
  switch (device.toLowerCase()) {
    case "mobile":
      return Smartphone
    case "tablet":
      return Tablet
    case "desktop":
      return Monitor
    default:
      return Monitor
  }
}

const getBrowserIcon = (browser: string) => {
  switch (browser.toLowerCase()) {
    case "chrome":
      return Chrome
    case "firefox":
      return Firefox
    case "safari":
      return Safari
    default:
      return Globe
  }
}

const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("7days")
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async (period: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/analytics?period=${period}`)
      if (!response.ok) throw new Error("Failed to fetch analytics")
      const result = await response.json()
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch analytics")
      console.error("Analytics fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics(selectedPeriod)
  }, [selectedPeriod])

  // Parse GA4 date (YYYYMMDD) and format in UK style
  const formatDate = (dateString: string) => {
    if (!dateString || dateString.length !== 8) return dateString
    const year = Number.parseInt(dateString.slice(0, 4), 10)
    const month = Number.parseInt(dateString.slice(4, 6), 10) - 1
    const day = Number.parseInt(dateString.slice(6, 8), 10)
    const date = new Date(year, month, day)
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}m ${secs}s`
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-secondary mx-auto" />
          <p className="text-lg font-medium text-gray-600">Loading analytics data...</p>
          <p className="text-sm text-gray-400">Fetching insights from Google Analytics</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Activity className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchAnalytics(selectedPeriod)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data?.main?.rows) {
    return (
      <div className="p-8 text-center">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg text-gray-600">No analytics data available</p>
      </div>
    )
  }

  const chartData = data.main.rows.map((row) => ({
    date: formatDate(row.dimensionValues[0].value),
    fullDate: row.dimensionValues[0].value,
    sessions: Number.parseInt(row.metricValues[0].value),
    users: Number.parseInt(row.metricValues[1].value),
    newUsers: Number.parseInt(row.metricValues[2].value),
    pageViews: Number.parseInt(row.metricValues[3].value),
    bounceRate: Number.parseFloat(row.metricValues[4].value) * 100,
    avgDuration: Number.parseFloat(row.metricValues[5].value),
    conversions: Number.parseInt(row.metricValues[6].value || "0"),
    engagementRate: Number.parseFloat(row.metricValues[7].value || "0") * 100,
    engagedSessions: Number.parseInt(row.metricValues[8].value || "0"),
  }))

  // Calculate totals and averages
  const totals = chartData.reduce(
    (acc, row) => ({
      sessions: acc.sessions + row.sessions,
      users: acc.users + row.users,
      newUsers: acc.newUsers + row.newUsers,
      pageViews: acc.pageViews + row.pageViews,
      bounceRate: acc.bounceRate + row.bounceRate,
      avgDuration: acc.avgDuration + row.avgDuration,
      conversions: acc.conversions + row.conversions,
      engagementRate: acc.engagementRate + row.engagementRate,
      engagedSessions: acc.engagedSessions + row.engagedSessions,
    }),
    {
      sessions: 0,
      users: 0,
      newUsers: 0,
      pageViews: 0,
      bounceRate: 0,
      avgDuration: 0,
      conversions: 0,
      engagementRate: 0,
      engagedSessions: 0,
    },
  )

  const avgBounceRate = totals.bounceRate / chartData.length || 0
  const avgSessionDuration = totals.avgDuration / chartData.length || 0
  const avgEngagementRate = totals.engagementRate / chartData.length || 0

  const previousPeriodData = data.previousPeriod?.rows?.[0]
  const previousTotals = previousPeriodData
    ? {
        sessions: Number.parseInt(previousPeriodData.metricValues[0].value),
        users: Number.parseInt(previousPeriodData.metricValues[1].value),
        pageViews: Number.parseInt(previousPeriodData.metricValues[2].value),
        bounceRate: Number.parseFloat(previousPeriodData.metricValues[3].value) * 100,
        avgDuration: Number.parseFloat(previousPeriodData.metricValues[4].value),
      }
    : null

  // Process enhanced data
  const deviceData =
    data.devices?.rows?.map((row) => ({
      name: row.dimensionValues[0].value,
      sessions: Number.parseInt(row.metricValues[0].value),
      bounceRate: Number.parseFloat(row.metricValues[1].value) * 100,
      avgDuration: Number.parseFloat(row.metricValues[2].value),
    })) || []

  const trafficSourcesData =
    data.trafficSources?.rows?.map((row) => ({
      source: row.dimensionValues[0].value,
      sessions: Number.parseInt(row.metricValues[0].value),
      newUsers: Number.parseInt(row.metricValues[1].value),
      conversions: Number.parseInt(row.metricValues[2].value || "0"),
    })) || []

  const geoData =
    data.geography?.rows?.slice(0, 5).map((row) => ({
      country: row.dimensionValues[0].value,
      sessions: Number.parseInt(row.metricValues[0].value),
      users: Number.parseInt(row.metricValues[1].value),
    })) || []

  // Enhanced top pages data
  const topPages =
    data.pages?.rows?.slice(0, 5).map((row) => ({
      page: row.dimensionValues[0].value,
      title: row.dimensionValues[1]?.value || row.dimensionValues[0].value,
      views: Number.parseInt(row.metricValues[0].value),
      avgDuration: Number.parseFloat(row.metricValues[1].value),
      bounceRate: Number.parseFloat(row.metricValues[2].value) * 100,
    })) || []

  const browserData =
    data.browsers?.rows?.map((row) => ({
      browser: row.dimensionValues[0].value,
      sessions: Number.parseInt(row.metricValues[0].value),
    })) || []

  const hourlyData =
    data.hourly?.rows?.map((row) => ({
      hour: Number.parseInt(row.dimensionValues[0].value),
      sessions: Number.parseInt(row.metricValues[0].value),
    })) || []

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive website performance and user engagement insights</p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === option.value
                  ? "bg-primary text-white shadow-lg"
                  : "bg-white text-gray-600 hover:bg-gray-100 shadow-sm"
              }`}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-r from-primary to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-100">
              <Users className="h-5 w-5" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.users.toLocaleString()}</p>
            {previousTotals && (
              <div className="flex items-center gap-1 mt-1">
                {calculatePercentageChange(totals.users, previousTotals.users) >= 0 ? (
                  <ArrowUp className="h-3 w-3 text-green-200" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-red-200" />
                )}
                <span className="text-xs text-blue-100">
                  {Math.abs(calculatePercentageChange(totals.users, previousTotals.users)).toFixed(1)}%
                </span>
              </div>
            )}
            <p className="text-blue-100 text-sm">Unique visitors</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-100">
              <Eye className="h-5 w-5" />
              Page Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.pageViews.toLocaleString()}</p>
            {previousTotals && (
              <div className="flex items-center gap-1 mt-1">
                {calculatePercentageChange(totals.pageViews, previousTotals.pageViews) >= 0 ? (
                  <ArrowUp className="h-3 w-3 text-green-200" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-red-200" />
                )}
                <span className="text-xs text-green-100">
                  {Math.abs(calculatePercentageChange(totals.pageViews, previousTotals.pageViews)).toFixed(1)}%
                </span>
              </div>
            )}
            <p className="text-green-100 text-sm">Total page views</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-100">
              <MousePointer className="h-5 w-5" />
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.sessions.toLocaleString()}</p>
            {previousTotals && (
              <div className="flex items-center gap-1 mt-1">
                {calculatePercentageChange(totals.sessions, previousTotals.sessions) >= 0 ? (
                  <ArrowUp className="h-3 w-3 text-green-200" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-red-200" />
                )}
                <span className="text-xs text-purple-100">
                  {Math.abs(calculatePercentageChange(totals.sessions, previousTotals.sessions)).toFixed(1)}%
                </span>
              </div>
            )}
            <p className="text-purple-100 text-sm">User sessions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-100">
              <UserPlus className="h-5 w-5" />
              New Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.newUsers.toLocaleString()}</p>
            <p className="text-orange-100 text-sm mt-1">
              {((totals.newUsers / totals.users) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-teal-100">
              <Target className="h-5 w-5" />
              Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.conversions.toLocaleString()}</p>
            <p className="text-teal-100 text-sm mt-1">
              {((totals.conversions / totals.sessions) * 100).toFixed(2)}% rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traffic Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Traffic Trends & Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <LineChart data={chartData} width={800} height={320} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-600" />
              Traffic Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <PieChart data={trafficSourcesData} width={320} height={256} />
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {geoData.map((country, index) => {
                const percentage = ((country.sessions / totals.sessions) * 100).toFixed(1)
                return (
                  <div key={country.country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{country.country}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{country.sessions.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{percentage}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Secondary Metrics Row */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-green-600" />
              Device Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deviceData.map((device) => {
                const Icon = getDeviceIcon(device.name)
                const percentage = ((device.sessions / totals.sessions) * 100).toFixed(1)
                return (
                  <div key={device.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-600" />
                        <span className="capitalize text-sm font-medium">{device.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{device.sessions.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{percentage}%</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Bounce: {device.bounceRate.toFixed(1)}% | Avg: {formatDuration(device.avgDuration)}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              Top Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPages.map((page, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={page.page}>
                        {page.page === "/" ? "Homepage" : page.page}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{page.views}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Bounce: {page.bounceRate.toFixed(1)}%</span>
                    <span>{formatDuration(page.avgDuration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Browser Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Chrome className="h-5 w-5 text-blue-600" />
              Browsers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {browserData.map((browser) => {
                const Icon = getBrowserIcon(browser.browser)
                const percentage = ((browser.sessions / totals.sessions) * 100).toFixed(1)
                return (
                  <div key={browser.browser} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">{browser.browser}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{browser.sessions.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{percentage}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600" />
              Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Bounce Rate</span>
                <span className="text-sm font-bold">{avgBounceRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(avgBounceRate, 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Engagement Rate</span>
                <span className="text-sm font-bold">{avgEngagementRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${Math.min(avgEngagementRate, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Avg. Session Duration</span>
                <span className="text-sm font-bold">{formatDuration(avgSessionDuration)}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Pages per Session</span>
                <span className="text-sm font-bold">{(totals.pageViews / totals.sessions || 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Hourly Activity Pattern
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <BarChart data={hourlyData} width={800} height={256} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}