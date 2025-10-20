"use client";
import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { Button } from '../ui/button';
import ThemeToggle from '../features/ThemeToggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import GoogleTranslate from '../features/google-translate';
import { useHeaderFeatures } from "@/hooks/useHeaderFeatures";

import SearchBarDropdown from './SearchBarDropdown';
import UserProfileDropdown from './UserProfileDropdown';
import NotificationDropdown from './NotificationDropdown';

export default function AppHeader() {
  const pathname = usePathname();
  const { config } = useHeaderFeatures();

  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [activePage, setActivePage] = useState('Dashboard');

  const handlePathnameChange = useCallback(() => {
    if (pathname) {
      const parts = pathname.split('/').filter(Boolean);
      let pageName = parts[parts.length - 1] || 'dashboard';
      pageName = pageName
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      setActivePage(pageName);
    }
  }, [pathname]);

  // Close mobile search when route changes
  useEffect(() => {
    setMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    handlePathnameChange();
  }, [handlePathnameChange]);

  const handleMobileSearchOpen = () => {
    setMobileSearchOpen(true);
  };

  const handleMobileSearchClose = () => {
    setMobileSearchOpen(false);
  };

  return (
    <header className="w-full max-w-screen bg-background border-b-2 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 md:py-4">
        {/* Left Section - Includes Sidebar Trigger and Page Title */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Sidebar trigger on mobile */}
          <div className="lg:hidden">
            <SidebarTrigger />
          </div>

          {/* Page Title - Visible on medium to large screens */}
          <h1 className="hidden md:block font-bold text-xl lg:text-3xl text-foreground dark:text-white truncate max-w-[200px] lg:max-w-none">{activePage}</h1>
        </div>

        {/* Center Section - Desktop Search */}
        <div className="hidden lg:flex flex-1 max-w-2xl justify-center">
          {config?.headerSearchEnabled !== false && (
            <SearchBarDropdown 
              open={searchOpen} 
              onClose={() => setSearchOpen(false)}
            />
          )}
        </div>

        {/* Right Section - Utility Icons and User Menu */}
        <div className="flex items-center gap-2 md:gap-3 lg:gap-4 ml-auto">
          {/* Mobile Search Button */}
          {config?.headerSearchEnabled !== false && (
            <Button
              variant="ghost"
              size="icon"
              className="md:block lg:hidden"
              onClick={handleMobileSearchOpen}
            >
              <Search className="w-5 h-5" />
            </Button>
          )}

          {/* Notifications with dropdown */}
          {config?.headerNotificationsEnabled !== false && <NotificationDropdown />}
          {config?.headerThemeToggleEnabled !== false && <ThemeToggle />}
          {config?.headerLanguageEnabled !== false && <GoogleTranslate />}

          {/* User Menu */}
          <UserProfileDropdown />
        </div>
      </div>

      {/* Mobile Search Modal controlled by parent */}
      {config?.headerSearchEnabled !== false && mobileSearchOpen && (
        <SearchBarDropdown 
          open={mobileSearchOpen} 
          onClose={handleMobileSearchClose}
        />
      )}
    </header>
  );
}