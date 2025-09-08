import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

import { authOptions } from '@/lib/auth';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  } else if(session.user.role !== "ADMIN") {
    redirect('/');
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
