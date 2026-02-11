import { format } from 'date-fns';
import { Plus, MoreHorizontal, Edit, Trash2, Globe, Share2, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { BrandWithSocialAccounts } from '@/types/brand';

import { getPlatformIcon } from '@/utils/ui/icons';

export function MobileBrandCard({
  brand,
  onEdit,
  onDelete,
  onConnect,
  onShare,
  onDetails
}: {
  brand: BrandWithSocialAccounts
  onEdit: (brand: BrandWithSocialAccounts) => void
  onDelete: (id: string) => void
  onConnect: (brandId: string, brandName: string) => void
  onShare: (brandId: string, brandName: string) => void
  onDetails: (brand: BrandWithSocialAccounts) => void
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
              <DropdownMenuItem onClick={() => onDetails(brand)}>
                <Info className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {brand.isAdmin && (
                <>
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
                </>
              )}
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
              {brand.socialAccounts.map((account) => (
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

export function MobileBrandCardSkeleton() {
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