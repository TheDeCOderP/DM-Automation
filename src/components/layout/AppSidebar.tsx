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
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/hooks/useSidebar";
import { useSidebarSettings } from "@/hooks/useSidebarSettings";
import type { SidebarGroup as Group, SidebarItem } from "@prisma/client";
import { SidebarSettings } from "@prisma/client";
import { ScrollArea } from "../ui/scroll-area";

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
    const px = preset === "NONE" ? 0 : preset === "SM" ? 4 : preset === "LG" ? 12 : 8; // MD default 8
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
    <Sidebar collapsible="icon" className="z-20">
      <SidebarHeader className="flex flex-col items-center justify-center relative px-4 py-4 border-b w-full text-center">
        {/* Logo Section */}
        <div className="flex items-center justify-center w-full relative">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${siteName} Logo`}
              className="contain transition-all duration-300 dark:brightness-0 dark:invert"
              width={160}
              height={50}
              style={{
                opacity: 1,
                transform: 'scale(1)',
              }}
            />
          ) : (
            <Image
              src="/icons/logo.png"
              alt="Default Logo"
              className="contain transition-all duration-300 dark:brightness-0 dark:invert"
              width={160}
              height={50}
              style={{
                opacity: 1,
                transform: 'scale(1)',
              }}
            />
          )}
        </div>

        {/* Site Name - Only visible when expanded */}
        <div className="group-data-[state=collapsed]:hidden transition-all duration-300">
          <h1 className="font-semibold text-lg mb-1">{siteName}</h1>
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <Link
              href="https://prabisha.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline transition-colors"
            >
              Prabisha Consulting
            </Link>
          </p>
        </div>

        {/* Collapsed State - Show only logo */}
        <div className="group-data-[state=expanded]:hidden absolute inset-0 flex items-center justify-center">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${siteName} Logo`}
              className="contain dark:brightness-0 dark:invert"
              width={40}
              height={40}
            />
          ) : (
            <Image
              src="/icons/logo.png"
              alt="Default Logo"
              className="contain dark:brightness-0 dark:invert"
              width={40}
              height={40}
            />
          )}
        </div>

        {/* Sidebar Trigger */}
        <SidebarTrigger className="h-7 w-7 rounded-full absolute z-50 top-6 -right-4 bg-primary text-primary-foreground hover:bg-primary/90" />
      </SidebarHeader>

      <div className="p-4 group-data-[collapsible=icon]:px-1.5 ">
        <Link href="/posts/create">
          <Button className="w-full group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:p-0">
            <Plus className="size-4 group-data-[collapsible=icon]:size-5" />
            <span className="ml-2 group-data-[collapsible=icon]:sr-only">Create Post</span>
          </Button>
        </Link>
      </div>

      <SidebarContent className="flex-1 overflow-y-auto px-2 group-data-[collapsible=icon]:px-0 " style={groupGapStyle}>
        <ScrollArea className="h-full w-full">
          {isLoadingSidebar ? (
            <div className="space-y-4 px-2">
              {/* Fake groups */}
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" /> {/* group label */}
                  <div className="space-y-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full" /> {/* icon */}
                        <Skeleton className="h-3 w-28" /> {/* text */}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : sidebar?.length > 0 ? (
            sidebar.map((group: SidebarGroupWithItems) => (
              <SidebarGroup key={group.id}>
                {group.title === "Site Settings" ? (
                  <SidebarGroupLabel
                    asChild
                    className={`uppercase text-xs font-bold text-muted-foreground group-data-[collapsible=icon]:hidden ${!showTitles ? "hidden" : ""}`}
                  >
                    <Link href={`/${base}/site-settings`}>{group.title}</Link>
                  </SidebarGroupLabel>
                ) : (
                  <SidebarGroupLabel
                    className={`cursor-pointer uppercase text-xs font-bold text-muted-foreground group-data-[collapsible=icon]:hidden ${!showTitles ? "hidden" : ""}`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      {group.title}
                      <LucideIcons.ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isGroupOpen(group.id) ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </SidebarGroupLabel>
                )}
                {isGroupOpen(group.id) && (
                  <SidebarGroupContent>
                    <SidebarMenu className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center">
                      {group.items.map((item) => {
                        const Icon = getIcon(item.icon);
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton asChild size={menuButtonSize}>
                              <Link href={item.href}>
                                <Icon className={iconSizeClass} />
                                <span className="group-data-[collapsible=icon]:sr-only">
                                  {item.label}
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </SidebarGroup>
            ))
          ) : (
            <p className="text-muted-foreground text-sm px-2">No menu found</p>
          )}
        </ScrollArea>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
