'use client';
import Link from "next/link";
import Image from "next/image";
import * as React from "react";
import { Calendar, Users, Bell, Plus, ChartNoAxesCombined } from 'lucide-react';

import { Button } from "@/components/ui/button"
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

// Sample data for navigation
const navigation = {
  main: [
    {
      title: "Calendar",
      icon: Calendar,
      url: "/posts/calendar",
    }
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
      url: "/notifications",
    },
  ],
  management: [
    {
      title: "Analytics",
      icon: ChartNoAxesCombined,
      url: "/analytics",
    }
  ],
}

export default function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="z-20">
      <SidebarHeader className="flex items-center justify-between relative px-4 py-6 border-b-2 z-50">
        <div className="flex items-center gap-2">
          <Image
            src="/icons/logo.png"
            alt="Prabisha's Logo"
            className="size-6 group-data-[collapsible=icon]:hidden"
            width={24}
            height={24}
          />
          <h1 className="text-lg font-semibold">
            DM <span className="group-data-[collapsible=icon]:hidden"> Automation v2.0 </span>
          </h1>
        </div>
        <span className="text-sm group-data-[collapsible=icon]:hidden"> 
          Powered by 
          <Link 
            href="https://prabisha.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 ml-1"
          > 
            Prabisha Consulting 
          </Link>
        </span>
        {/* SidebarTrigger for collapsing the sidebar */}
        <SidebarTrigger className="h-7 w-7 rounded-full absolute z-50 top-6 -right-4 bg-primary text-primary-foreground hover:bg-primary/90" />
      </SidebarHeader>

      <div className="p-4 group-data-[collapsible=icon]:px-2 ">
        <Link href="/posts/create">
          <Button className="w-full group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:p-0">
            <Plus className="size-4 group-data-[collapsible=icon]:size-5" />
            <span className="ml-2 group-data-[collapsible=icon]:sr-only">Create Post</span>
          </Button>
        </Link>
      </div>

      <SidebarContent className="flex-1 overflow-y-auto px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs font-bold text-muted-foreground group-data-[collapsible=icon]:hidden">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center">
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
          <SidebarGroupLabel className="uppercase text-xs font-bold text-muted-foreground group-data-[collapsible=icon]:hidden">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center">
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
          <SidebarGroupLabel className="uppercase text-xs font-bold text-muted-foreground group-data-[collapsible=icon]:hidden">
            Activity
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center">
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
          <SidebarGroupLabel className="uppercase text-xs font-bold text-muted-foreground group-data-[collapsible=icon]:hidden">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center">
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
      <SidebarRail />
    </Sidebar>
  )
}