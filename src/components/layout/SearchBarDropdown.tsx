'use client';

import useSWR from 'swr';
import Image from 'next/image';
import { debounce } from 'lodash';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, ImageIcon, Building2, X, FileText } from 'lucide-react';

import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';

import Microphone from '../features/microphone';

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

interface SearchResultItemProps {
  type: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  logo?: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function SearchResultItem({ icon, title, subtitle, onClick, logo }: SearchResultItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {logo ? (
        <Image 
          src={logo} 
          alt={title}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </div>
  );
}

interface SearchBarDropdownProps {
  open?: boolean;
  onClose: () => void;
}

export default function SearchBarDropdown({ open, onClose }: SearchBarDropdownProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [microphoneTranscript, setMicrophoneTranscript] = useState<string[]>([]);
  
  // SWR for search results
  const { data: searchResults, mutate: mutateSearch, isLoading } = useSWR<{
    success: boolean;
    data: SearchResult;
  }>(searchQuery ? `/api/search?query=${encodeURIComponent(searchQuery)}&limit=5` : null, fetcher, {
    revalidateOnFocus: false,
  });

  // Calculate total results
  const totalResults = (searchResults?.data ? 
    (searchResults.data.posts?.length || 0) + 
    (searchResults.data.media?.length || 0) + 
    (searchResults.data.brands?.length || 0) 
    : 0
  );

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim()) {
        mutateSearch();
      }
      setIsSearching(false);
    }, 300),
    [mutateSearch]
  );

  // Handle microphone transcript updates
  useEffect(() => {
    if (microphoneTranscript.length > 0) {
      const latestTranscript = microphoneTranscript[microphoneTranscript.length - 1];
      setSearchQuery(latestTranscript);
      setMicrophoneTranscript([]);
    }
  }, [microphoneTranscript]);

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
    }
    debouncedSearch(query);
  };

  // Navigate to search result
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
    handleClose();
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Close dropdown/modal
  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  // Close when clicking outside (desktop only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        // Only auto-close for desktop (non-modal) version
        if (window.innerWidth >= 768) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Focus input when modal opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  // Check if we're in mobile view
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  return (
    <>
      {/* Desktop Search Dropdown */}
      {!isMobile && (
        <div className="relative w-full max-w-md">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              ref={searchInputRef}
              placeholder="Search everything..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => onClose()}
              className="w-full pl-11 pr-24 h-11 bg-muted/50 border-border/50 focus-visible:bg-background focus-visible:border-primary/50 rounded-xl transition-all duration-200 shadow-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className="h-7 w-7 hover:bg-muted rounded-lg"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}

              <kbd className="pointer-events-none hidden xl:inline-flex h-6 select-none items-center gap-1 rounded-md border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100 group-focus-within:opacity-0 transition-opacity">
                <span className="text-xs">⌘</span>K
              </kbd>
              
              <Microphone
                setText={setMicrophoneTranscript}
                className="h-7 w-7"
              />
            </div>
          </div>
          
          {/* Desktop Search Results Dropdown */}
          {open && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-popover/95 backdrop-blur-xl border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {isSearching || isLoading ? 'Searching...' : `${totalResults} result${totalResults !== 1 ? 's' : ''} found`}
                  </p>
                  {searchQuery && (
                    <span className="text-xs text-muted-foreground">
                      for &quot;{searchQuery}&quot;
                    </span>
                  )}
                </div>
              </div>

              <ScrollArea className="max-h-[500px]">
                {(isSearching || isLoading) ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Searching...</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2">
                    {searchResults?.data?.posts && searchResults.data.posts.length > 0 && (
                      <div className="mb-1">
                        <div className="flex items-center gap-2 px-3 py-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Posts
                          </h3>
                          <Badge variant="secondary" className="ml-auto h-5 text-xs">
                            {searchResults.data.posts.length}
                          </Badge>
                        </div>
                        {searchResults.data.posts.map(post => (
                          <SearchResultItem
                            key={`post-${post.id}`}
                            type="post"
                            icon={<FileText className="h-5 w-5 text-primary" />}
                            title={post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '')}
                            subtitle={`${post.platform} • ${post.status}`}
                            onClick={() => navigateToResult('post', post.id)}
                          />
                        ))}
                      </div>
                    )}

                    {searchResults?.data?.media && searchResults.data.media.length > 0 && (
                      <div className="mb-1">
                        <div className="flex items-center gap-2 px-3 py-2 mb-1">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Media
                          </h3>
                          <Badge variant="secondary" className="ml-auto h-5 text-xs">
                            {searchResults.data.media.length}
                          </Badge>
                        </div>
                        {searchResults.data.media.map(media => (
                          <SearchResultItem
                            key={`media-${media.id}`}
                            type="media"
                            icon={<ImageIcon className="h-5 w-5 text-primary" />}
                            title={media.url.split('/').pop() || media.url.substring(0, 60)}
                            subtitle={media.type}
                            onClick={() => navigateToResult('media', media.id)}
                          />
                        ))}
                      </div>
                    )}

                    {searchResults?.data?.brands && searchResults.data.brands.length > 0 && (
                      <div className="mb-1">
                        <div className="flex items-center gap-2 px-3 py-2 mb-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Brands
                          </h3>
                          <Badge variant="secondary" className="ml-auto h-5 text-xs">
                            {searchResults.data.brands.length}
                          </Badge>
                        </div>
                        {searchResults.data.brands.map(brand => (
                          <SearchResultItem
                            key={`brand-${brand.id}`}
                            type="brand"
                            icon={<Building2 className="h-5 w-5 text-primary" />}
                            title={brand.name}
                            subtitle={brand.description || 'No description'}
                            onClick={() => navigateToResult('brand', brand.id)}
                            logo={brand.logo}
                          />
                        ))}
                      </div>
                    )}

                    {totalResults === 0 && !isSearching && !isLoading && (
                      <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Search className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium mb-1">No results found</p>
                        <p className="text-xs text-muted-foreground">
                          Try adjusting your search terms
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* Mobile Search Modal - Controlled by parent */}
      {isMobile && open && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search posts, media, brands..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="rounded-sm pl-10 pr-10 focus-visible:ring-primary/50"
                autoFocus
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
            <Button variant="ghost" onClick={handleClose} className="flex-shrink-0">
              Cancel
            </Button>
          </div>

          {/* Search Results in Mobile Modal */}
          {searchQuery && (
            <div className="bg-background rounded-md border max-h-[70vh] overflow-y-auto shadow-xl">
              {isSearching || isLoading ? (
                <div className="p-4 flex items-center">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="ml-3 space-y-1 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ) : (
                <>
                  {searchResults?.data?.posts && searchResults.data.posts.length > 0 && (
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

                  {searchResults?.data?.media && searchResults.data.media.length > 0 && (
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

                  {searchResults?.data?.brands && searchResults.data.brands.length > 0 && (
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

                  {totalResults === 0 && !isSearching && !isLoading && (
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
    </>
  );
}