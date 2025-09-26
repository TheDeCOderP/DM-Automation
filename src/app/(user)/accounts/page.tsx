"use client"

import useSWR from "swr"
import { toast } from "sonner"
import { useState } from "react"
import { format } from "date-fns"
import { Plus, MoreHorizontal, Edit, Trash2, Globe, RefreshCw, AlertCircle, CircleUserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator" 

import { getPlatformIcon } from "@/utils/ui/icons"
import { BrandModal } from "@/components/modals/BrandModal"
import { ConnectAccountsModal } from "@/components/modals/ConnectAccountsModal"

import type { Brand, SocialAccount } from "@prisma/client"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface BrandWithSocialAccounts extends Brand {
  socialAccounts: SocialAccount[]
}

function BrandRowSkeleton() {
  return (
    <TableRow className="hidden lg:table-row">
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded" />
      </TableCell>
    </TableRow>
  )
}

function MobileBrandCardSkeleton() {
  return (
    <Card className="p-4 space-y-3 lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Skeleton className="h-8 w-full" />
    </Card>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/20">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center px-6">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Failed to load brands</h3>
        <p className="text-muted-foreground mb-4 max-w-sm text-sm">
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

function MobileBrandCard({ brand, onEdit, onDelete, onConnect }: {
  brand: BrandWithSocialAccounts,
  onEdit: (brand: BrandWithSocialAccounts) => void,
  onDelete: (id: string) => void,
  onConnect: (brandId: string, brandName: string) => void
}) {
  return (
    <Card className="p-4 lg:hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={brand.logo || "/placeholder.svg"} alt={brand.name} />
            <AvatarFallback className="text-sm font-medium">
              {brand.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">{brand.name}</span>
            <span className="text-xs text-muted-foreground">
              Created: {format(new Date(brand.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onConnect(brand.id, brand.name)}>
              <Globe className="h-4 w-4 mr-2" />
              Connect Accounts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(brand)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Brand
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(brand.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Brand
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator />

      <div className="space-y-2">
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-4">Social Accounts:</h4>
          {brand.socialAccounts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {brand.socialAccounts.map((account: SocialAccount) => (
                <div
                  key={account.id}
                  className="flex items-center gap-1 bg-muted/50 rounded-full pl-2 pr-3 py-1"
                >
                  {getPlatformIcon(account.platform)}
                  <span className="text-xs font-medium truncate max-w-[100px]">{account.platformUsername}</span>
                </div>
              ))}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConnect(brand.id, brand.name)}
              className="gap-2 w-full mt-1"
            >
              <Plus className="h-4 w-4" />
              Connect Social Accounts
            </Button>
          )}
        </div>
      </div>
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

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 lg:mb-8">
        <div className="flex items-start gap-4 mb-4 sm:mb-0">
          <CircleUserRound className="h-8 w-8 text-primary mt-1 shrink-0" />
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent leading-snug">
              Brands
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg mt-1">
              Create separate business profiles for each of your brands.
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setSelectedBrand(null);
            setIsCreateModalOpen(true)
          }}
          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Brand
        </Button>
      </div>

      <Separator className="my-6 lg:my-8" />

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
          <div className="border rounded-lg overflow-hidden hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead style={{ width: "35%" }}>Social Accounts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <BrandRowSkeleton key={`desktop-skeleton-${i}`} />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="space-y-4 lg:hidden">
            {brands?.data?.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full bg-muted p-3 mb-2">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold">No brands yet</h3>
                  <p className="text-muted-foreground text-sm">Get started by creating your first brand</p>
                  <Button onClick={() => setIsCreateModalOpen(true)} className="mt-2" size="sm">
                    Create Brand
                  </Button>
                </div>
              </div>
            ) : (
              brands?.data.map((brand: BrandWithSocialAccounts) => (
                <MobileBrandCard
                  key={brand.id}
                  brand={brand}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onConnect={openConnectModal}
                />
              ))
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden lg:block border rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Brand</TableHead>
                  <TableHead className="font-semibold">Domain</TableHead>
                  <TableHead style={{ width: "35%" }} className="font-semibold">
                    Social Accounts
                  </TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <div className="rounded-full bg-muted p-3 mb-2">
                          <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold">No brands yet</h3>
                        <p className="text-muted-foreground text-sm">Get started by creating your first brand</p>
                        <Button onClick={() => setIsCreateModalOpen(true)} className="mt-2" size="sm">
                          Create Brand
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  brands?.data.map((brand: BrandWithSocialAccounts) => (
                    <TableRow key={brand.id} className="hover:bg-muted/30 transition-colors">
                      {/* Brand */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage src={brand.logo || "/placeholder.svg"} alt={brand.name} />
                            <AvatarFallback className="text-sm font-medium">
                              {brand.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{brand.name}</span>
                        </div>
                      </TableCell>

                      {/* Domain */}
                      <TableCell className="text-sm text-muted-foreground">
                        {brand.website ? (
                          <a
                            href={brand.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors underline decoration-dotted"
                          >
                            {brand.website}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Social Accounts */}
                      <TableCell>
                        {brand.socialAccounts.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-3">
                            {brand.socialAccounts.map((account: SocialAccount) => (
                              <div
                                key={account.id}
                                className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1"
                              >
                                {getPlatformIcon(account.platform)}
                                <span className="text-xs font-medium">{account.platformUsername}</span>
                              </div>
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

                      {/* Created */}
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(brand.createdAt), "MMM d, yyyy")}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openConnectModal(brand.id, brand.name)}>
                              <Globe className="h-4 w-4 mr-2" />
                              Connect Accounts
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(brand)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Brand
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(brand.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Brand
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )))
                }
              </TableBody>
            </Table>
          </div>
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
    </>
  )
}