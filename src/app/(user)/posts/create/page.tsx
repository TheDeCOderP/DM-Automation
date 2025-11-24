"use client";

import useSwr from "swr";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightToLine, Globe, LayoutDashboard, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

import type { Platform, SocialAccount, SocialAccountPage, Brand } from "@prisma/client";
import type { ScheduleData } from "@/types/scheduled-data";

import BrandsCard from "./_components/BrandsCard";
import MediaUpload from "./_components/MediaUpload";
import CaptionsCard from "./_components/CaptionsCard";
import AccountsCard from "./_components/AccountsCard";
import SchedulePostModal from "./_components/SchedulePostModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Types aligned with API response
type SocialAccountWithPages = SocialAccount & {
  pages: SocialAccountPage[];
  brandId: string;
  brandName: string;
};

type LayoutMode = "wizard" | "advanced";

export default function CreatePostPage() {
  const router = useRouter();
  const { data, isLoading } = useSwr("/api/accounts", fetcher);
  const accounts: SocialAccountWithPages[] = data?.data || [];
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
    timezoneOffset: new Date().getTimezoneOffset()
  });

  const [title, setTitle] = useState<string>("");
  const [platformCaptions, setPlatformCaptions] = useState<{ [key: string]: string }>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

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
    if (!selectedBrandId) return [] as SocialAccountWithPages[];
    return accounts.filter((account) => account.brandId === selectedBrandId);
  }, [accounts, selectedBrandId]);

  const selectedPlatforms = useMemo(() => {
    const platforms = new Set<Platform>();
    // Add platforms from selected regular accounts
    brandAccounts.forEach((account) => {
      if (selectedAccounts.includes(account.id)) {
        platforms.add(account.platform);
      }
    });

    // Add platforms from selected pages
    if (selectedPageIds.length > 0) {
      brandAccounts.forEach((account) => {
        account.pages.forEach((page) => {
          console.log("page", page);
          if (selectedPageIds.includes(page.id)) {
            console.log(page);
            platforms.add(page.platform);
          }
        });
      });
    }

    return Array.from(platforms);
  }, [brandAccounts, selectedAccounts, selectedPageIds]);

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleSubmit = async ({ isScheduled = false }: { isScheduled: boolean }) => {
    if (!selectedBrandId) {
      toast.error("Please select a brand first");
      return;
    } else if (selectedAccounts.length === 0 && selectedPageIds.length === 0) {
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
      
      formData.append("title", title);
      formData.append("brandId", selectedBrandId);
      formData.append("accounts", JSON.stringify(selectedAccounts));
      formData.append("socialAccountPageIds", JSON.stringify(selectedPageIds));
      formData.append("captions", JSON.stringify(platformCaptions));

      if (isScheduled) {
        // Compute timezone offset at the selected local date/time (handles DST correctly)
        const [hh, mm] = schedule.startTime.split(":").map(Number);
        // Build YYYY-MM-DD from local date parts to avoid UTC shifting
        const y = schedule.startDate.getFullYear();
        const m = schedule.startDate.getMonth() + 1;
        const d = schedule.startDate.getDate();
        const startDateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const localSelected = new Date(y, m - 1, d, hh, mm, 0, 0); // local time
        const tzOffsetAtSelected = localSelected.getTimezoneOffset(); // minutes to add to local to get UTC

        const plainSchedule = {
          ...schedule,
          startDate: startDateStr, // only date in local calendar
          timezoneOffset: tzOffsetAtSelected,
        };
        formData.append("schedule", JSON.stringify(plainSchedule));
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      toast.success("Post Created Successfully");
      router.push(`/posts/success`);
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
    } finally {
      setIsPublishing(false);
    }
  };

  const allSelectedItemsCount = selectedAccounts.length + selectedPageIds.length;

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
            brandId={selectedBrandId}
            accounts={brandAccounts}
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
            selectedPageIds={selectedPageIds}
            setSelectedPageIds={setSelectedPageIds}
          />
        );
      case "captions":
        return (
          <CaptionsCard
            title={title}
            setTitle={setTitle}
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
  const wizardTabs = ["brand", "accounts", "content"] as const;
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
        <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                value="content"
                disabled={!selectedBrandId || (selectedAccounts.length === 0 && selectedPageIds.length === 0)}
              >
                3. Content
              </TabsTrigger>
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
              <AccountsCard
                brandId={selectedBrandId}
                accounts={brandAccounts}
                selectedAccounts={selectedAccounts}
                setSelectedAccounts={setSelectedAccounts}
                selectedPageIds={selectedPageIds}
                setSelectedPageIds={setSelectedPageIds}
              />
            </TabsContent>

            <TabsContent value="content">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-0">

                {/* Left: Captions */}
                <div className="lg:col-span-7 space-y-6">
                  <CaptionsCard
                    title={title}
                    setTitle={setTitle}
                    platformCaptions={platformCaptions}
                    selectedPlatforms={selectedPlatforms}
                    setPlatformCaptions={setPlatformCaptions}
                  />
                </div>

                {/* Right: Media Upload */}
                <div className="lg:col-span-5 space-y-6">
                  <MediaUpload
                    onFilesChange={handleFilesChange}
                  />
                </div>

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
        <div className="max-w-6xl mx-auto lg:px-12 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground hidden md:block">
            {selectedBrandId ? `Brand selected` : `No brand selected`} • {allSelectedItemsCount} account/page selected • {uploadedFiles.length} file(s)
          </div>
          <div className="flex items-center justify-between gap-2 w-full">
            <SchedulePostModal onSubmit={() => handleSubmit({ isScheduled: true })} schedule={schedule} setSchedule={setSchedule} />
            <Button
              className="min-w-[120px] z-50"
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