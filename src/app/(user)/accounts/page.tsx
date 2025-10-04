"use client"

import useSWR from "swr"
import { toast } from "sonner"
import { useState } from "react"
import { format } from "date-fns"
import { Plus, MoreHorizontal, Edit, Trash2, Globe, RefreshCw, AlertCircle, CircleUserRound, Share2, Search, X, Check, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

import { getPlatformIcon } from "@/utils/ui/icons"
import { BrandModal } from "@/components/modals/BrandModal"
import { ConnectAccountsModal } from "@/components/modals/ConnectAccountsModal"

import type { Brand, SocialAccount } from "@prisma/client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface BrandWithSocialAccounts extends Brand {
  socialAccounts: SocialAccount[]
  members?: Array<{ userId: string; user: { id: string; name: string; email: string; image?: string } }>
}

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
}

function BrandRowSkeleton() {
  return (
    <TableRow className="hidden lg:table-row">
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-36" />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded" />
      </TableCell>
    </TableRow>
  )
}

function MobileBrandCardSkeleton() {
  return (
    <Card className="lg:hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/20 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="font-semibold text-xl mb-2">Failed to load brands</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          We couldn&apos;t fetch your brands. This might be due to a network issue or server problem.
        </p>
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  )
}

function ShareBrandModal({
  open,
  onOpenChange,
  brandId,
  brandName,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  brandId: string
  brandName: string
  onSuccess: () => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [isSharing, setIsSharing] = useState(false)

  const { data, isLoading } = useSWR(open ? "/api/users" : null, fetcher);
  
  // Fix: Access the data directly, not through usersData.data
  const usersData = data?.users || [];

  const filteredUsers = usersData?.filter((user: User) =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleShare = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Please select at least one user")
      return
    }

    setIsSharing(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedUsers) })
      })

      if (!response.ok) throw new Error("Failed to share brand")

      toast.success(`Brand shared with ${selectedUsers.size} user(s)`)
      setSelectedUsers(new Set())
      setSearchQuery("")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to share brand")
      console.error(error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Brand
          </DialogTitle>
          <DialogDescription>
            Share &quot;{brandName}&quot; with other users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {selectedUsers.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedUsers).map((userId) => {
                const user = usersData?.find((u: User) => u.id === userId)
                return (
                  <Badge key={userId} variant="secondary" className="gap-1 pr-1">
                    {user?.name || user?.email}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => toggleUser(userId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )
              })}
            </div>
          )}

          <ScrollArea className="h-[300px] rounded-md border">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <User className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No users found" : "No users available"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredUsers.map((user: User) => {
                  const isSelected = selectedUsers.has(user.id)
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleUser(user.id)}
                    >
                      <Avatar className="h-10 w-10 border-2">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user.name || "Unknown User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={selectedUsers.size === 0 || isSharing}
            className="flex-1"
          >
            {isSharing ? "Sharing..." : `Share with ${selectedUsers.size || ""} user${selectedUsers.size !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MobileBrandCard({
  brand,
  onEdit,
  onDelete,
  onConnect,
  onShare
}: {
  brand: BrandWithSocialAccounts
  onEdit: (brand: BrandWithSocialAccounts) => void
  onDelete: (id: string) => void
  onConnect: (brandId: string, brandName: string) => void
  onShare: (brandId: string, brandName: string) => void
}) {
  return (
    <Card className="lg:hidden shadow-md hover:shadow-xl transition-all duration-300 border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12 border-2 shadow-sm rounded-lg">
              <AvatarImage src={brand.logo || "/placeholder.svg"} alt={brand.name} />
              <AvatarFallback className="text-base font-bold rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                {brand.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{brand.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(new Date(brand.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onConnect(brand.id, brand.name)}>
                <Globe className="h-4 w-4 mr-2" />
                Connect Accounts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(brand.id, brand.name)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Brand
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(brand)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Brand
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(brand.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Brand
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-3">
        {brand.website && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Website</p>
            <a
              href={brand.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline truncate block"
            >
              {brand.website}
            </a>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Social Accounts</p>
          {brand.socialAccounts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {brand.socialAccounts.map((account: SocialAccount) => (
                <Badge key={account.id} variant="secondary" className="gap-1.5 px-3 py-1">
                  {getPlatformIcon(account.platform)}
                  <span className="text-xs font-medium truncate max-w-[100px]">
                    {account.platformUsername}
                  </span>
                </Badge>
              ))}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConnect(brand.id, brand.name)}
              className="gap-2 w-full"
            >
              <Plus className="h-4 w-4" />
              Connect Social Accounts
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function BrandsPage() {
  const { data: brands, isLoading, error, mutate } = useSWR("/api/brands", fetcher)
  const [selectedBrand, setSelectedBrand] = useState<BrandWithSocialAccounts | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [connectAccountsModal, setConnectAccountsModal] = useState<{
    open: boolean
    brandId?: string
    brandName?: string
  }>({ open: false })
  const [shareBrandModal, setShareBrandModal] = useState<{
    open: boolean
    brandId?: string
    brandName?: string
  }>({ open: false })

  const handleRetry = () => {
    mutate()
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/brands/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(response.statusText)
      }
      mutate()
      toast.success("Successfully deleted the brand")
    } catch (err) {
      console.error(err)
      toast.error("Something went wrong while deleting the brand")
    }
  }

  const handleEdit = (brand: BrandWithSocialAccounts) => {
    setSelectedBrand(brand)
    setIsCreateModalOpen(true)
  }

  const handleSuccess = () => {
    setIsCreateModalOpen(false)
    setSelectedBrand(null)
    mutate()
  }

  const openConnectModal = (brandId: string, brandName: string) => {
    setConnectAccountsModal({ open: true, brandId, brandName })
  }

  const openShareModal = (brandId: string, brandName: string) => {
    setShareBrandModal({ open: true, brandId, brandName })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary/10 p-3 shrink-0">
            <CircleUserRound className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              Brands
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
              Create and manage separate business profiles for each of your brands. Connect social accounts and share with team members.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setSelectedBrand(null)
            setIsCreateModalOpen(true)
          }}
          className="w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow shrink-0"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Brand
        </Button>
      </div>

      <Separator />

      {/* Content */}
      {error ? (
        <ErrorState onRetry={handleRetry} />
      ) : isLoading ? (
        <>
          {/* Mobile Skeleton */}
          <div className="space-y-4 lg:hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <MobileBrandCardSkeleton key={`mobile-skeleton-${i}`} />
            ))}
          </div>

          {/* Desktop Skeleton */}
          <Card className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Brand</TableHead>
                  <TableHead className="font-semibold" style={{ width: "35%" }}>
                    Social Accounts
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <BrandRowSkeleton key={`desktop-skeleton-${i}`} />
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="space-y-4 lg:hidden">
            {brands?.data?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">No brands yet</h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                    Get started by creating your first brand profile to manage your social media presence
                  </p>
                  <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Brand
                  </Button>
                </CardContent>
              </Card>
            ) : (
              brands?.data.map((brand: BrandWithSocialAccounts) => (
                <MobileBrandCard
                  key={brand.id}
                  brand={brand}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onConnect={openConnectModal}
                  onShare={openShareModal}
                />
              ))
            )}
          </div>

          {/* Desktop View: Table */}
          <Card className="hidden lg:block shadow-sm py-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Brand</TableHead>
                  <TableHead className="font-semibold" style={{ width: "70%" }}>
                    Social Accounts
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-4 mb-4">
                          <Plus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-xl mb-2">No brands yet</h3>
                        <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                          Get started by creating your first brand profile to manage your social media presence
                        </p>
                        <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Brand
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  brands?.data.map((brand: BrandWithSocialAccounts) => (
                    <TableRow key={brand.id} className="hover:bg-muted/50 transition-colors">
                      {/* Brand */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 shadow-sm rounded-lg">
                            <AvatarImage src={brand.logo || "/placeholder.svg"} alt={brand.name} />
                            <AvatarFallback className="font-bold rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                              {brand.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{brand.name}</p>
                            {brand.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {brand.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Social Accounts */}
                      <TableCell>
                        {brand.socialAccounts.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {brand.socialAccounts.map((account: SocialAccount) => (
                              <Badge
                                key={account.id}
                                variant="secondary"
                                className="gap-1.5 px-3 py-1"
                              >
                                {getPlatformIcon(account.platform)}
                                <span className="text-xs font-medium">
                                  {account.platformUsername}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openConnectModal(brand.id, brand.name)}
                            className="gap-2"
                          >
                            <Globe className="h-4 w-4" />
                            Add Account
                          </Button>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openConnectModal(brand.id, brand.name)}>
                              <Globe className="h-4 w-4 mr-2" />
                              Connect Accounts
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openShareModal(brand.id, brand.name)}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share Brand
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(brand)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Brand
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(brand.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Brand
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <BrandModal
        brand={selectedBrand}
        open={isCreateModalOpen}
        onSuccess={handleSuccess}
        onOpenChange={(open) => {
          if (!open) setSelectedBrand(null)
          setIsCreateModalOpen(open)
        }}
      />

      <ConnectAccountsModal
        mutate={mutate}
        accounts={
          brands?.data.find((b: BrandWithSocialAccounts) => b.id === connectAccountsModal.brandId)
            ?.socialAccounts ?? []
        }
        open={connectAccountsModal.open}
        onOpenChange={(open) => setConnectAccountsModal({ ...connectAccountsModal, open })}
        brandId={connectAccountsModal.brandId}
        brandName={connectAccountsModal.brandName}
      />

      <ShareBrandModal
        open={shareBrandModal.open}
        onOpenChange={(open) => setShareBrandModal({ ...shareBrandModal, open })}
        brandId={shareBrandModal.brandId || ""}
        brandName={shareBrandModal.brandName || ""}
        onSuccess={() => mutate()}
      />
    </div>
  )
}