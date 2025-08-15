"use client";
import useSWR from 'swr';
import { toast } from 'sonner';
import { debounce } from 'lodash';
import { signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useRef, useState } from 'react';
import { Bell, Search, Settings, LogOut, X, Users, Calendar } from 'lucide-react';

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
import { NotificationType } from '@prisma/client';
import { Notification } from '@/types/notification';

interface AppHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
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
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePage, setActivePage] = useState('Dashboard');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // SWR for notifications
  const { data: notificationData, mutate: mutateNotifications, error, isLoading } = useSWR<{
    success: boolean;
    data: Notification[];
  }>(`/api/notifications?status=unread`, fetcher, {
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
  }>(searchQuery ? `/api/search?query=${encodeURIComponent(searchQuery)}&limit=5` : null, fetcher, {
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
    if (searchInputRef.current) {
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
    if (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    }
  }, [error]);

  const handleLogout = () => {
    signOut({
      callbackUrl: '/login',
    });
  };

  const handleMarkAllAsRead = async () => {
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
    <header className="w-full backdrop-blur-lg bg-background/80 border-b-2 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 lg:px-6 py-5">
        {/* Left Section */}
        <h1 className="font-bold text-3xl ml-3">{activePage}</h1>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="hidden md:flex w-[350px] mx-4 relative">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search posts, media, brands..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                className="rounded-sm pl-10 focus-visible:ring-primary/50"
              />
              {searchQuery && (
                <X
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer"
                  onClick={clearSearch}
                />
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchOpen && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg  max-h-[400px] overflow-y-auto">
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
                                <p className="text-xs text-muted-foreground truncate">
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

          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Mobile Search Modal */}
          {searchOpen && (
            <div className="fixed inset-0 bg-background/90 backdrop-blur-sm  md:hidden p-4 z-20">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search posts, media, brands..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="rounded-sm pl-10 focus-visible:ring-primary/50"
                  />
                  {searchQuery && (
                    <X
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer"
                      onClick={clearSearch}
                    />
                  )}
                </div>
                <Button variant="ghost" onClick={() => setSearchOpen(false)}>
                  Cancel
                </Button>
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="bg-background rounded-md border max-h-[70vh] overflow-y-auto">
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
                                  <p className="text-xs text-muted-foreground truncate">
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

          {/* Notifications with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-accent">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-96 max-h-[80vh] overflow-y-auto backdrop-blur-sm"
            >
              <DropdownMenuLabel className="flex justify-between items-center">
                <span>Notifications</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6"
                  disabled={isSubmitting}
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {isLoading ? (
                <div className="p-4 flex items-center justify-center">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="ml-3 space-y-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
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
                    className={`flex flex-col items-start gap-1 p-3 ${
                      !notification.read ? 'bg-accent/50' : ''
                    }`}
                  >
                    <div className="flex items-start w-full">
                      <div className="flex-1">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      <time className="text-xs text-muted-foreground ml-2">
                        {new Date(notification.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                    </div>
                    {notification.metadata?.error && (
                      <p className="text-xs text-destructive mt-1">
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

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-2">
                <Avatar className="size-8">
                  <AvatarImage src={user?.image ?? ''} alt={user?.name ?? ''} />
                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-semibold">{user.name}</span>
                  <span className="text-muted-foreground">{user.email}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 backdrop-blur-sm">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/accounts')}>
                <Users className="mr-2 h-4 w-4" />
                <span>Accounts</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/posts/calendar')}>
                <Calendar className="mr-2 h-4 w-4" />
                <span>Calendar</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/notifications')}>
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
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
    </header>
  );
}