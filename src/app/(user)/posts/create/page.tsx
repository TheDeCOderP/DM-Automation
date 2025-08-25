"use client";

import useSwr from "swr";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { Facebook, Globe, Instagram, Linkedin, Share2, Twitter } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import MediaUpload from "@/components/features/MediaUpload"
import CaptionsCard from "@/components/features/CaptionsCard"
import AccountsCard from "@/components/features/AccountsCard"

import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

import type { Platform, SocialAccount, Brand, PageToken } from "@prisma/client"
import type { ScheduleData } from "@/types/scheduled-data";
import BrandsCard from "@/components/features/BrandsCard"

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

// Update the type to match the actual data structure from API
type SocialAccountWithPageTokens = SocialAccount & {
  pageTokens: PageToken[]
  brandId: string
  brandName: string
}

export default function CreatePostPage() {
  const { data, isLoading } = useSwr("/api/accounts", fetcher)
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

  // State to manage the order of components.
  // We use a separate state variable to track if the client is ready.
  const [isClient, setIsClient] = useState(false);

  // Initialize layout with default values. This will be the layout on the server.
  const [leftColumnItems, setLeftColumnItems] = useState<string[]>(['accounts', 'captions']);
  const [rightColumnItems, setRightColumnItems] = useState<string[]>(['media']);

  // This useEffect will only run on the client, after hydration.
  useEffect(() => {
    setIsClient(true);
    const savedLeftLayout = localStorage.getItem('leftColumnLayout');
    const savedRightLayout = localStorage.getItem('rightColumnLayout');
    
    if (savedLeftLayout) {
      try {
        setLeftColumnItems(JSON.parse(savedLeftLayout));
      } catch (e) {
        console.error("Failed to parse left column layout from localStorage", e);
      }
    }
    if (savedRightLayout) {
      try {
        setRightColumnItems(JSON.parse(savedRightLayout));
      } catch (e) {
        console.error("Failed to parse right column layout from localStorage", e);
      }
    }
  }, []); 

  // Save the layout to local storage whenever it changes.
  // This useEffect only runs on the client.
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('leftColumnLayout', JSON.stringify(leftColumnItems));
    }
  }, [leftColumnItems, isClient]);
  
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('rightColumnLayout', JSON.stringify(rightColumnItems));
    }
  }, [rightColumnItems, isClient]);

  const brandAccounts = useMemo(() => {
    if (!selectedBrandId) return []
    return accounts.filter((account) => account.brandId === selectedBrandId)
  }, [accounts, selectedBrandId])

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files)
  }

  const selectedPlatforms = useMemo(() => {
    const platforms = new Set<Platform>()

    brandAccounts.forEach((account) => {
      if (selectedAccounts.includes(account.id)) {
        platforms.add(account.platform)
      }
    })

    if (selectedPageTokenIds.length > 0) {
      platforms.add("FACEBOOK")
    }

    return Array.from(platforms)
  }, [brandAccounts, selectedAccounts, selectedPageTokenIds])

  const handleSubmit = async ({ isScheduled = true }: { isScheduled: boolean }) => {
    if (!selectedBrandId) {
      toast.error("Please select a brand first")
      return
    } else if (selectedAccounts.length === 0 && selectedPageTokenIds.length === 0) {
      toast.error("Please select at least one account or page")
      return
    } else if (uploadedFiles.length === 0 && Object.values(platformCaptions).every(caption => caption.trim() === "")) {
      toast.error("Please upload at least one file or enter captions")
      return
    }

    setIsPublishing(true)
    try {
      const formData = new FormData()

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

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    if (source.droppableId === 'left-column' && destination.droppableId === 'left-column') {
      const newLeftColumnItems = Array.from(leftColumnItems);
      const [reorderedItem] = newLeftColumnItems.splice(source.index, 1);
      newLeftColumnItems.splice(destination.index, 0, reorderedItem);
      setLeftColumnItems(newLeftColumnItems);
      return;
    }

    if (source.droppableId === 'right-column' && destination.droppableId === 'right-column') {
      const newRightColumnItems = Array.from(rightColumnItems);
      const [reorderedItem] = newRightColumnItems.splice(source.index, 1);
      newRightColumnItems.splice(destination.index, 0, reorderedItem);
      setRightColumnItems(newRightColumnItems);
      return;
    }

    if (source.droppableId !== destination.droppableId) {
      const sourceList = source.droppableId === 'left-column' ? leftColumnItems : rightColumnItems;
      const destinationList = destination.droppableId === 'left-column' ? leftColumnItems : rightColumnItems;
      const sourceSetState = source.droppableId === 'left-column' ? setLeftColumnItems : setRightColumnItems;
      const destinationSetState = destination.droppableId === 'left-column' ? setLeftColumnItems : setRightColumnItems;

      const newSourceList = Array.from(sourceList);
      const newDestinationList = Array.from(destinationList);
      const [movedItem] = newSourceList.splice(source.index, 1);
      newDestinationList.splice(destination.index, 0, movedItem);

      sourceSetState(newSourceList);
      destinationSetState(newDestinationList);
    }
  };


  const renderComponent = (item: string) => {
    switch (item) {
      case 'accounts':
        return <AccountsCard
          accounts={brandAccounts}
          selectedAccounts={selectedAccounts}
          setSelectedAccounts={setSelectedAccounts}
          selectedPageTokenIds={selectedPageTokenIds}
          setSelectedPageTokenIds={setSelectedPageTokenIds}
        />;
      case 'captions':
        return <CaptionsCard
          platformCaptions={platformCaptions}
          selectedPlatforms={selectedPlatforms}
          setPlatformCaptions={setPlatformCaptions}
        />;
      case 'media':
        return <MediaUpload onFilesChange={handleFilesChange} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 relative">
        <div className="flex items-center gap-4 mb-2">
          <div className="relative">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Create Post
            </h1>
            <p className="text-muted-foreground text-lg">Create a new post</p>
          </div>
        </div>
        <div className="fixed right-0 bottom-0 p-6 z-[100]">
          <Button
            className="z-50"
            disabled={isPublishing || !allSelectedItemsCount}
            onClick={() => handleSubmit({ isScheduled: false })}
            variant={"default"}
            size="lg"
          >
            <Share2 className="mr-2 w-4 h-4" /> {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <BrandsCard
          isLoading={isLoading}
          brands={brands}
          selectedBrandId={selectedBrandId}
          setSelectedBrandId={setSelectedBrandId}
        />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <ResizablePanelGroup direction="horizontal" className="min-h-[400px] mt-6 rounded-lg border">

          {/* Left Column */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <Droppable droppableId="left-column">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex h-full flex-col gap-6 p-4"
                >
                  {leftColumnItems.map((item, index) => (
                    <Draggable key={item} draggableId={item} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          {renderComponent(item)}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Column */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <Droppable droppableId="right-column">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex h-full flex-col gap-6 p-4"
                >
                  {rightColumnItems.map((item, index) => (
                    <Draggable key={item} draggableId={item} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          {renderComponent(item)}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </ResizablePanel>
        </ResizablePanelGroup>
      </DragDropContext>
    </>
  )
}