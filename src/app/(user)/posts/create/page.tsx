"use client";

import useSwr from "swr";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { 
  Wand2, 
  Share2, 
  ChevronRight, 
  ChevronLeft, 
  Building2,
  Users,
  FileText,
  Image as ImageIcon,
  Calendar,
  CheckCircle2,
  Link2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import type { Platform, SocialAccount, SocialAccountPage, Brand } from "@prisma/client";
import type { ScheduleData } from "@/types/scheduled-data";

import BrandsCard from "./_components/BrandsCard";
import MediaUpload from "./_components/MediaUpload";
import CaptionsCard from "./_components/CaptionsCard";
import AccountsCard from "./_components/AccountsCard";
import SchedulePostModal from "./_components/SchedulePostModal";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type SocialAccountWithPages = SocialAccount & {
  pages: SocialAccountPage[];
  brandId: string;
  brandName: string;
};

export default function CreatePostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading } = useSwr("/api/accounts", fetcher);
  const accounts: SocialAccountWithPages[] = data?.data || [];
  const brands: Brand[] = data?.brands || [];

  // Initialize from URL params
  const [activeStep, setActiveStep] = useState<number>(() => {
    const step = searchParams.get('step');
    return step ? parseInt(step, 10) : 0;
  });
  
  const [selectedBrandId, setSelectedBrandId] = useState<string>(() => {
    return searchParams.get('brand') || '';
  });
  
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(() => {
    const accounts = searchParams.get('accounts');
    return accounts ? accounts.split(',').filter(Boolean) : [];
  });
  
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(() => {
    const pages = searchParams.get('pages');
    return pages ? pages.split(',').filter(Boolean) : [];
  });

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

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (activeStep > 0) {
      params.set('step', activeStep.toString());
    }
    
    if (selectedBrandId) {
      params.set('brand', selectedBrandId);
    }
    
    if (selectedAccounts.length > 0) {
      params.set('accounts', selectedAccounts.join(','));
    }
    
    if (selectedPageIds.length > 0) {
      params.set('pages', selectedPageIds.join(','));
    }
    
    const newUrl = params.toString() 
      ? `/posts/create?${params.toString()}` 
      : '/posts/create';
    
    router.replace(newUrl, { scroll: false });
  }, [activeStep, selectedBrandId, selectedAccounts, selectedPageIds, router]);

  const brandAccounts = useMemo(() => {
    if (!selectedBrandId) return [] as SocialAccountWithPages[];
    return accounts.filter((account) => account.brandId === selectedBrandId);
  }, [accounts, selectedBrandId]);

  const selectedPlatforms = useMemo(() => {
    const platforms = new Set<Platform>();
    brandAccounts.forEach((account) => {
      if (selectedAccounts.includes(account.id)) {
        platforms.add(account.platform);
      }
    });

    if (selectedPageIds.length > 0) {
      brandAccounts.forEach((account) => {
        account.pages.forEach((page) => {
          if (selectedPageIds.includes(page.id)) {
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
        const [hh, mm] = schedule.startTime.split(":").map(Number);
        const y = schedule.startDate.getFullYear();
        const m = schedule.startDate.getMonth() + 1;
        const d = schedule.startDate.getDate();
        const startDateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const localSelected = new Date(y, m - 1, d, hh, mm, 0, 0);
        const tzOffsetAtSelected = localSelected.getTimezoneOffset();

        const plainSchedule = {
          ...schedule,
          startDate: startDateStr,
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

  const steps = [
    { 
      id: 0, 
      title: "Select Brand", 
      icon: Building2,
      description: "Choose your brand",
      isComplete: !!selectedBrandId 
    },
    { 
      id: 1, 
      title: "Choose Accounts", 
      icon: Users,
      description: "Select social accounts",
      isComplete: allSelectedItemsCount > 0,
      isDisabled: !selectedBrandId
    },
    { 
      id: 2, 
      title: "Create Content", 
      icon: FileText,
      description: "Write your captions",
      isComplete: Object.values(platformCaptions).some(c => c.trim() !== ""),
      isDisabled: !selectedBrandId || allSelectedItemsCount === 0
    },
    { 
      id: 3, 
      title: "Add Media", 
      icon: ImageIcon,
      description: "Upload images/videos",
      isComplete: uploadedFiles.length > 0,
      isDisabled: !selectedBrandId || allSelectedItemsCount === 0
    },
  ];

  const canGoNext = () => {
    if (activeStep === 0) return !!selectedBrandId;
    if (activeStep === 1) return allSelectedItemsCount > 0;
    return true;
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Wand2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Post</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Share your content across multiple platforms
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-10">
        <div className="flex items-center justify-between max-w-4xl">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeStep === index;
            const isPast = activeStep > index;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => !step.isDisabled && setActiveStep(index)}
                    disabled={step.isDisabled}
                    className={`
                      relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                      ${isActive ? 'border-primary bg-primary text-white shadow-lg scale-110' : ''}
                      ${isPast ? 'border-green-500 bg-green-500 text-white' : ''}
                      ${!isActive && !isPast ? 'border-gray-300 bg-white text-gray-400' : ''}
                      ${step.isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                    `}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </button>
                  <div className="mt-3 text-center">
                    <p className={`text-sm font-medium ${isActive ? 'text-primary' : isPast ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 mb-8 ${isPast ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Content Area */}
      <div className="max-w-6xl">
        {/* Step 0: Brand Selection */}
        {activeStep === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BrandsCard
              isLoading={isLoading}
              brands={brands}
              selectedBrandId={selectedBrandId}
              setSelectedBrandId={setSelectedBrandId}
            />
          </div>
        )}

        {/* Step 1: Account Selection */}
        {activeStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AccountsCard
              brandId={selectedBrandId}
              accounts={brandAccounts}
              selectedAccounts={selectedAccounts}
              setSelectedAccounts={setSelectedAccounts}
              selectedPageIds={selectedPageIds}
              setSelectedPageIds={setSelectedPageIds}
            />
          </div>
        )}

        {/* Step 2: Captions */}
        {activeStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CaptionsCard
              title={title}
              setTitle={setTitle}
              platformCaptions={platformCaptions}
              selectedPlatforms={selectedPlatforms}
              setPlatformCaptions={setPlatformCaptions}
            />
          </div>
        )}

        {/* Step 3: Media Upload */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MediaUpload onFilesChange={handleFilesChange} />
          </div>
        )}
      </div>

      {/* Fixed Bottom Navigation - Respects Sidebar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t shadow-lg z-40 md:left-[var(--sidebar-width)]">
        <div className="container max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Summary */}
            <div className="hidden md:flex items-center gap-4 text-sm text-white">
              <Badge variant="secondary" className="gap-1.5">
                <Building2 className="w-3 h-3" />
                {selectedBrandId ? brands.find(b => b.id === selectedBrandId)?.name : 'No brand'}
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Users className="w-3 h-3" />
                {allSelectedItemsCount} accounts
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <ImageIcon className="w-3 h-3" />
                {uploadedFiles.length} files
              </Badge>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 ml-auto">
              {/* Copy Link Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2 hidden sm:flex"
                title="Copy shareable link"
              >
                <Link2 className="w-4 h-4" />
                Copy Link
              </Button>

              <Button
                variant="outline"
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>

              {activeStep < steps.length - 1 ? (
                <Button
                  onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
                  disabled={!canGoNext()}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <SchedulePostModal 
                    onSubmit={() => handleSubmit({ isScheduled: true })} 
                    schedule={schedule} 
                    setSchedule={setSchedule} 
                  />
                  <Button
                    onClick={() => handleSubmit({ isScheduled: false })}
                    disabled={isPublishing || !allSelectedItemsCount}
                    className="gap-2 min-w-[140px]"
                  >
                    <Share2 className="w-4 h-4" />
                    {isPublishing ? "Publishing..." : "Publish Now"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
