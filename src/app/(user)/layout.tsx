import React from 'react';
import { redirect } from 'next/navigation';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        <AppSidebar/>
        <SidebarInset>
            {children}
        </SidebarInset>
    </SidebarProvider>
  )
}
