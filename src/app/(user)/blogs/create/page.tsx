'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  SaveIcon, 
  EyeIcon,
  FileTextIcon,
  GlobeIcon,
  AlertCircleIcon
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logo?: string;
}

import { ExternalBlogSite } from '@prisma/client';

import TagsInput from './_components/TagsInput';
import FAQManager from './_components/FAQManager';
import ImageUpload from './_components/ImageUpload';
import CreateBlogSkeleton from './_components/CreateBlogSkeleton';
import ExternalSitesSection from './_components/ExternalSIteSection';
import AIGenerator from '../../posts/create/_components/AIGenerator';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface FAQ {
  question: string;
  answer: string;
}

// Main Form Component
function CreateBlogForm({
  externalSites,
  onSubmit,
  onCancel
}: {
  brands: Brand[];
  externalSites: ExternalBlogSite[];
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredPreview, setFeaturedPreview] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    tags: [] as string[],
    imageAlt: '',
    
    // SEO fields
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    canonicalUrl: '',
    
    // Status
    published: false,
    featured: false,
    scheduledAt: '',
    
    // External sites
    externalSiteIds: [] as string[],
    
    // FAQs
    faqs: [] as FAQ[]
  });

  const [currentTag, setCurrentTag] = useState('');

  const hasUnsavedChanges = Boolean(
    formData.title || 
    formData.content || 
    formData.tags.length > 0 || 
    bannerImage ||
    featuredImage
  );

  const canPublish = formData.externalSiteIds.length > 0 && formData.title && formData.content;

  const onBannerDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setBannerImage(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  }, []);

  const onFeaturedDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFeaturedImage(file);
      setFeaturedPreview(URL.createObjectURL(file));
    }
  }, []);

  const removeBannerImage = useCallback(() => {
    setBannerImage(null);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerPreview('');
  }, [bannerPreview]);

  const removeFeaturedImage = useCallback(() => {
    setFeaturedImage(null);
    if (featuredPreview) URL.revokeObjectURL(featuredPreview);
    setFeaturedPreview('');
  }, [featuredPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.published && !canPublish) {
      toast.error('Please select at least one external site to publish');
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'tags' || key === 'faqs' || key === 'externalSiteIds') {
          submitData.append(key, JSON.stringify(value));
        } else {
          submitData.append(key, value.toString());
        }
      });

      if (bannerImage) submitData.append('bannerImage', bannerImage);
      if (featuredImage) submitData.append('image', featuredImage);

      await onSubmit(submitData);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleTagAdd = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, currentTag.trim()] }));
      setCurrentTag('');
    }
  };

  const handleTagRemove = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSiteToggle = (siteId: string) => {
    setFormData(prev => ({
      ...prev,
      externalSiteIds: prev.externalSiteIds.includes(siteId)
        ? prev.externalSiteIds.filter(id => id !== siteId)
        : [...prev.externalSiteIds, siteId]
    }));
  };

  const handleFAQAdd = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }]
    }));
  };

  const handleFAQRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  const handleFAQUpdate = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.map((faq, i) => i === index ? { ...faq, [field]: value } : faq)
    }));
  };

  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      if (featuredPreview) URL.revokeObjectURL(featuredPreview);
    };
  }, [bannerPreview, featuredPreview]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Create Blog Post</h1>
          <p className="text-muted-foreground">
            Create and publish your blog content across multiple platforms
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">
                <FileTextIcon className="w-4 h-4 mr-2" />
                Content & Publishing
              </TabsTrigger>
              <TabsTrigger value="seo">
                <GlobeIcon className="w-4 h-4 mr-2" />
                SEO & Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Blog Content</CardTitle>
                      <CardDescription>Create your main blog content</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title">
                          Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          placeholder="Enter a compelling blog title"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="excerpt">Excerpt</Label>
                        <Textarea
                          id="excerpt"
                          name="excerpt"
                          value={formData.excerpt}
                          onChange={handleInputChange}
                          placeholder="Brief summary of your blog post"
                          rows={3}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label htmlFor="content">
                          Content <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="content"
                          name="content"
                          value={formData.content}
                          onChange={handleInputChange}
                          placeholder="Write your blog content here... (Markdown supported)"
                          rows={20}
                          className="min-h-[400px] font-mono"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Markdown formatting is supported
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Media</CardTitle>
                      <CardDescription>Add images to your blog post</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label>Banner Image</Label>
                        <ImageUpload
                          label=""
                          preview={bannerPreview}
                          onDrop={onBannerDrop}
                          onRemove={removeBannerImage}
                          isDragActive={false}
                          helpText="Recommended: 1200x600px • Max: 5MB"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-muted-foreground">Or generate with AI:</span>
                          <AIGenerator onFileSelect={(file) => {
                            setBannerImage(file);
                            setBannerPreview(URL.createObjectURL(file));
                          }} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Featured Image</Label>
                        <ImageUpload
                          label=""
                          preview={featuredPreview}
                          onDrop={onFeaturedDrop}
                          onRemove={removeFeaturedImage}
                          isDragActive={false}
                          helpText="Used for social sharing • Max: 5MB"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-muted-foreground">Or generate with AI:</span>
                          <AIGenerator onFileSelect={(file) => {
                            setFeaturedImage(file);
                            setFeaturedPreview(URL.createObjectURL(file));
                          }} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="imageAlt">Image Alt Text</Label>
                        <Input
                          id="imageAlt"
                          name="imageAlt"
                          value={formData.imageAlt}
                          onChange={handleInputChange}
                          placeholder="Describe the image for accessibility"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Publishing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ExternalSitesSection
                        externalSites={externalSites}
                        selectedSiteIds={formData.externalSiteIds}
                        onSiteToggle={handleSiteToggle}
                      />

                      {formData.externalSiteIds.length === 0 && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertCircleIcon className="w-4 h-4 text-amber-600" />
                          <p className="text-xs text-amber-700">
                            Select at least one site to publish
                          </p>
                        </div>
                      )}

                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="published" className="text-sm font-medium">
                            Publish immediately
                          </Label>
                          <Switch
                            id="published"
                            checked={formData.published}
                            onCheckedChange={(checked) => handleSwitchChange('published', checked)}
                            disabled={formData.externalSiteIds.length === 0}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="featured" className="text-sm font-medium">
                            Featured post
                          </Label>
                          <Switch
                            id="featured"
                            checked={formData.featured}
                            onCheckedChange={(checked) => handleSwitchChange('featured', checked)}
                          />
                        </div>
                      </div>

                      {formData.published && formData.externalSiteIds.length === 0 && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <p className="text-xs text-destructive">
                            Cannot publish without selecting at least one external site
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TagsInput
                        tags={formData.tags}
                        currentTag={currentTag}
                        onTagAdd={handleTagAdd}
                        onTagRemove={handleTagRemove}
                        onCurrentTagChange={setCurrentTag}
                        onTagKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>SEO Optimization</CardTitle>
                  <CardDescription>Optimize your blog post for search engines</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="seoTitle">SEO Title</Label>
                    <Input
                      id="seoTitle"
                      name="seoTitle"
                      value={formData.seoTitle}
                      onChange={handleInputChange}
                      placeholder="Custom title for search engines"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use main title
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seoDescription">Meta Description</Label>
                    <Textarea
                      id="seoDescription"
                      name="seoDescription"
                      value={formData.seoDescription}
                      onChange={handleInputChange}
                      placeholder="Brief description for search results (150-160 characters)"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seoKeywords">Keywords</Label>
                    <Input
                      id="seoKeywords"
                      name="seoKeywords"
                      value={formData.seoKeywords}
                      onChange={handleInputChange}
                      placeholder="Comma-separated keywords"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="canonicalUrl">Canonical URL</Label>
                    <Input
                      id="canonicalUrl"
                      name="canonicalUrl"
                      value={formData.canonicalUrl}
                      onChange={handleInputChange}
                      placeholder="https://example.com/original-post"
                    />
                    <p className="text-xs text-muted-foreground">
                      Specify if this content is published elsewhere
                    </p>
                  </div>

                  <Separator />

                  <FAQManager
                    faqs={formData.faqs}
                    onAdd={handleFAQAdd}
                    onRemove={handleFAQRemove}
                    onUpdate={handleFAQUpdate}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {formData.externalSiteIds.length === 0 ? (
                    <>
                      <AlertCircleIcon className="w-4 h-4 text-amber-500" />
                      <span>Select at least one site to publish</span>
                    </>
                  ) : (
                    <>
                      <GlobeIcon className="w-4 h-4 text-green-500" />
                      <span>Ready to publish to {formData.externalSiteIds.length} site(s)</span>
                    </>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => hasUnsavedChanges ? setShowCancelDialog(true) : onCancel()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={loading || !formData.title || !formData.content}
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    
                    <Button
                      type="submit"
                      disabled={loading || !formData.title || !formData.content || !canPublish}
                    >
                      <SaveIcon className="w-4 h-4 mr-2" />
                      {loading ? 'Creating...' : 'Create & Publish'}
                    </Button>
                  </div>
                </div>
              </div>
              
              {hasUnsavedChanges && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    You have unsaved changes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </form>

        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard Changes?</DialogTitle>
              <DialogDescription>
                You have unsaved changes. Are you sure you want to leave?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Continue Editing
              </Button>
              <Button variant="destructive" onClick={() => { setShowCancelDialog(false); onCancel(); }}>
                Discard Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Main Component
export default function CreateBlogPage() {
  const router = useRouter();
  const { data: brandsData, isLoading: brandsLoading } = useSWR('/api/brands', fetcher);
  const { data: sitesData, isLoading: sitesLoading } = useSWR('/api/blogs/sites', fetcher);

  // Updated to match the new data structure
  const brands: Brand[] = brandsData?.data || [];
  const externalSites: ExternalBlogSite[] = sitesData?.externalSites || [];
  
  const isLoading = brandsLoading || sitesLoading;

  const handleSubmit = async (submitData: FormData) => {
    const promise = fetch('/api/blogs', {
      method: 'POST',
      body: submitData,
    });

    toast.promise(promise, {
      loading: 'Creating blog post...',
      success: async (response) => {
        if (response.ok) {
          const data = await response.json();
          // Navigate to blog list or blog detail page after successful creation
          router.push('/blogs');
          return data.message || 'Blog post created successfully!';
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create blog post');
        }
      },
      error: (error) => error.message || 'Error creating blog post'
    });
  };

  const handleCancel = () => {
    router.push('/blogs');
  };

  if (isLoading) {
    return <CreateBlogSkeleton />;
  }

  return (
    <CreateBlogForm
      brands={brands}
      externalSites={externalSites}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
}