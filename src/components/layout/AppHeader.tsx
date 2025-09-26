"use client";
import useSWR from 'swr';
import { toast } from 'sonner';
import { debounce } from 'lodash';
import { signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useRef, useState } from 'react';
import { Bell, Search, LogOut, X, Users, Calendar, ChartNoAxesCombined, User } from 'lucide-react';

import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ThemeToggle from '../features/ThemeToggle';
import GoogleTranslate from '../features/google-translate';
import Microphone from '../features/microphone';
import { useHeaderFeatures } from "@/hooks/useHeaderFeatures";

import { NotificationType } from '@prisma/client';
import { Notification } from '@/types/notification';

interface AppHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

interface SearchResult {
  posts: Array<{
    id: string;
    content: string;
    platform: string;
    status: string;
    createdAt: Date;
  }>;
  media: Array<{
    id: string;
    url: string;
    type: string;
    createdAt: Date;
  }>;
  brands: Array<{
    id: string;
    name: string;
    description?: string;
    logo?: string;
    website?: string;
  }>;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { config } = useHeaderFeatures();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePage, setActivePage] = useState('Dashboard');
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [microphoneTranscript, setMicrophoneTranscript] = useState<string[]>([]);
  
  // SWR for notifications
  const { data: notificationData, mutate: mutateNotifications, error, isLoading } = useSWR<{
    success: boolean;
    data: Notification[];
  }>(config?.headerNotificationsEnabled !== false ? `/api/notifications?status=unread` : null, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: true,
    errorRetryInterval: 5000,
  });

  // SWR for search results
  const { data: searchResults, mutate: mutateSearch } = useSWR<{
    success: boolean;
    data: SearchResult;
  }>(searchQuery && config?.headerSearchEnabled !== false ? `/api/search?query=${encodeURIComponent(searchQuery)}&limit=5` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const notifications = notificationData?.data || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim()) {
        mutateSearch();
      }
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    // For desktop, focus remains on the input
    if (searchInputRef.current && !searchOpen) {
      searchInputRef.current.focus();
    }
  };

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

  React.useEffect(() => {
    handlePathnameChange();
  }, [handlePathnameChange]);

  React.useEffect(() => {
    if (microphoneTranscript.length > 0) {
      setSearchQuery(microphoneTranscript[microphoneTranscript.length - 1]);
      setMicrophoneTranscript([]);
      // Trigger search dropdown open on desktop if a transcript comes through
      if (!searchOpen && window.innerWidth >= 768) { // 768px is the 'md' breakpoint
          setSearchOpen(true);
      }
    }
  }, [microphoneTranscript, searchOpen]);

  React.useEffect(() => {
    if (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    }
  }, [error]);

  const handleLogout = () => {
    setLogoutOpen(true);
  };

  const handleMarkAllAsRead = async () => {
    if (config?.headerNotificationsEnabled === false) return;
    
    setIsSubmitting(true);
    try {
      await Promise.all(
        notifications.map(({ id }) =>
          fetch(`/api/notifications/${id}`, { method: 'PUT' })
        )
      );
      mutateNotifications();
      toast.success('Notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
      console.error('Failed to mark notifications as read:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToResult = (type: string, id: string) => {
    switch (type) {
      case 'post':
        router.push(`/posts/${id}`);
        break;
      case 'media':
        router.push(`/media/${id}`);
        break;
      case 'brand':
        router.push(`/brands/${id}`);
        break;
      default:
        break;
    }
    setSearchQuery('');
    setSearchOpen(false);
  };

  const getDashboard = (user: { role?: { name: string } | null } | null) => {
    switch (user?.role?.name) {
      case 'SUPERADMIN':
        return '/super-admin/site-settings';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/user/dashboard';
    }
  };

  if (!user) {
    return (
      <header className="w-full backdrop-blur-lg bg-background/80 border-b">
        <div className="flex items-center justify-between px-4 lg:px-6 py-4">
          <Skeleton className="w-full h-10 rounded-md" />
        </div>
      </header>
    );
  }

  return (
    <header className="w-full max-w-screen bg-background border-b-2 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 md:py-4">
        {/* Left Section - Includes Sidebar Trigger and Page Title */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Sidebar trigger on mobile */}
          <div className="lg:hidden">
            <SidebarTrigger />
          </div>

          {/* Page Title - Visible on medium to large screens (md:block and lg:block are now combined) */}
          {/* On smaller screens (e.g., tablet landscape and up), show the title if search isn't open */}
          <h1 className="hidden md:block font-bold text-xl lg:text-3xl text-foreground dark:text-white truncate max-w-[200px] lg:max-w-none">{activePage}</h1>
        </div>

        {/* Center Section - Search Bar (Desktop only) or Placeholder for spacing */}
        <div className="flex-1 hidden lg:flex justify-center mx-4">
            {config?.headerSearchEnabled !== false && (
                <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground dark:text-white" />
                <Input
                    ref={searchInputRef}
                    placeholder="Search posts, media, brands..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    // Added onMouseDown to handle focus outside onBlur on desktop
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                    className="pl-10 pr-20 border border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/40 transition-all"
                />
                {searchQuery && (
                    <X
                    onClick={clearSearch}
                    className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    />
                )}
                <Microphone
                    setText={setMicrophoneTranscript}
                    className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-white"
                />
                
                {/* Search Results Dropdown (Desktop) */}
                {searchOpen && searchQuery && (
                    <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-[400px] overflow-y-auto z-20"
                    >
                    {!searchResults ? (
                        <div className="p-4 flex items-center justify-center">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="ml-3 space-y-1">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-3 w-[150px]" />
                        </div>
                        </div>
                    ) : (
                        <>
                        {searchResults.data.posts.length > 0 && (
                            <div className="p-2">
                            <h3 className="text-sm font-medium px-2 py-1">Posts</h3>
                            {searchResults.data.posts.map(post => (
                                <div
                                key={`post-${post.id}`}
                                className="p-2 hover:bg-accent cursor-pointer rounded-sm"
                                onMouseDown={() => navigateToResult('post', post.id)}
                                >
                                <p className="font-medium truncate">{post.content.substring(0, 50)}...</p>
                                <p className="text-xs text-muted-foreground">
                                    {post.platform} • {post.status}
                                </p>
                                </div>
                            ))}
                            </div>
                        )}

                        {searchResults.data.media.length > 0 && (
                            <div className="p-2">
                            <h3 className="text-sm font-medium px-2 py-1">Media</h3>
                            {searchResults.data.media.map(media => (
                                <div
                                key={`media-${media.id}`}
                                className="p-2 hover:bg-accent cursor-pointer rounded-sm"
                                onMouseDown={() => navigateToResult('media', media.id)}
                                >
                                <p className="font-medium truncate">{media.url.substring(0, 50)}</p>
                                <p className="text-xs text-muted-foreground">{media.type}</p>
                                </div>
                            ))}
                            </div>
                        )}

                        {searchResults.data.brands.length > 0 && (
                            <div className="p-2">
                            <h3 className="text-sm font-medium px-2 py-1">Brands</h3>
                            {searchResults.data.brands.map(brand => (
                                <div
                                key={`brand-${brand.id}`}
                                className="p-2 hover:bg-accent cursor-pointer rounded-sm flex items-center gap-2"
                                onMouseDown={() => navigateToResult('brand', brand.id)}
                                >
                                {brand.logo && (
                                    <Avatar className="h-6 w-6">
                                    <AvatarImage src={brand.logo} alt={brand.name} />
                                    <AvatarFallback>{brand.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div>
                                    <p className="font-medium">{brand.name}</p>
                                    {brand.description && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {brand.description.substring(0, 60)}...
                                    </p>
                                    )}
                                </div>
                                </div>
                            ))}
                            </div>
                        )}

                        {searchResults.data.posts.length === 0 &&
                            searchResults.data.media.length === 0 &&
                            searchResults.data.brands.length === 0 && (
                            <div className="p-4 text-center text-muted-foreground">
                                No results found for &quot;{searchQuery}&quot;
                            </div>
                        )}
                        </>
                    )}
                    </div>
                )}
                </div>
            )}
        </div>


        {/* Right Section - Utility Icons and User Menu */}
        <div className="flex items-center gap-2 md:gap-3 lg:gap-4 ml-auto">
            {/* Mobile Search Button */}
            {config?.headerSearchEnabled !== false && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:block lg:hidden" // Visible on mobile and medium screens
                    onClick={() => {
                        setSearchOpen(true);
                        // Focus on the input once the modal is rendered
                        setTimeout(() => searchInputRef.current?.focus(), 0);
                    }}
                >
                    <Search className="w-5 h-5" />
                </Button>
            )}

            {/* Notifications with dropdown */}
            {config?.headerNotificationsEnabled !== false && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50"
                        >
                            <Bell className="w-5 h-5 dark:text-white" />
                            {unreadCount > 0 && (
                                <Badge className="absolute -top-1 -right-1.5 w-4 h-4 p-0 text-xs flex items-center justify-center bg-secondary text-secondary-foreground dark:bg-secondary dark:text-secondary-foreground">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-80 md:w-96 max-h-[80vh] overflow-y-auto backdrop-blur-sm"
                    >
                        <DropdownMenuLabel className="flex justify-between items-center">
                            <span>Notifications</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                disabled={isSubmitting || unreadCount === 0}
                                onClick={handleMarkAllAsRead}
                            >
                                Mark all as read
                            </Button>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {isLoading ? (
                            <div className="p-4 flex items-center">
                                <Skeleton className="w-8 h-8 rounded-full" />
                                <div className="ml-3 space-y-1 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                                No new notifications
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <DropdownMenuItem
                                    variant={
                                        notification.type === NotificationType.POST_FAILED ? 'destructive' : 'default'
                                    }
                                    key={notification.id}
                                    className={`flex flex-col items-start gap-1 p-3 h-auto ${
                                        !notification.read ? 'bg-accent/50' : ''
                                    }`}
                                >
                                    <div className="flex items-start w-full">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{notification.title}</p>
                                            <p className="text-sm text-muted-foreground whitespace-normal">{notification.message}</p>
                                        </div>
                                        <time className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                            {new Date(notification.createdAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </time>
                                    </div>
                                    {notification.metadata?.error && (
                                        <p className="text-xs text-destructive mt-1 truncate w-full">
                                            Error: {notification.metadata.error}
                                        </p>
                                    )}
                                    {notification.metadata?.postUrl && (
                                        <a
                                            href={notification.metadata.postUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-500 mt-1 hover:underline"
                                        >
                                            View post
                                        </a>
                                    )}
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {config?.headerThemeToggleEnabled !== false && <ThemeToggle />}
            {config?.headerLanguageEnabled !== false && <GoogleTranslate />}

            {/* User Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center gap-2 px-1 md:px-2 py-1 md:py-1.5 hover:bg-accent rounded-xl transition"
                    >
                        <Avatar className="size-8 md:size-9">
                            <AvatarImage src={user?.image ?? ""} alt={user?.name ?? ""} />
                            <AvatarFallback>
                                {user?.name?.charAt(0) || user?.email?.charAt(0) || <User className="size-5" />}
                            </AvatarFallback>
                        </Avatar>

                        {/* User Name - Hidden on mobile, visible from md */}
                        <div className="hidden sm:flex flex-col items-start text-left">
                            <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                                {user?.name}
                            </span>
                        </div>
                    </Button>

                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/accounts')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Accounts</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/posts/calendar')}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Calendar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/analytics')}>
                        <ChartNoAxesCombined className="mr-2 h-4 w-4" />
                        <span>Analytics</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={handleLogout}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search Modal - remains fixed for full responsiveness */}
      {config?.headerSearchEnabled !== false && (
          <div className={`fixed inset-0 bg-background/95 backdrop-blur-sm md:hidden p-4 z-50 transition-opacity duration-300 ${searchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                          ref={searchInputRef}
                          placeholder="Search posts, media, brands..."
                          value={searchQuery}
                          onChange={handleSearchChange}
                          // Removed onFocus and onBlur here to keep the modal open and focused
                          className="rounded-sm pl-10 pr-10 focus-visible:ring-primary/50"
                      />
                      {searchQuery && (
                          <X
                              className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer"
                              onClick={clearSearch}
                          />
                      )}
                      <Microphone
                          setText={setMicrophoneTranscript}
                          className="absolute right-1 top-1/2 -translate-y-1/2 dark:text-white"
                      />
                  </div>
                  <Button variant="ghost" onClick={() => setSearchOpen(false)} className="flex-shrink-0">
                      Cancel
                  </Button>
              </div>

              {/* Search Results in Mobile Modal */}
              {searchQuery && (
                  <div className="bg-background rounded-md border max-h-[70vh] overflow-y-auto shadow-xl">
                      {!searchResults ? (
                          <div className="p-4 flex items-center justify-center">
                              <Skeleton className="w-8 h-8 rounded-full" />
                              <div className="ml-3 space-y-1 flex-1">
                                  <Skeleton className="h-4 w-3/4" />
                                  <Skeleton className="h-3 w-1/2" />
                              </div>
                          </div>
                      ) : (
                          <>
                              {searchResults.data.posts.length > 0 && (
                                  <div className="p-2">
                                      <h3 className="text-sm font-medium px-2 py-1">Posts</h3>
                                      {searchResults.data.posts.map(post => (
                                          <div
                                              key={`post-${post.id}`}
                                              className="p-2 hover:bg-accent cursor-pointer rounded-sm"
                                              onClick={() => navigateToResult('post', post.id)}
                                          >
                                              <p className="font-medium truncate">{post.content.substring(0, 50)}...</p>
                                              <p className="text-xs text-muted-foreground">
                                                  {post.platform} • {post.status}
                                              </p>
                                          </div>
                                      ))}
                                  </div>
                              )}

                              {searchResults.data.media.length > 0 && (
                                  <div className="p-2">
                                      <h3 className="text-sm font-medium px-2 py-1">Media</h3>
                                      {searchResults.data.media.map(media => (
                                          <div
                                              key={`media-${media.id}`}
                                              className="p-2 hover:bg-accent cursor-pointer rounded-sm"
                                              onClick={() => navigateToResult('media', media.id)}
                                          >
                                              <p className="font-medium truncate">{media.url.substring(0, 50)}</p>
                                              <p className="text-xs text-muted-foreground">{media.type}</p>
                                          </div>
                                      ))}
                                  </div>
                              )}

                              {searchResults.data.brands.length > 0 && (
                                  <div className="p-2">
                                      <h3 className="text-sm font-medium px-2 py-1">Brands</h3>
                                      {searchResults.data.brands.map(brand => (
                                          <div
                                              key={`brand-${brand.id}`}
                                              className="p-2 hover:bg-accent cursor-pointer rounded-sm flex items-center gap-2"
                                              onClick={() => navigateToResult('brand', brand.id)}
                                          >
                                              {brand.logo && (
                                                  <Avatar className="h-6 w-6">
                                                      <AvatarImage src={brand.logo} alt={brand.name} />
                                                      <AvatarFallback>{brand.name.charAt(0)}</AvatarFallback>
                                                  </Avatar>
                                              )}
                                              <div>
                                                  <p className="font-medium">{brand.name}</p>
                                                  {brand.description && (
                                                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                          {brand.description.substring(0, 60)}...
                                                      </p>
                                                  )}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}

                              {searchResults.data.posts.length === 0 &&
                                  searchResults.data.media.length === 0 &&
                                  searchResults.data.brands.length === 0 && (
                                      <div className="p-4 text-center text-muted-foreground">
                                          No results found for &quot;{searchQuery}&quot;
                                      </div>
                                  )}
                          </>
                      )}
                  </div>
              )}
          </div>
      )}

      {/* Logout Confirmation Dialog - unchanged */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to log out?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setLogoutOpen(false);
                signOut({ callbackUrl: '/login' });
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}