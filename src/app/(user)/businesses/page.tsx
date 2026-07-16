"use client"

import useSWR from "swr"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import { 
  MapPin, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  Store, 
  Star, 
  PenSquare, 
  BarChart3, 
  AlertTriangle, 
  Loader2,
  Search,
  MoreHorizontal,
  ChevronDown
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch')
  }
  
  return data
}

function LocationRowSkeleton() {
  return (
    <TableRow className="hidden lg:table-row border-border/40">
      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
    </TableRow>
  )
}

function LocationMobileSkeleton() {
  return (
    <Card className="p-4 space-y-4 lg:hidden border-border/40 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
    </Card>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/20 shadow-sm bg-destructive/5">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center px-6">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Failed to load locations</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          We couldn't fetch your business locations. Please check your connection or try again.
        </p>
        <Button onClick={onRetry} variant="outline" className="gap-2 bg-background">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6 w-full">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-1">No locations found</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        Connect your Google Business Profile account in the Accounts section to sync and manage your locations.
      </p>
      <Button asChild variant="default">
        <Link href="/accounts">Connect Account</Link>
      </Button>
    </div>
  )
}

export default function LocationsPage() {
  const router = useRouter()
  const { data: locationsResponse, isLoading, error, mutate } = useSWR("/api/locations", fetcher)
  
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const locations = locationsResponse?.data || []

  // Extract unique brands for the Sync dropdown to pass the required brandId to the API
  const uniqueBrands = useMemo(() => {
    const brandsMap = new Map()
    locations.forEach((loc: any) => {
      if (loc.brand?.id && !brandsMap.has(loc.brand.id)) {
        brandsMap.set(loc.brand.id, loc.brand)
      }
    })
    return Array.from(brandsMap.values())
  }, [locations])

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations
    return locations.filter((loc: any) => 
      loc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.brand?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [locations, searchQuery])

  const handleSync = async (brandId: string) => {
    setIsSyncing(true)
    try {
      // API Compatibility: Passing the explicitly required brandId
      const res = await fetch("/api/locations/sync", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || "Failed to sync")
      
      toast.success(data.message || "Locations synced successfully")
      mutate() // Refresh the SWR cache immediately
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Locations</h1>
          <p className="text-muted-foreground mt-1">
            Manage Google Business Profiles, reviews, and posts across your brands.
          </p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          {uniqueBrands.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isSyncing} className="flex-1 sm:flex-none">
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Locations
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Select Brand to Sync</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {uniqueBrands.map((brand: any) => (
                  <DropdownMenuItem key={brand.id} onClick={() => handleSync(brand.id)}>
                    {brand.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" disabled className="flex-1 sm:flex-none">
              <RefreshCw className="h-4 w-4 mr-2 opacity-50" />
              Sync Locations
            </Button>
          )}

          <Button onClick={() => router.push('/accounts')} className="flex-1 sm:flex-none shadow-sm">
            <Store className="h-4 w-4 mr-2" />
            Connect
          </Button>
        </div>
      </div>

      <Separator className="bg-border/50" />

      {/* Main Content Area */}
      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="lg:hidden space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <LocationMobileSkeleton key={i} />)}
          </div>
          <Card className="hidden lg:block border-border/40 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[5%]">No.</TableHead>
                  <TableHead className="w-[30%]">Location</TableHead>
                  <TableHead className="w-[15%]">Status</TableHead>
                  <TableHead className="w-[40%]">Address</TableHead>
                  <TableHead className="w-[10%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => <LocationRowSkeleton key={i} />)}
              </TableBody>
            </Table>
          </Card>
        </div>
      ) : (
        <Card className="border-border/40 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search locations..."
                  className="pl-8 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Badge variant="secondary" className="hidden sm:flex">
                {filteredLocations.length} Locations
              </Badge>
            </div>
          </CardHeader>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium w-[5%] pl-6">No.</TableHead>
                  <TableHead className="font-medium w-[30%]">Location & Brand</TableHead>
                  <TableHead className="font-medium w-[15%]">Status</TableHead>
                  <TableHead className="font-medium w-[40%]">Address</TableHead>
                  <TableHead className="font-medium w-[10%] text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64">
                      {searchQuery ? (
                        <div className="text-center text-muted-foreground">No locations match your search.</div>
                      ) : (
                        <EmptyState />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocations.map((loc: any, index: number) => (
                    <TableRow key={loc.id} className="transition-colors border-border/40">
                      <TableCell className="text-muted-foreground pl-6">
                        {index + 1}
                      </TableCell>
                      
                      <TableCell className="max-w-[100px]">
                        <Link href={`/businesses/${loc.id}`} className="flex items-center gap-3 group">
                          <Avatar className="h-9 w-9 rounded-md border border-border/50 group-hover:border-primary/30 transition-colors">
                            <AvatarImage src={loc.brand?.logo || undefined} />
                            <AvatarFallback className="rounded-md bg-primary/5 text-primary text-xs font-medium">
                              {loc.brand?.name?.substring(0, 2).toUpperCase() || <Store className="h-3 w-3"/>}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                              {loc.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{loc.brand?.name}</p>
                          </div>
                        </Link>
                      </TableCell>

                      <TableCell>
                        {loc.isSuspended ? (
                          <Badge variant="destructive" className="flex w-fit items-center gap-1 text-[10px] uppercase tracking-wider font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Suspended
                          </Badge>
                        ) : loc.isVerified ? (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] uppercase tracking-wider font-semibold">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">
                            Unverified
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="max-w-[300px]">
                        <div className="text-sm text-muted-foreground flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
                          <span className="line-clamp-1 truncate pr-4">
                            {loc.address?.addressLines?.join(", ") || "No address provided"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => router.push(`/locations/${loc.id}/posts`)}>
                              <PenSquare className="mr-2 h-4 w-4" /> Posts
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/locations/${loc.id}/reviews`)}>
                              <Star className="mr-2 h-4 w-4" /> Reviews
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/locations/${loc.id}/insights`)}>
                              <BarChart3 className="mr-2 h-4 w-4" /> Insights
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-border/40">
            {filteredLocations.length === 0 ? (
              <div className="p-8">
                <EmptyState />
              </div>
            ) : (
              filteredLocations.map((loc: any) => (
                <div key={loc.id} className="p-4 space-y-4 bg-background">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar className="h-10 w-10 rounded-md border border-border/50">
                        <AvatarImage src={loc.brand?.logo || undefined} />
                        <AvatarFallback className="rounded-md bg-primary/5 text-primary">
                          {loc.brand?.name?.substring(0, 2).toUpperCase() || <Store className="h-4 w-4"/>}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{loc.title}</p>
                        <p className="text-xs text-muted-foreground truncate mb-1">{loc.brand?.name}</p>
                        {loc.isSuspended ? (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Suspended</Badge>
                        ) : loc.isVerified ? (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] px-1.5 py-0">Verified</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Unverified</Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/locations/${loc.id}/posts`)}>
                          <PenSquare className="mr-2 h-4 w-4" /> Posts
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/locations/${loc.id}/reviews`)}>
                          <Star className="mr-2 h-4 w-4" /> Reviews
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/locations/${loc.id}/insights`)}>
                          <BarChart3 className="mr-2 h-4 w-4" /> Insights
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="text-sm text-muted-foreground flex items-start gap-2 bg-muted/30 p-2 rounded-md">
                    <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                    <span className="line-clamp-2 text-xs">
                      {loc.address?.addressLines?.join(", ") || "No address provided"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  )
}