import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default async function UserLayout({ children }: { children: React.ReactNode }) {
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
