"use client"

import useSWR from "swr"
import { toast } from "sonner"
import { useState } from "react"
import { Plus, MoreHorizontal, Edit, Trash2, Globe, RefreshCw, AlertCircle, Sparkles, Share2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { getPlatformIcon } from "@/utils/ui/icons"

import BrandModal from "./_components/BrandModal"
import ShareBrandModal from "./_components/ShareBrandModal"
import ConnectAccountsModal from "./_components/ConnectAccountsModal"
import BrandDetailsModal from "./_components/BrandDetailsModal"
import { MobileBrandCard, MobileBrandCardSkeleton } from "./_components/MobileBrandCard"

import type { BrandWithSocialAccounts, SocialAccount } from "@/types/brand"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch')
  }
  
  return data
}

function BrandRowSkeleton() {
  return (
    <TableRow className="hidden lg:table-row">
      <TableCell>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded" />
      </TableCell>
    </TableRow>
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
        <Button onClick={onRetry} variant="outline" className="gap-2 bg-transparent">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
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
  const [brandDetailsModal, setBrandDetailsModal] = useState<{
    open: boolean
    brand?: BrandWithSocialAccounts | null
  }>({ open: false, brand: null })

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

  const openDetailsModal = (brand: BrandWithSocialAccounts) => {
    setBrandDetailsModal({ open: true, brand })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">Brand Management</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">Your Brands</h1>
            <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
              Create and manage separate business profiles for each of your brands. Connect social accounts and share
              with team members.
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedBrand(null)
              setIsCreateModalOpen(true)
            }}
            className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-200 gap-2 h-11"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            <span>Create Brand</span>
          </Button>
        </div>
      </div>

      <Separator className="bg-border/50" />

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
          <Card className="hidden lg:block border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30 border-border/50">
                  <TableHead className="font-semibold text-foreground">Brand</TableHead>
                  <TableHead className="font-semibold text-foreground">Social Accounts</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
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
              <Card className="border-dashed border-border/50 bg-secondary/20">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="rounded-full bg-primary/10 p-4 mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">No brands yet</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                    Get started by creating your first brand profile to manage your social media presence
                  </p>
                  <Button onClick={() => setIsCreateModalOpen(true)} size="lg" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Brand
                  </Button>
                </CardContent>
              </Card>
            ) : (
              brands?.data?.map((brand: BrandWithSocialAccounts) => (
                <MobileBrandCard
                  key={brand.id}
                  brand={brand}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onConnect={openConnectModal}
                  onShare={openShareModal}
                  onDetails={openDetailsModal}
                />
              ))
            )}
          </div>

          {/* Desktop View: Table */}
          <Card className="hidden lg:block shadow-sm border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30 border-border/50">
                  <TableHead className="font-semibold text-foreground">Brand</TableHead>
                  <TableHead className="font-semibold text-foreground">Social Accounts</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-64">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-primary/10 p-4 mb-4">
                          <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-semibold text-xl mb-2">No brands yet</h3>
                        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                          Get started by creating your first brand profile to manage your social media presence
                        </p>
                        <Button onClick={() => setIsCreateModalOpen(true)} size="lg" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Create Your First Brand
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  brands?.data?.map((brand: BrandWithSocialAccounts) => (
                    <TableRow key={brand.id} className="hover:bg-secondary/20 transition-colors border-border/50">
                      {/* Brand */}
                      <TableCell>
                        <div
                          onClick={() => openDetailsModal(brand)}
                          className="flex items-center gap-4 cursor-pointer group"
                        >
                          <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-md rounded-lg group-hover:border-primary/40 transition-colors">
                            <AvatarImage src={brand.logo || "/placeholder.svg"} alt={brand.name} />
                            <AvatarFallback className="font-bold rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 text-primary">
                              {brand.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {brand.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">View details</p>
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
                                className="gap-1 p-2 bg-secondary/50 hover:bg-secondary/70 transition-colors"
                              >
                                {getPlatformIcon(account.platform, "!h-4 !w-4")}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openConnectModal(brand.id, brand.name)}
                            className="gap-2 text-muted-foreground hover:text-foreground"
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
                            {brand.isAdmin && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-secondary/50">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => setTimeout(() => openConnectModal(brand.id, brand.name), 0)}
                              className="gap-2 cursor-pointer"
                            >
                              <Globe className="h-4 w-4" />
                              Connect Accounts
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setTimeout(() => openShareModal(brand.id, brand.name), 0)}
                              className="gap-2 cursor-pointer"
                            >
                              <Share2 className="h-4 w-4" />
                              Share Brand
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTimeout(() => handleEdit(brand), 0)} className="gap-2 cursor-pointer">
                              <Edit className="h-4 w-4" />
                              Edit Brand
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setTimeout(() => handleDelete(brand.id), 0)}
                              className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
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
          brands?.data.find((b: BrandWithSocialAccounts) => b.id === connectAccountsModal.brandId)?.socialAccounts ?? []
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

      <BrandDetailsModal
        open={brandDetailsModal.open}
        onOpenChange={(open) => setBrandDetailsModal({ ...brandDetailsModal, open })}
        brand={brandDetailsModal?.brand || null}
        onSuccess={() => mutate()}
      />
    </div>
  )
}
