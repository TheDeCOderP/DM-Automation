import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppHeader from '@/components/layout/AppHeader';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session || !session.user) {
    redirect('/login');
  }


  return (
    <SidebarProvider>
      <AppSidebar/>
      <SidebarInset>
        <AppHeader user={session?.user}/>
        <main className='p-10'>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
