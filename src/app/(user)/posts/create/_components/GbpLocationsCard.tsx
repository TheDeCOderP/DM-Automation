"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Building2, MapPin } from "lucide-react"
import type { GbpLocation } from "@prisma/client"

interface GbpLocationsCardProps {
  locations: GbpLocation[]
  selectedLocationIds: string[]
  onLocationChange: (locationId: string, checked: boolean) => void
  selectedCount: number
  platformUserId?: string
}

export default function GbpLocationsCard({
  locations,
  selectedLocationIds,
  onLocationChange,
  selectedCount,
  platformUserId,
}: GbpLocationsCardProps) {
  const isLocationSelected = (locationId: string) => selectedLocationIds.includes(locationId)

  const handleSelectAll = () => {
    locations.forEach((location) => {
      if (!isLocationSelected(location.id)) {
        onLocationChange(location.id, true)
      }
    })
  }

  const handleDeselectAll = () => {
    locations.forEach((location) => {
      if (isLocationSelected(location.id)) {
        onLocationChange(location.id, false)
      }
    })
  }

  if (locations.length === 0 && !platformUserId) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="flex items-center justify-center size-6 rounded-full bg-blue-600 text-white text-xs font-bold">
            {locations.length}
          </span>
          <h2 className="text-lg font-semibold">Google Business Locations</h2>
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{selectedCount} selected</span>
          {locations.length > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={selectedCount === locations.length}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeselectAll} disabled={selectedCount === 0}>
                Deselect All
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {locations.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {locations.map((location) => (
              <div key={location.id} className="flex items-center gap-3 rounded-lg border p-3">
                <Checkbox
                  id={location.id}
                  checked={isLocationSelected(location.id)}
                  onCheckedChange={(checked) => onLocationChange(location.id, checked as boolean)}
                />
                <Avatar className="size-10 bg-blue-50">
                  <AvatarFallback className="bg-blue-50 text-blue-700">
                    <Building2 className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Label htmlFor={location.id} className="cursor-pointer text-sm font-semibold">
                    {location.title}
                  </Label>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="size-3" />
                    {location.storeCode || "Primary location"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : platformUserId ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No Google Business locations found for this brand yet.</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Connect a Google Business Profile account to choose a location.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
