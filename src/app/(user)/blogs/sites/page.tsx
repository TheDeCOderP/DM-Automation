'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

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
  apiEndpoint: string;
  authType: string;
  isActive: boolean;
  brand: Brand;
  config?: any; // Add config field for field mappings
  _count: {
    blogPosts: number;
  };
  createdAt: string;
}

// Default field mappings for different platforms
const DEFAULT_FIELD_MAPPINGS = {
  WORDPRESS: {
    title: 'title',
    content: 'content',
    banner: 'featured_media',
    slug: 'slug',
    tags: 'tags'
  },
  HASHNODE: {
    title: 'title',
    content: 'contentMarkdown',
    banner: 'coverImageURL',
    tags: 'tags'
  },
  DEV_TO: {
    title: 'title',
    content: 'body_markdown',
    banner: 'main_image',
    tags: 'tags'
  },
  CUSTOM_API: {
    title: 'title',
    content: 'content',
    banner: 'banner_image',
    slug: 'slug',
    tags: 'tags'
  }
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function BlogSitesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    platform: 'WORDPRESS',
    baseUrl: '',
    apiEndpoint: '',
    apiKey: '',
    secretKey: '',
    username: '',
    authType: 'API_KEY',
    contentType: 'application/json',
    brandId: '',
    // Field mapping state
    fieldMapping: JSON.stringify(DEFAULT_FIELD_MAPPINGS.WORDPRESS, null, 2)
  });

  const { data: brandsData } = useSWR(
    status === 'authenticated' ? '/api/brands' : null,
    fetcher
  );

  const { data: sitesData, error, isLoading, mutate } = useSWR(
    status === 'authenticated' ? '/api/blogs/sites' : null,
    fetcher
  );

  const brands: Brand[] = brandsData?.data || [];
  const sites: ExternalBlogSite[] = sitesData?.externalSites || [];

  const handlePlatformChange = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platform,
      fieldMapping: JSON.stringify(DEFAULT_FIELD_MAPPINGS[platform as keyof typeof DEFAULT_FIELD_MAPPINGS] || DEFAULT_FIELD_MAPPINGS.CUSTOM_API, null, 2)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse and validate field mapping
      let fieldMapping;
      try {
        fieldMapping = JSON.parse(formData.fieldMapping);
      } catch (error) {
        alert('Invalid field mapping JSON. Please check the format.');
        return;
      }

      const payload = {
        ...formData,
        config: {
          fieldMapping,
          contentType: formData.contentType
        }
      };

      const response = await fetch('/api/blogs/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        mutate();
        setShowAddForm(false);
        setShowFieldMapping(false);
        // Reset form
        setFormData({
          name: '',
          platform: 'WORDPRESS',
          baseUrl: '',
          apiEndpoint: '',
          apiKey: '',
          secretKey: '',
          username: '',
          authType: 'API_KEY',
          contentType: 'application/json',
          brandId: '',
          fieldMapping: JSON.stringify(DEFAULT_FIELD_MAPPINGS.WORDPRESS, null, 2)
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating external site:', error);
      alert('Error creating external site');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const testConnection = async (siteId: string) => {
    try {
      const response = await fetch(`/api/blogs/sites/${siteId}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Connection successful!');
      } else {
        const error = await response.json();
        alert(`Connection failed: ${error.error}`);
      }
    } catch (error) {
      alert('Connection test failed');
    }
  };

  const viewFieldMappings = (site: ExternalBlogSite) => {
    alert(`Field mappings for ${site.name}:\n${JSON.stringify(site.config?.fieldMapping || 'No custom mappings', null, 2)}`);
  };

  if (status === 'loading' || isLoading) {
    return <BlogSitesSkeleton />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">External Blog Sites</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect and manage your external blog platforms
            </p>
          </div>
          <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
            <DialogTrigger asChild>
              <Button>
                Add New Site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add External Blog Site</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Site Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="My WordPress Blog"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform *</Label>
                    <Select
                      value={formData.platform}
                      onValueChange={handlePlatformChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WORDPRESS">WordPress</SelectItem>
                        <SelectItem value="HASHNODE">Hashnode</SelectItem>
                        <SelectItem value="DEV_TO">Dev.to</SelectItem>
                        <SelectItem value="CUSTOM_API">Custom API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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

                  <div className="space-y-2">
                    <Label htmlFor="authType">Authentication Type *</Label>
                    <Select
                      value={formData.authType}
                      onValueChange={(value) => handleSelectChange('authType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="API_KEY">API Key</SelectItem>
                        <SelectItem value="BASIC_AUTH">Basic Auth</SelectItem>
                        <SelectItem value="OAUTH2">OAuth2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="baseUrl">Base URL *</Label>
                    <Input
                      id="baseUrl"
                      name="baseUrl"
                      type="url"
                      value={formData.baseUrl}
                      onChange={handleInputChange}
                      required
                      placeholder="https://myblog.com"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="apiEndpoint">API Endpoint *</Label>
                    <Input
                      id="apiEndpoint"
                      name="apiEndpoint"
                      value={formData.apiEndpoint}
                      onChange={handleInputChange}
                      required
                      placeholder="/wp-json/wp/v2/posts"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="apiKey">API Key / Token *</Label>
                    <Input
                      id="apiKey"
                      name="apiKey"
                      type="password"
                      value={formData.apiKey}
                      onChange={handleInputChange}
                      required
                      placeholder="Your API key or token"
                    />
                  </div>

                  {formData.authType === 'BASIC_AUTH' && (
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="Username for basic auth"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="secretKey">Secret Key (Optional)</Label>
                    <Input
                      id="secretKey"
                      name="secretKey"
                      type="password"
                      value={formData.secretKey}
                      onChange={handleInputChange}
                      placeholder="Your secret key if required"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contentType">Content Type</Label>
                    <Select
                      value={formData.contentType}
                      onValueChange={(value) => handleSelectChange('contentType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="application/json">application/json</SelectItem>
                        <SelectItem value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</SelectItem>
                        <SelectItem value="multipart/form-data">multipart/form-data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Field Mapping Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fieldMapping">Field Mapping Configuration</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFieldMapping(!showFieldMapping)}
                    >
                      {showFieldMapping ? 'Hide' : 'Show'} Field Mapping
                    </Button>
                  </div>
                  
                  {showFieldMapping && (
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        <p>Configure how your blog fields map to the external API. Common fields:</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline">title</Badge>
                          <Badge variant="outline">content</Badge>
                          <Badge variant="outline">banner</Badge>
                          <Badge variant="outline">slug</Badge>
                          <Badge variant="outline">tags</Badge>
                        </div>
                      </div>
                      <Textarea
                        id="fieldMapping"
                        name="fieldMapping"
                        value={formData.fieldMapping}
                        onChange={handleInputChange}
                        rows={8}
                        className="font-mono text-sm"
                        placeholder='{"title": "title", "content": "content", "banner": "banner_image"}'
                      />
                      <p className="text-xs text-muted-foreground">
                        Use JSON format to map your internal field names to external API field names.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Site
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sites List */}
      <Card>
        <CardContent className="p-0">
          {sites.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No external sites connected</h3>
              <p className="text-muted-foreground mb-4">Get started by connecting your first external blog platform.</p>
              <Button
                onClick={() => setShowAddForm(true)}
              >
                Add Your First Site
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {sites.map(site => (
                <div key={site.id} className="p-6 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {site.platform.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{site.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {site.brand.name} • {site.platform} • {site.baseUrl}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {site._count.blogPosts} posts • Connected {new Date(site.createdAt).toLocaleDateString()}
                        </p>
                        {site.config?.fieldMapping && (
                          <Badge variant="secondary" className="mt-1">
                            Custom Field Mapping
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewFieldMappings(site)}
                      >
                        View Mappings
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(site.id)}
                      >
                        Test Connection
                      </Button>
                      <Button size="sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function BlogSitesSkeleton() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Sites List Skeleton */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}