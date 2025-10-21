'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';

interface Brand {
  id: string;
  name: string;
  logo?: string;
}

interface ExternalBlogSite {
  id: string;
  name: string;
  platform: string;
  baseUrl: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CreateBlogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    brandId: '',
    title: '',
    content: '',
    tags: [] as string[],
    externalSiteIds: [] as string[],
    publishImmediately: false,
  });

  const [currentTag, setCurrentTag] = useState('');

  const { data: brandsData } = useSWR(
    status === 'authenticated' ? '/api/brands' : null,
    fetcher
  );

  const { data: sitesData, isLoading } = useSWR(
    status === 'authenticated' ? '/api/blogs/sites' : null,
    fetcher
  );

  // Updated to match the new data structure
  const brands: Brand[] = brandsData?.data || [];
  const externalSites: ExternalBlogSite[] = sitesData?.externalSites || [];

  // Use useEffect for navigation to prevent render loop
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // React Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setBannerImage(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setBannerPreview(previewUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const removeBannerImage = useCallback(() => {
    setBannerImage(null);
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
    }
    setBannerPreview('');
  }, [bannerPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.brandId || !formData.title || !formData.content) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      
      // Append all form data
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'tags' || key === 'externalSiteIds') {
          submitData.append(key, JSON.stringify(value));
        } else {
          submitData.append(key, value.toString());
        }
      });

      // Append banner image if selected
      if (bannerImage) {
        submitData.append('bannerImage', bannerImage);
      }

      const response = await fetch('/api/blogs', {
        method: 'POST',
        body: submitData,
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        router.push('/blogs');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating blog:', error);
      alert('Error creating blog');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleCheckboxChange = useCallback((name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  }, []);

  const handleTagAdd = useCallback(() => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  }, [currentTag, formData.tags]);

  const handleTagKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTagAdd();
    }
  }, [handleTagAdd]);

  const handleTagRemove = useCallback((tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);

  const handleExternalSiteToggle = useCallback((siteId: string) => {
    setFormData(prev => ({
      ...prev,
      externalSiteIds: prev.externalSiteIds.includes(siteId)
        ? prev.externalSiteIds.filter(id => id !== siteId)
        : [...prev.externalSiteIds, siteId]
    }));
  }, []);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
    };
  }, [bannerPreview]);

  if (status === 'loading' || isLoading) {
    return <CreateBlogSkeleton />;
  }

  if (status === 'unauthenticated') {
    // This will be handled by the useEffect, return loading state
    return <CreateBlogSkeleton />;
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/blogs')}
          className="mb-4 pl-0 hover:pl-2 transition-all"
        >
          ← Back to Blogs
        </Button>
        <h1 className="text-3xl font-bold">Create New Blog Post</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Write your blog content and publish it to your connected platforms
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Brand Selection */}
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand *</Label>
              <Select
                value={formData.brandId}
                onValueChange={(value) => handleSelectChange('brandId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Enter blog post title"
              />
            </div>

            {/* Banner Image with React Dropzone */}
            <div className="space-y-2">
              <Label>Banner Image</Label>
              {bannerPreview ? (
                <div className="relative">
                  <div className="relative w-full h-64 rounded-lg overflow-hidden border">
                    <Image
                      src={bannerPreview}
                      alt="Banner preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeBannerImage}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-muted-foreground">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isDragActive ? (
                        <p>Drop the image here...</p>
                      ) : (
                        <p>Drag & drop an image here, or click to select</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recommended: 1200x600 pixels • Max: 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows={15}
                placeholder="Write your blog content here... (Markdown supported)"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleTagRemove(tag)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="Add a tag and press Enter"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTagAdd}
                >
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* External Sites Section */}
        <Card>
          <CardHeader>
            <CardTitle>Publish to External Sites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="publishImmediately"
                checked={formData.publishImmediately}
                onCheckedChange={(checked) => 
                  handleCheckboxChange('publishImmediately', checked as boolean)
                }
              />
              <Label htmlFor="publishImmediately">
                Publish immediately to selected sites
              </Label>
            </div>

            {externalSites.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No external sites connected.{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => router.push('/blog/sites')}
                >
                  Connect your first site
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {externalSites.map(site => (
                  <Card
                    key={site.id}
                    className={`cursor-pointer transition-colors ${
                      formData.externalSiteIds.includes(site.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <CardContent 
                      className="p-4"
                      onClick={() => handleExternalSiteToggle(site.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{site.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {site.platform} • {site.baseUrl}
                          </p>
                        </div>
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0"
                        >
                          <Checkbox
                            checked={formData.externalSiteIds.includes(site.id)}
                            onCheckedChange={() => handleExternalSiteToggle(site.id)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/blogs')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Blog Post'}
          </Button>
        </div>
      </form>
    </>
  );
}

function CreateBlogSkeleton() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Form Skeleton */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-64 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-60 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}