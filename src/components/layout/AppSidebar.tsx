import * as React from "react"
import { ArrowLeft, Calendar, LayoutDashboard, Users, Bell, Settings, Plus, Infinity, CheckCircle, User, LogOut } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"

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
      url: "#",
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

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props} collapsible="icon">
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

      <SidebarFooter className="p-2">
        {/* User Profile */}
        <div className="flex items-center p-2 bg-white rounded-md group-data-[collapsible=icon]:hidden">
          <Avatar className="size-8">
            <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Hasan Cagli" />
            <AvatarFallback>HC</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-sm">
            <span className="font-semibold">Hasan Cagli</span>
            <span className="text-xs text-gray-600">hasancaglivideo@gmail.com</span>
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
