"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Loader from '@/components/layout/Loader';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <Loader />;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar/>
      <SidebarInset>
        <AppHeader/>
        <main className='p-5 lg:p-10'>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
