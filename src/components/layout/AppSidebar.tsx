import Link from "next/link";
import Image from "next/image";
import * as React from "react";
import { Calendar, Users, Bell, Settings, Plus, LogOut } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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

// Sample data for navigation
const navigation = {
  main: [
    {
      title: "Calendar",
      icon: Calendar,
      url: "/posts/calendar",
    },
  ],
  configuration: [
    {
      title: "Accounts",
      icon: Users,
      url: "/accounts",
    },
  ],
  activity: [
    {
      title: "Notifications",
      icon: Bell,
      url: "#",
    },
  ],
  management: [
    {
      title: "Settings",
      icon: Settings,
      url: "#",
    },
  ],
}

interface AppSidebarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-between p-4 relative">
        <div className="flex items-center gap-2">
          <Image
            src="/icons/logo.png"
            alt="Prabisha's Logo"
            className="size-6"
            width={24}
            height={24}
          />
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            DM Automation
          </span>
        </div>
        {/* SidebarTrigger for collapsing the sidebar */}
        <SidebarTrigger className="h-7 w-7 rounded-full absolute z-50 top-4 -right-4 bg-gray-800 text-white hover:bg-gray-700" />
      </SidebarHeader>

      <div className="p-4 group-data-[collapsible=icon]:px-2">
        <Link href="/posts/create">
          <Button className="w-full bg-black text-white hover:bg-gray-800 group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:p-0">
            <Plus className="size-4 group-data-[collapsible=icon]:size-5" />
            <span className="ml-2 group-data-[collapsible=icon]:sr-only">Create Post</span>
          </Button>
        </Link>
      </div>

      <SidebarContent className="flex-1 overflow-y-auto px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs font-bold text-gray-500 group-data-[collapsible=icon]:hidden">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.main.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      <span className="group-data-[collapsible=icon]:sr-only">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configuration Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs font-bold text-gray-500 group-data-[collapsible=icon]:hidden">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.configuration.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      <span className="group-data-[collapsible=icon]:sr-only">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Activity Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs font-bold text-gray-500 group-data-[collapsible=icon]:hidden">
            Activity
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.activity.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      <span className="group-data-[collapsible=icon]:sr-only">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs font-bold text-gray-500 group-data-[collapsible=icon]:hidden">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.management.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      <span className="group-data-[collapsible=icon]:sr-only">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* User Profile */}
        <div className="flex items-center p-2 bg-white rounded-md group-data-[collapsible=icon]:hidden">
          <Avatar className="size-8">
            <AvatarImage src={user?.image ?? ''} alt={user?.name ?? ''} />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-sm">
            <span className="font-semibold">{user.name}</span>
            <span className="text-xs text-gray-600">{user.email}</span>
          </div>
        </div>

        {/* Sign Out */}
        <div className="p-2 group-data-[collapsible=icon]:hidden">
          <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 mt-2">
            <LogOut className="size-4" />
            <span className="ml-2">Sign Out</span>
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
