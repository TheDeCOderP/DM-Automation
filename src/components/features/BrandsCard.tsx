"use client"
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Brand } from '@prisma/client'

interface BrandsCardProps {
  brands: Brand[];
  selectedBrandId?: string;
  setSelectedBrandId: (id: string) => void;
}

export default function BrandsCard({ brands, selectedBrandId, setSelectedBrandId }: BrandsCardProps) {
  return (
    <>
      <Label className="block text-sm font-medium mb-2"> <strong className="mr-2 text-xl">Step 1:</strong>Select Brand</Label>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center size-6 rounded-full bg-black text-white text-xs font-bold">
              {brands.length}
            </span>
            <h2 className="text-lg font-semibold">Brands</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={selectedBrandId} 
            onValueChange={setSelectedBrandId}
            className="flex flex-wrap gap-4"
          >
            {brands.map((brand) => (
              <div key={brand.id} className="flex items-center">
                <RadioGroupItem 
                  value={brand.id} 
                  id={brand.id}
                  className="peer sr-only" // Hide the default radio button
                />
                <label 
                  htmlFor={brand.id} 
                  className="flex items-center cursor-pointer p-3 rounded-lg border-2 border-transparent hover:border-gray-200 peer-data-[state=checked]:border-blue-400 peer-data-[state=checked]:bg-blue-50 transition-colors"
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
        </CardContent>
      </Card>
    </>
  )
}