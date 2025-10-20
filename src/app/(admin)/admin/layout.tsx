import React, { Suspense } from 'react';
import { prisma } from "@/lib/prisma";

import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const config = await prisma.siteConfig.findFirst();
  const siteName = config?.siteName;


  return (
    <Suspense fallback={null}>
      <SidebarProvider>
        <AppSidebar siteName={siteName} />
        <SidebarInset>
          <AppHeader />
          <div>{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  );
}