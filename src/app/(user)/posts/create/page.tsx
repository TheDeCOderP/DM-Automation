"use client"

import useSwr from "swr"
import * as React from "react"
import { useState } from "react"
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react"
import { toast } from "sonner"

import MediaUpload from "@/components/features/MediaUpload"
import CaptionsCard from "@/components/features/CaptionsCard"
import AccountsCard from "@/components/features/AccountsCard"
import SchedulePostModal from "@/components/modals/SchedulePostModal"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { Platform, SocialAccount, Brand, PageToken } from "@prisma/client"
import type { ScheduleData } from "@/types/scheduled-data"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface SocialPlatform {
  id: Platform
  name: string
  icon: React.ElementType
  wordLimit: number
}

const socialMediaPlatforms: SocialPlatform[] = [
  { id: "FACEBOOK", name: "Facebook", icon: Facebook, wordLimit: 63206 },
  { id: "INSTAGRAM", name: "Instagram", icon: Instagram, wordLimit: 2200 },
  { id: "LINKEDIN", name: "LinkedIn", icon: Linkedin, wordLimit: 3000 },
  { id: "TWITTER", name: "Twitter", icon: Twitter, wordLimit: 280 },
]

type SocialAccountWithPageTokens = SocialAccount & {
  pageTokens: PageToken[]
}

export default function CreatePostPage() {
  const { data } = useSwr("/api/accounts", fetcher)
  const accounts: SocialAccountWithPageTokens[] = data?.data || []
  const brands: Brand[] = data?.brands || []

  const [selectedBrandId, setSelectedBrandId] = useState<string>("")

  const [schedule, setSchedule] = useState<ScheduleData>({
    startDate: new Date(),
    startTime: "12:00",
    frequency: "daily",
    customExpression: "",
  })

  const [platformCaptions, setPlatformCaptions] = useState<{ [key: string]: string }>(() => {
    const initialCaptions: { [key: string]: string } = {}
    socialMediaPlatforms.forEach((platform) => {
      initialCaptions[platform.id] = ""
    })
    return initialCaptions
  })

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isPublishing, setIsPublishing] = useState<boolean>(false)

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedPageTokenIds, setSelectedPageTokenIds] = useState<string[]>([])

  const brandAccounts = React.useMemo(() => {
    if (!selectedBrandId) return []
    return accounts.filter((account) => account.brandId === selectedBrandId)
  }, [accounts, selectedBrandId])

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files)
  }

  const selectedPlatforms = React.useMemo(() => {
    const platforms = new Set<Platform>()

    // Add platforms from selected accounts
    brandAccounts.forEach((account) => {
      if (selectedAccounts.includes(account.id)) {
        platforms.add(account.platform)
      }
    })

    // Add Facebook if any page tokens are selected
    if (selectedPageTokenIds.length > 0) {
      platforms.add("FACEBOOK")
    }

    return Array.from(platforms)
  }, [brandAccounts, selectedAccounts, selectedPageTokenIds])

  const handleSubmit = async ({ isScheduled = true }: { isScheduled: boolean }) => {
    if (!selectedBrandId) {
      toast.error("Please select a brand first")
      return
    }

    setIsPublishing(true)
    try {
      const formData = new FormData()

      // Add files to FormData
      uploadedFiles.forEach((file) => {
        formData.append(`files`, file)
      })

      formData.append("brandId", selectedBrandId)
      formData.append("accounts", JSON.stringify(selectedAccounts))
      formData.append("pageTokenIds", JSON.stringify(selectedPageTokenIds))
      formData.append("captions", JSON.stringify(platformCaptions))

      if (isScheduled) {
        formData.append("schedule", JSON.stringify(schedule))
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Post created successfully:", data)
      toast.success("Post Created Successfully")
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error("Failed to create post")
    } finally {
      setIsPublishing(false)
    }
  }

  const allSelectedItemsCount = selectedAccounts.length + selectedPageTokenIds.length

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Create New Post</h1>

        <div className="flex gap-2">
          <SchedulePostModal
            onSubmit={() => handleSubmit({ isScheduled: true })}
            schedule={schedule}
            setSchedule={setSchedule}
          />
          <Button
            disabled={isPublishing || allSelectedItemsCount === 0 || !selectedBrandId}
            onClick={() => handleSubmit({ isScheduled: false })}
            variant={"default"}
            size="lg"
          >
            Publish Now
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Brand</label>
        <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Choose a brand..." />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <MediaUpload onFilesChange={handleFilesChange} />
          <AccountsCard
            accounts={brandAccounts}
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
            selectedPageTokenIds={selectedPageTokenIds}
            setSelectedPageTokenIds={setSelectedPageTokenIds}
          />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <CaptionsCard
            platformCaptions={platformCaptions}
            selectedPlatforms={selectedPlatforms}
            setPlatformCaptions={setPlatformCaptions}
          />
        </div>
      </div>
    </>
  )
}
