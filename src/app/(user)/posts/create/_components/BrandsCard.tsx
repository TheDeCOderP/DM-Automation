"use client"

import React from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
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
    <>
      <Label className="block text-sm font-medium"> 
        <strong className="mr-2 text-xl">Step 1:</strong>Select Brand
      </Label>
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 pb-3">
          {isLoading ? (
            <Skeleton className="size-6 rounded-full" />
          ) : (
            <span className="flex items-center justify-center size-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">
              {brands.length}
            </span>
          )}
          <h2 className="text-lg font-semibold">Brands</h2>
        </div>
        <div>
          {isLoading ? (
            // Skeleton loading state with horizontal layout
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex-shrink-0">
                  <div className="flex items-center p-3 rounded-lg border-2 border-transparent">
                    <Skeleton className="mr-3 w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Actual content with horizontal scrolling
            <RadioGroup 
              value={selectedBrandId} 
              onValueChange={setSelectedBrandId}
              className="flex gap-4 overflow-x-auto pb-2"
            >
              {brands.map((brand) => (
                <div key={brand.id} className="flex-shrink-0">
                  <RadioGroupItem 
                    value={brand.id} 
                    id={brand.id}
                    className="peer sr-only"
                  />
                  <label 
                    htmlFor={brand.id} 
                    className="flex items-center cursor-pointer p-3 rounded-lg border-2 border-transparent hover:border-border peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-accent transition-colors"
                  >
                    <Avatar className="mr-3 w-8 h-8">
                      <AvatarImage 
                        className="w-full h-full rounded-full object-cover"
                        src={brand?.logo ?? ''} 
                      />
                      <AvatarFallback className="rounded-full text-lg font-medium">
                        {brand.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{brand.name}</span>
                  </label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
      </div>
    </>
  )
}