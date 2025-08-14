"use client"
import useSWR from "swr"
import { useState } from "react"
import { format } from "date-fns"
import { Plus, MoreHorizontal, Edit, Trash2, Settings, Globe, RefreshCw, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { CreateBrandModal } from "@/components/modals/CreateBrandModal";
import { ConnectAccountsModal } from "@/components/modals/ConnectAccountsModal";
import type { Brand, SocialAccount } from "@prisma/client"
import { getPlatformIcon } from "@/utils/ui/icons"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface BrandWithSocialAccounts extends Brand {
  socialAccounts: SocialAccount[]
}

function BrandRowSkeleton() {
  return (
    <TableRow>
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

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/20">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Failed to load brands</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          We couldn`&apos;t fetch your brands. This might be due to a network issue or server problem.
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [connectAccountsModal, setConnectAccountsModal] = useState<{
    open: boolean
    brandId?: string
    brandName?: string
  }>({ open: false })

  const handleRetry = () => {
    mutate()
  }

  const openConnectModal = (brandId: string, brandName: string) => {
    setConnectAccountsModal({ open: true, brandId, brandName })
  }

  console.log(brands)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">
            Create separate business profiles for each of your brands. Used for grouping your social accounts.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Brand
        </Button>
      </div>

      {/* Content */}
      {error ? (
        <ErrorState onRetry={handleRetry} />
      ) : isLoading ? (
        <div className="border rounded-lg overflow-hidden">
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
                <BrandRowSkeleton key={i} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm">
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
                          {brand?.socialAccounts.map((account: SocialAccount) => (
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
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Brand
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
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
        </div>
      )}

      <CreateBrandModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
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
