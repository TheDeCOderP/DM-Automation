"use client"

import { toast } from "sonner"
import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, X } from "lucide-react"
import Image from "next/image"
import { Brand } from "@prisma/client"

interface BrandModalProps {
  brand?: Brand | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (brand: Brand) => void
}

export default function BrandModal({ open, onOpenChange, onSuccess, brand }: BrandModalProps) {
  const isEditMode = !!brand
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    logo: null as File | null
  })

  // Prefill form for editing
  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
        description: brand.description || "",
        website: brand.website || "",
        logo: null
      })
      setLogoPreview(brand.logo || null)
    } else {
      setFormData({ name: "", description: "", website: "", logo: null })
      setLogoPreview(null)
    }
  }, [brand])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, logo: file })
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const removeImage = () => {
    setFormData({ ...formData, logo: null })
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formPayload = new FormData()
      formPayload.append("name", formData.name)
      formPayload.append("description", formData.description)
      formPayload.append("website", formData.website)
      if (formData.logo) {
        formPayload.append("logo", formData.logo)
      }

      const response = await fetch(
        isEditMode ? `/api/brands/${brand?.id}` : "/api/brands",
        {
          method: isEditMode ? "PUT" : "POST",
          body: formPayload
        }
      )

      if (!response.ok) {
        throw new Error(isEditMode ? "Failed to update brand" : "Failed to create brand")
      }

      const savedBrand = await response.json()

      toast.success(
        isEditMode
          ? `${formData.name} has been updated.`
          : `${formData.name} has been added to your brands.`
      )

      onSuccess?.(savedBrand)
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving brand:", error)
      toast.error(
        isEditMode
          ? "There was an error updating your brand."
          : "There was an error creating your brand."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Brand" : "Create New Brand"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Brand Logo</Label>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-md border border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <>
                    <Image
                      fill
                      src={logoPreview}
                      alt="Brand logo preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-1 right-1 bg-gray-800/80 text-white rounded-full p-1 hover:bg-gray-700/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <ImagePlus className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoPreview ? "Change Logo" : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended size: 500x500px
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Brand Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter brand name"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of your brand"
              rows={3}
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-black text-white hover:bg-gray-800"
              disabled={isLoading || !formData.name}
            >
              {isLoading
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update Brand"
                : "Create Brand"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
