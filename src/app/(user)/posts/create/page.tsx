"use client";

import useSwr from "swr";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightToLine, Globe, LayoutDashboard, Share2 } from "lucide-react";

import MediaUpload from "@/components/features/MediaUpload";
import CaptionsCard from "@/components/features/CaptionsCard";
import AccountsCard from "@/components/features/AccountsCard";
import BrandsCard from "@/components/features/BrandsCard";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

import type { Platform, SocialAccount, Brand, PageToken } from "@prisma/client";
import type { ScheduleData } from "@/types/scheduled-data";
import SchedulePostModal from "@/components/modals/SchedulePostModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Types aligned with API response
type SocialAccountWithPageTokens = SocialAccount & {
  pageTokens: PageToken[];
  brandId: string;
  brandName: string;
};

type LayoutMode = "wizard" | "advanced";

export default function CreatePostPage() {
  const { data, isLoading } = useSwr("/api/accounts", fetcher);
  const accounts: SocialAccountWithPageTokens[] = data?.data || [];
  const brands: Brand[] = data?.brands || [];

  // Mode: wizard or advanced
  const [mode, setMode] = useState<"wizard" | "advanced">("wizard");

  // Wizard state
  const [activeTab, setActiveTab] = useState<string>("brand");

  // Core page states
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [schedule, setSchedule] = useState<ScheduleData>({
    startDate: new Date(),
    startTime: "12:00",
    frequency: "daily",
    customExpression: "",
  });

  const [platformCaptions, setPlatformCaptions] = useState<{ [key: string]: string }>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedPageTokenIds, setSelectedPageTokenIds] = useState<string[]>([]);

  // Advanced layout state (drag/drop + persistence)
  const [isClient, setIsClient] = useState(false);
  const [leftColumnItems, setLeftColumnItems] = useState<string[]>(["accounts", "captions"]);
  const [rightColumnItems, setRightColumnItems] = useState<string[]>(["media"]);

  useEffect(() => {
    setIsClient(true);
    try {
      const savedLeftLayout = localStorage.getItem("leftColumnLayout");
      const savedRightLayout = localStorage.getItem("rightColumnLayout");
      if (savedLeftLayout) setLeftColumnItems(JSON.parse(savedLeftLayout));
      if (savedRightLayout) setRightColumnItems(JSON.parse(savedRightLayout));
    } catch (e) {
      console.error("Failed to load layout from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (isClient) localStorage.setItem("leftColumnLayout", JSON.stringify(leftColumnItems));
  }, [leftColumnItems, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem("rightColumnLayout", JSON.stringify(rightColumnItems));
  }, [rightColumnItems, isClient]);

  const brandAccounts = useMemo(() => {
    if (!selectedBrandId) return [] as SocialAccountWithPageTokens[];
    return accounts.filter((account) => account.brandId === selectedBrandId);
  }, [accounts, selectedBrandId]);

  const selectedPlatforms = useMemo(() => {
    const platforms = new Set<Platform>();

    brandAccounts.forEach((account) => {
      if (selectedAccounts.includes(account.id)) {
        platforms.add(account.platform);
      }
    });

    if (selectedPageTokenIds.length > 0) {
      platforms.add("FACEBOOK");
    }

    return Array.from(platforms);
  }, [brandAccounts, selectedAccounts, selectedPageTokenIds]);

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleSubmit = async ({ isScheduled = false }: { isScheduled: boolean }) => {
    if (!selectedBrandId) {
      toast.error("Please select a brand first");
      return;
    } else if (selectedAccounts.length === 0 && selectedPageTokenIds.length === 0) {
      toast.error("Please select at least one account or page");
      return;
    } else if (
      uploadedFiles.length === 0 &&
      Object.values(platformCaptions).every((caption) => caption.trim() === "")
    ) {
      toast.error("Please upload at least one file or enter captions");
      return;
    }

    setIsPublishing(true);
    try {
      const formData = new FormData();

      uploadedFiles.forEach((file) => {
        formData.append(`files`, file);
      });

      formData.append("brandId", selectedBrandId);
      formData.append("accounts", JSON.stringify(selectedAccounts));
      formData.append("pageTokenIds", JSON.stringify(selectedPageTokenIds));
      formData.append("captions", JSON.stringify(platformCaptions));

      if (isScheduled) {
        formData.append("schedule", JSON.stringify(schedule));
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Post created successfully:", responseData);
      toast.success("Post Created Successfully");
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
    } finally {
      setIsPublishing(false);
    }
  };

  const allSelectedItemsCount = selectedAccounts.length + selectedPageTokenIds.length;

  // Drag-and-drop handlers (advanced mode)
  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    if (source.droppableId === "left-column" && destination.droppableId === "left-column") {
      const newLeftColumnItems = Array.from(leftColumnItems);
      const [reorderedItem] = newLeftColumnItems.splice(source.index, 1);
      newLeftColumnItems.splice(destination.index, 0, reorderedItem);
      setLeftColumnItems(newLeftColumnItems);
      return;
    }

    if (source.droppableId === "right-column" && destination.droppableId === "right-column") {
      const newRightColumnItems = Array.from(rightColumnItems);
      const [reorderedItem] = newRightColumnItems.splice(source.index, 1);
      newRightColumnItems.splice(destination.index, 0, reorderedItem);
      setRightColumnItems(newRightColumnItems);
      return;
    }

    if (source.droppableId !== destination.droppableId) {
      const sourceList = source.droppableId === "left-column" ? leftColumnItems : rightColumnItems;
      const destinationList = destination.droppableId === "left-column" ? leftColumnItems : rightColumnItems;
      const sourceSetState = source.droppableId === "left-column" ? setLeftColumnItems : setRightColumnItems;
      const destinationSetState = destination.droppableId === "left-column" ? setLeftColumnItems : setRightColumnItems;

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
      case "accounts":
        return (
          <AccountsCard
            accounts={brandAccounts}
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
            selectedPageTokenIds={selectedPageTokenIds}
            setSelectedPageTokenIds={setSelectedPageTokenIds}
          />
        );
      case "captions":
        return (
          <CaptionsCard
            platformCaptions={platformCaptions}
            selectedPlatforms={selectedPlatforms}
            setPlatformCaptions={setPlatformCaptions}
          />
        );
      case "media":
        return <MediaUpload onFilesChange={handleFilesChange} />;
      default:
        return null;
    }
  };

  // Wizard tabs list
  const wizardTabs = ["brand", "accounts", "captions", "media"] as const;
  type WizardTab = typeof wizardTabs[number];

  const nextWizardTab = () => {
    const idx = wizardTabs.indexOf(activeTab as WizardTab);
    if (idx < wizardTabs.length - 1) setActiveTab(wizardTabs[idx + 1]);
  };
  const prevWizardTab = () => {
    const idx = wizardTabs.indexOf(activeTab as WizardTab);
    if (idx > 0) setActiveTab(wizardTabs[idx - 1]);
  };

  return (
    <>
      {/* Mode toggle */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as LayoutMode)} className="w-full">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-2">
          <Globe className="h-9 w-9 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Create Post
          </h1>
        </div>

        {/* Subheading + Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-muted-foreground">
            Choose Wizard or Advanced layout
          </p>
          <TabsList className="flex-shrink-0 w-full max-w-sm justify-start overflow-x-auto">
            <TabsTrigger value="wizard"> 
              <ArrowRightToLine className="mr-2 w-4 h-4" />
              Wizard
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <LayoutDashboard className="mr-2 w-4 h-4" />
              Advanced
            </TabsTrigger>
          </TabsList>
        </div>

        <Separator className="my-4" />

        {/* Wizard Mode */}
        <TabsContent value="wizard" className="mt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="brand">1. Brand</TabsTrigger>
              <TabsTrigger value="accounts" disabled={!selectedBrandId}>2. Accounts</TabsTrigger>
              <TabsTrigger
                value="captions"
                disabled={!selectedBrandId || (selectedAccounts.length === 0 && selectedPageTokenIds.length === 0)}
              >
                3. Captions
              </TabsTrigger>
              <TabsTrigger value="media">4. Media</TabsTrigger>
            </TabsList>

            <Separator className="my-4" />

            <TabsContent value="brand" className="mt-0">
              <div className="max-w-5xl mx-auto">
                <BrandsCard
                  isLoading={isLoading}
                  brands={brands}
                  selectedBrandId={selectedBrandId}
                  setSelectedBrandId={setSelectedBrandId}
                />
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="mt-0">
              <div className="max-w-5xl mx-auto">
                <AccountsCard
                  accounts={brandAccounts}
                  selectedAccounts={selectedAccounts}
                  setSelectedAccounts={setSelectedAccounts}
                  selectedPageTokenIds={selectedPageTokenIds}
                  setSelectedPageTokenIds={setSelectedPageTokenIds}
                />
              </div>
            </TabsContent>

            <TabsContent value="captions" className="mt-0">
              <div className="max-w-4xl mx-auto">
                <CaptionsCard
                  platformCaptions={platformCaptions}
                  selectedPlatforms={selectedPlatforms}
                  setPlatformCaptions={setPlatformCaptions}
                />
              </div>
            </TabsContent>

            <TabsContent value="media" className="mt-0">
              <div className="max-w-6xl mx-auto">
                <MediaUpload onFilesChange={handleFilesChange} />
              </div>
            </TabsContent>
          </Tabs>

          {/* Wizard navigation */}
          <div className="my-4 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={prevWizardTab} disabled={activeTab === "brand"}>
              Back
            </Button>
            <Button variant="secondary" onClick={nextWizardTab} disabled={activeTab === "media"}>
              Next
            </Button>
          </div>
        </TabsContent>

        {/* Advanced Mode */}
        <TabsContent value="advanced" className="mt-0">
          <div className="flex flex-col gap-6 max-w-6xl mx-auto">
            <BrandsCard
              isLoading={isLoading}
              brands={brands}
              selectedBrandId={selectedBrandId}
              setSelectedBrandId={setSelectedBrandId}
            />

            <DragDropContext onDragEnd={onDragEnd}>
              <ResizablePanelGroup direction="horizontal" className="min-h-[400px]">
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Sticky action bar (shared) */}
      <div className="sticky bottom-0 left-0 right-0 bg-background/80 backdrop-blur border-t">
        <div className="max-w-6xl mx-auto px-12 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {selectedBrandId ? `Brand selected` : `No brand selected`} • {allSelectedItemsCount} account/page selected • {uploadedFiles.length} file(s)
          </div>
          <div className="flex items-center gap-2">
            <SchedulePostModal onSubmit={() => handleSubmit({ isScheduled: true })} schedule={schedule} setSchedule={setSchedule} />
            <Button
              className="min-w-[120px]"
              disabled={isPublishing || !allSelectedItemsCount}
              onClick={() => handleSubmit({ isScheduled: false })}
              size="sm"
            >
              <Share2 className="mr-2 w-4 h-4" /> {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}