"use client"

import useSWR from "swr"
import { toast } from "sonner"
import { useState } from "react"
import { Plus, MoreHorizontal, Edit, Trash2, Globe, RefreshCw, AlertCircle, CircleUserRound, Share2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { getPlatformIcon } from "@/utils/ui/icons"

import BrandModal from "./_components/BrandModal";
import ShareBrandModal from "./_components/ShareBrandModal";
import ConnectAccountsModal from "./_components/ConnectAccountsModal";
import BrandDetailsModal from "./_components/BrandDetailsModal";
import { MobileBrandCard, MobileBrandCardSkeleton } from "./_components/MobileBrandCard";

import type { SocialAccount } from "@prisma/client";
import type { BrandWithSocialAccounts } from "@/types/brand";

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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
                  onDetails={openDetailsModal}
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
                        <div onClick={() => openDetailsModal(brand)} className="flex items-center gap-3 cursor-pointer">
                          <Avatar className="h-10 w-10 border-2 shadow-sm rounded-lg">
                            <AvatarImage src={brand.logo || "/placeholder.svg"} alt={brand.name} />
                            <AvatarFallback className="font-bold rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                              {brand.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{brand.name}</p>
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
                            {brand.isAdmin && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openConnectModal(brand.id, brand.name)}>
                              <Globe className="h-4 w-4 mr-2" />
                              Connect Accounts
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openShareModal(brand.id, brand.name)}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share Brand
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(brand)}>
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

      <BrandDetailsModal
        open={brandDetailsModal.open}
        onOpenChange={(open) => setBrandDetailsModal({ ...brandDetailsModal, open })}
        brand={brandDetailsModal?.brand || null}
        onSuccess={() => mutate()}
      />
    </div>
  )
}