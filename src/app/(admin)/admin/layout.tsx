import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from "@/lib/prisma";

import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const config = await prisma.siteConfig.findFirst();
  const siteName = config?.siteName;

  if (!session || !session.user) {
    redirect('/login');
  }

  return (
    <SidebarProvider>
      <AppSidebar siteName={siteName} />
      <SidebarInset>
        <AppHeader user={session.user} />
        <div>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}