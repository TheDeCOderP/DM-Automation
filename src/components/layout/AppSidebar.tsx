"use client";

import Link from "next/link";
import Image from "next/image";
import * as React from "react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { CircleFadingPlus, Sparkles, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/hooks/useSidebar";
import { useSidebarSettings } from "@/hooks/useSidebarSettings";
import type { SidebarGroup as Group, SidebarItem } from "@prisma/client";
import { ScrollArea } from "../ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface SidebarGroupWithItems extends Group {
  items: SidebarItem[];
}

// Utility: map DB icon string -> Lucide component
const getIcon = (iconName: string | null | undefined): LucideIcon => {
  if (!iconName) return LucideIcons.Circle;

  const key = (iconName.charAt(0).toUpperCase() + iconName.slice(1)) as keyof typeof LucideIcons;
  const Icon = LucideIcons[key];

  // Ensure it's actually a LucideIcon, not e.g. createLucideIcon
  return (Icon as LucideIcon) ?? LucideIcons.Circle;
};

export default function AppSidebar({ siteName, logoUrl }: { siteName?: string | null; logoUrl?: string | null }) {
  const { sidebar, isLoading: isLoadingSidebar } = useSidebar();
  const pathname = usePathname();
  const base = React.useMemo(() => pathname.split("/")[1] || "", [pathname]);

  const { settings } = useSidebarSettings();

  // derive UI from settings
  const showTitles = settings?.showGroupTitles !== false;
  const menuButtonSize = (settings?.compact ? "sm" : "default") as "sm" | "default";
  const iconSizeClass = React.useMemo(() => {
    const s = settings?.iconSize ?? "MD";
    if (s === "SM") return "size-3";
    if (s === "LG") return "size-5";
    return "size-4";
  }, [settings]);

  const groupGapStyle = React.useMemo(() => {
    if (!settings) return undefined;
    if (settings.spacingPx != null && !Number.isNaN(settings.spacingPx)) {
      return { gap: `${settings.spacingPx}px` } as React.CSSProperties;
    }
    const preset = settings.spacingPreset;
    const px = preset === "NONE" ? 0 : preset === "SM" ? 8 : preset === "LG" ? 16 : 12; // MD default 12
    return { gap: `${px}px` } as React.CSSProperties;
  }, [settings]);

  // simple accordion handling
  const [openGroups, setOpenGroups] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!settings || !sidebar) return;
    const ids = sidebar.map((g: Group) => g.id).filter(Boolean);
    if (settings.accordionMode === "NONE") {
      setOpenGroups(ids);
      return;
    }
    
    // Check if defaultOpenGroupIds is an array of strings before using it
    const defaultOpenGroupIds = Array.isArray(settings.defaultOpenGroupIds)
      ? settings.defaultOpenGroupIds.filter((id): id is string => typeof id === 'string')
      : [];

    if (settings.accordionMode === "SINGLE") {
      const initial = defaultOpenGroupIds[0] ?? ids[0];
      setOpenGroups(initial ? [initial] : []);
      return;
    }
    // MULTI
    const initialMulti = defaultOpenGroupIds.length > 0 ? defaultOpenGroupIds : ids;
    setOpenGroups(initialMulti);
  }, [settings, sidebar]);

  const isGroupOpen = React.useCallback(
    (id: string) => {
      if (!settings) return true;
      if (settings.accordionMode === "NONE") return true;
      return openGroups.includes(id);
    },
    [settings, openGroups]
  );

  const toggleGroup = React.useCallback(
    (id: string) => {
      if (!settings || settings.accordionMode === "NONE") return;
      if (settings.accordionMode === "SINGLE") {
        setOpenGroups((cur) => (cur.includes(id) ? cur : [id]));
        return;
      }
      // MULTI
      setOpenGroups((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    },
    [settings]
  );

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" className="z-20 border-r bg-gradient-to-b from-background to-muted/5">
        <SidebarHeader className="flex flex-col items-center justify-center relative px-4 py-5 border-b border-border/50 bg-gradient-to-r from-background to-muted/10">
          {/* Expanded State */}
          <div className="group-data-[state=collapsed]:hidden flex flex-col items-center justify-center w-full space-y-3 transition-all duration-300">
            {/* Logo Section */}
            <div className="flex items-center justify-center w-full relative">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${siteName} Logo`}
                  className="contain transition-all duration-300 dark:brightness-0 dark:invert hover:scale-105"
                  width={140}
                  height={45}
                  style={{
                    opacity: 1,
                    transform: 'scale(1)',
                  }}
                />
              ) : (
                <Image
                  src="/icons/logo.png"
                  alt="Default Logo"
                  className="contain transition-all duration-300 dark:brightness-0 dark:invert hover:scale-105"
                  width={140}
                  height={45}
                  style={{
                    opacity: 1,
                    transform: 'scale(1)',
                  }}
                />
              )}
            </div>

            {/* Site Name */}
            <div className="text-center space-y-1">
              <h1 className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                {siteName}
              </h1>
            DM Automation
            </div>
          </div>

          {/* Collapsed State */}
          <div className="group-data-[state=expanded]:hidden absolute inset-0 flex items-center justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={`${siteName} Logo`}
                      className="contain dark:brightness-0 dark:invert hover:scale-110 transition-transform"
                      width={36}
                      height={36}
                    />
                  ) : (
                    <Image
                      src="/icons/logo.png"
                      alt="Default Logo"
                      className="contain dark:brightness-0 dark:invert hover:scale-110 transition-transform"
                      width={36}
                      height={36}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{siteName}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Sidebar Trigger */}
          <SidebarTrigger className="h-7 w-7 rounded-full absolute z-50 top-6 -right-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg border transition-all duration-300 hover:scale-110" />
        </SidebarHeader>

        {/* Buttons */}
        <div className="p-4 flex flex-col gap-2 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/posts/create">
                <Button className="w-full group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:p-0 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95">
                  <CircleFadingPlus className="size-4 group-data-[collapsible=icon]:size-5" />
                  <span className="ml-2 group-data-[collapsible=icon]:sr-only font-medium">Create a Post</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="group-data-[collapsible=icon]:block hidden">
              Create a Post
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/blogs/create">
                <Button className="w-full group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:p-0 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95">
                  <Pen className="size-4 group-data-[collapsible=icon]:size-5" />
                  <span className="ml-2 group-data-[collapsible=icon]:sr-only font-medium">Write a Blog</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="group-data-[collapsible=icon]:block hidden">
              Write a Blog
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation Groups */}
        <SidebarContent className="flex-1 overflow-y-auto px-3 group-data-[collapsible=icon]:px-0" style={groupGapStyle}>
          <ScrollArea className="h-full w-full pr-2">
            {isLoadingSidebar ? (
              <div className="space-y-6 px-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-4 w-28 rounded-full mx-auto" />
                    <div className="space-y-2">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="flex items-center gap-3 px-2">
                          <Skeleton className="h-5 w-5 rounded-full" />
                          <Skeleton className="h-4 flex-1 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : sidebar?.length > 0 ? (
              sidebar.map((group: SidebarGroupWithItems) => (
                <SidebarGroup key={group.id} className="group/sidebar-group">
                  {group.title === "Site Settings" ? (
                    <SidebarGroupLabel
                      asChild
                      className={`uppercase text-xs font-semibold text-muted-foreground tracking-wider group-data-[collapsible=icon]:hidden ${!showTitles ? "hidden" : ""} px-2 py-2 hover:bg-accent/50 rounded-lg transition-colors`}
                    >
                      <Link href={`/${base}/site-settings`}>
                        {group.title}
                      </Link>
                    </SidebarGroupLabel>
                  ) : (
                    <SidebarGroupLabel
                      className={`cursor-pointer uppercase text-xs font-semibold text-muted-foreground tracking-wider group-data-[collapsible=icon]:hidden ${!showTitles ? "hidden" : ""} px-2 py-2 hover:bg-accent/50 rounded-lg transition-colors flex items-center justify-between`}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <span className="truncate">{group.title}</span>
                      <LucideIcons.ChevronDown
                        className={`h-3 w-3 transition-transform duration-300 flex-shrink-0 ${
                          isGroupOpen(group.id) ? "rotate-180 text-primary" : "text-muted-foreground/60"
                        }`}
                      />
                    </SidebarGroupLabel>
                  )}
                  
                  {isGroupOpen(group.id) && (
                    <SidebarGroupContent className="mt-1">
                      <SidebarMenu className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center space-y-0.5">
                        {group.items.map((item) => {
                          const Icon = getIcon(item.icon);
                          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                          
                          return (
                            <SidebarMenuItem key={item.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SidebarMenuButton 
                                    asChild 
                                    size={menuButtonSize}
                                    isActive={isActive}
                                    className="relative group/menubutton transition-all duration-200 hover:bg-accent/80 hover:scale-105 hover:shadow-sm"
                                  >
                                    <Link href={item.href}>
                                      <Icon className={`${iconSizeClass} transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover/menubutton:text-foreground'}`} />
                                      <span className="group-data-[collapsible=icon]:sr-only font-medium">
                                        {item.label}
                                      </span>
                                      
                                      {/* Active indicator */}
                                      {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                                      )}
                                    </Link>
                                  </SidebarMenuButton>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="group-data-[collapsible=icon]:block hidden">
                                  <p className="font-medium">{item.label}</p>
                                </TooltipContent>
                              </Tooltip>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <LucideIcons.Menu className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">No menu items</p>
                <p className="text-muted-foreground/70 text-xs mt-1">Configure your sidebar in settings</p>
              </div>
            )}
          </ScrollArea>
        </SidebarContent>

        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  );
}