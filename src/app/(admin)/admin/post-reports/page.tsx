"use client"

import * as d3 from "d3";
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarIcon, BarChart3Icon, UsersIcon, BuildingIcon, GlobeIcon } from "lucide-react"
import { formatDate } from "@/utils/format"

interface PostReportData {
  summary: {
    totalPosts: number
    totalBrands: number
    totalUsers: number
    totalPlatforms: number
  }
  postsByBrand: Array<{
    brandId: string
    _count: { id: number }
    brand: { id: string; name: string; logo?: string }
  }>
  postsByPlatform: Array<{
    platform: string
    _count: { id: number }
  }>
  postsByUser: Array<{
    userId: string
    _count: { id: number }
    user: { id: string; name?: string; email: string; image?: string }
  }>
  detailedPosts: Array<{
    id: string
    content: string
    platform: string
    status: string
    createdAt: string
    publishedAt?: string
    brand: { id: string; name: string; logo?: string }
    user: { id: string; name?: string; email: string; image?: string }
  }>
  allBrands: Array<{
    id: string
    name: string
  }>
}

const PLATFORM_COLORS = {
  FACEBOOK: "#1877F2",
  INSTAGRAM: "#E4405F",
  TWITTER: "#1DA1F2",
  LINKEDIN: "#0A66C2",
  PINTEREST: "#BD081C",
  REDDIT: "#FF4500",
  MEDIUM: "#00AB6C",
  QUORA: "#B92B27",
  GOOGLE: "#4285F4",
  ALL: "#6B7280",
}

// Types for D3 data
interface BrandData {
  brandId: string
  _count: { id: number }
  brand: { id: string; name: string; logo?: string }
}

interface PlatformData {
  platform: string
  _count: { id: number }
}

// D3 Bar Chart Component
const BarChartD3 = ({ data }: { data: BrandData[] }) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = svgRef.current.clientWidth
    const height = 300
    const margin = { top: 20, right: 30, bottom: 100, left: 60 }

    svg.attr("width", width).attr("height", height)

    const x = d3.scaleBand()
      .domain(data.map(d => d.brand.name))
      .range([margin.left, width - margin.right])
      .padding(0.1)

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d._count.id) || 0])
      .nice()
      .range([height - margin.bottom, margin.top])

    // Add axes
    const xAxis = d3.axisBottom(x).tickSizeOuter(0)
    const yAxis = d3.axisLeft(y)

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis)

    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y)
        .tickSize(-width + margin.left + margin.right)
        .tickFormat(() => "")
      )
      .style("stroke-dasharray", "3 3")
      .style("opacity", 0.3)

    // Add tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000)
      .style("font-size", "12px")

    // Add bars with proper event handling
    const bars = svg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.brand.name) || 0)
      .attr("y", d => y(d._count.id))
      .attr("width", x.bandwidth())
      .attr("height", d => height - margin.bottom - y(d._count.id))
      .attr("fill", "hsl(var(--primary))")

    // Properly typed event handling for D3
    bars.on("mouseover", function(event: MouseEvent, d: BrandData) {
        tooltip.transition().duration(200).style("opacity", 0.9)
        tooltip.html(`${d.brand.name}: ${d._count.id} posts`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px")
      })
      .on("mouseout", function() {
        tooltip.transition().duration(500).style("opacity", 0)
      })

    return () => {
      tooltip.remove()
    }
  }, [data])

  return <svg ref={svgRef} className="w-full h-[300px]" />
}

// D3 Pie Chart Component
const PieChartD3 = ({ data }: { data: PlatformData[] }) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = svgRef.current.clientWidth
    const height = 300
    const radius = Math.min(width, height) / 2 - 40

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`)

    const pie = d3.pie<PlatformData>()
      .value(d => d._count.id)
      .sort(null)

    const arc = d3.arc<d3.PieArcDatum<PlatformData>>()
      .innerRadius(0)
      .outerRadius(radius)

    const arcs = g.selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc")

    const paths = arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => PLATFORM_COLORS[d.data.platform as keyof typeof PLATFORM_COLORS] || "#6B7280")

    // Add labels with simplified positioning
    arcs.append("text")
      .attr("transform", d => {
        const [x, y] = arc.centroid(d)
        return `translate(${x},${y})`
      })
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .text(d => d.data._count.id.toString())

    // Add tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000)
      .style("font-size", "12px")

    // Properly typed event handling for D3
    paths.on("mouseover", function(event: MouseEvent, d: d3.PieArcDatum<PlatformData>) {
        const total = d3.sum(data, x => x._count.id)
        const percentage = ((d.data._count.id / total) * 100).toFixed(1)
        tooltip.transition().duration(200).style("opacity", 0.9)
        tooltip.html(`${d.data.platform}: ${d.data._count.id} posts (${percentage}%)`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px")
      })
      .on("mouseout", function() {
        tooltip.transition().duration(500).style("opacity", 0)
      })

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 150}, 20)`)

    data.forEach((d, i) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`)

      legendItem.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", PLATFORM_COLORS[d.platform as keyof typeof PLATFORM_COLORS] || "#6B7280")

      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .style("font-size", "12px")
        .text(d.platform)
    })

    return () => {
      tooltip.remove()
    }
  }, [data])

  return <svg ref={svgRef} className="w-full h-[300px]" />
}

export default function PostReportsPage() {
  const [data, setData] = useState<PostReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    brandId: "all",
    platform: "ALL",
    startDate: "",
    endDate: "",
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.brandId !== "all") params.append("brandId", filters.brandId)
      if (filters.platform !== "ALL") params.append("platform", filters.platform)
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)

      const response = await fetch(`/api/posts/reports?${params}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    fetchData()
  }

  const resetFilters = () => {
    setFilters({
      brandId: "all",
      platform: "ALL",
      startDate: "",
      endDate: "",
    })
    setTimeout(fetchData, 100)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading post reports...</div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-destructive">Failed to load post reports</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Post Reports</h1>
          <p className="text-muted-foreground">Analytics and insights for your social media posts</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Brand</label>
              <Select value={filters.brandId} onValueChange={(value) => handleFilterChange("brandId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {data.allBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Platform</label>
              <Select value={filters.platform} onValueChange={(value) => handleFilterChange("platform", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Platforms</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="TWITTER">Twitter</SelectItem>
                  <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                  <SelectItem value="PINTEREST">Pinterest</SelectItem>
                  <SelectItem value="REDDIT">Reddit</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="QUORA">Quora</SelectItem>
                  <SelectItem value="GOOGLE">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalPosts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Brands</CardTitle>
            <BuildingIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalBrands}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platforms Used</CardTitle>
            <GlobeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalPlatforms}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts by Brand Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Posts by Brand</CardTitle>
            <CardDescription>Number of posts created for each brand</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartD3 data={data.postsByBrand} />
          </CardContent>
        </Card>

        {/* Posts by Platform Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Posts by Platform</CardTitle>
            <CardDescription>Distribution of posts across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <PieChartD3 data={data.postsByPlatform} />
          </CardContent>
        </Card>
      </div>

      {/* Top Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Contributors</CardTitle>
          <CardDescription>Users who created the most posts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Posts Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.postsByUser.slice(0, 10).map((item) => (
                <TableRow key={item.userId}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.user.image || "/placeholder.svg"} />
                      <AvatarFallback>{item.user.name?.charAt(0) || item.user.email.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{item.user.name || "Unknown User"}</span>
                  </TableCell>
                  <TableCell>{item.user.email}</TableCell>
                  <TableCell className="text-right font-medium">{item._count.id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
          <CardDescription>Latest posts matching your filters</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.detailedPosts.slice(0, 20).map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {post.brand.logo && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={post.brand.logo || "/placeholder.svg"} />
                          <AvatarFallback>{post.brand.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-sm">{post.brand.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: PLATFORM_COLORS[post.platform as keyof typeof PLATFORM_COLORS],
                        color: PLATFORM_COLORS[post.platform as keyof typeof PLATFORM_COLORS],
                      }}
                    >
                      {post.platform}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={post.user.image || "/placeholder.svg"} />
                        <AvatarFallback>{post.user.name?.charAt(0) || post.user.email.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{post.user.name || post.user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={post.status === "PUBLISHED" ? "default" : "secondary"}>{post.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(post.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}