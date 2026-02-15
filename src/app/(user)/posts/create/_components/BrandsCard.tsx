"use client"

import React from 'react'
import { Building2, CheckCircle2 } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Brand } from '@prisma/client'

interface BrandsCardProps {
  brands: Brand[];
  selectedBrandId?: string;
  setSelectedBrandId: (id: string) => void;
  isLoading?: boolean;
}

export default function BrandsCard({ 
  brands, 
  selectedBrandId, 
  setSelectedBrandId, 
  isLoading = false 
}: BrandsCardProps) {
  return (
    <Card className="border-2">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Select Your Brand</CardTitle>
            <CardDescription className="text-sm mt-1">
              Choose the brand you want to post from
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-xl border-2">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <RadioGroup 
            value={selectedBrandId} 
            onValueChange={setSelectedBrandId}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {brands.map((brand) => (
              <div key={brand.id} className="relative">
                <RadioGroupItem 
                  value={brand.id} 
                  id={brand.id}
                  className="peer sr-only"
                />
                <label 
                  htmlFor={brand.id} 
                  className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 border-gray-200 hover:border-primary/50 hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all group"
                >
                  <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                    <AvatarImage 
                      className="w-full h-full rounded-full object-cover"
                      src={brand?.logo ?? ''} 
                    />
                    <AvatarFallback className="rounded-full text-lg font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                      {brand.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{brand.name}</p>
                    <p className="text-xs text-muted-foreground">Brand Account</p>
                  </div>
                  {selectedBrandId === brand.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </label>
              </div>
            ))}
          </RadioGroup>
        )}
        
        {!isLoading && brands.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No brands available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}