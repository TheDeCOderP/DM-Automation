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
  Save, 
  Eye,
  FileText,
  Globe,
  AlertCircle,
  Image as ImageIcon,
  Tag,
  Settings,
  Sparkles,
  X,
  HelpCircle,
  ArrowLeft,
  Send
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
import ContentEditor from './_components/ContentEditor';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => hasUnsavedChanges ? setShowCancelDialog(true) : onCancel()}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blogs
          </Button>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="w-8 h-8 text-primary" />
                Create Blog Post
              </h1>
              <p className="text-muted-foreground">
                Create and publish your blog content across multiple platforms
              </p>
            </div>
            
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                <span className="text-sm text-amber-700 dark:text-amber-400">Unsaved changes</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1">
              <TabsTrigger value="content" className="gap-2 py-2.5">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Content & Publishing</span>
                <span className="sm:hidden">Content</span>
              </TabsTrigger>
              <TabsTrigger value="seo" className="gap-2 py-2.5">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">SEO & Settings</span>
                <span className="sm:hidden">SEO</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-2">
                    <CardHeader className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Blog Content
                      </CardTitle>
                      <CardDescription>Write your main blog content</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-base flex items-center gap-2">
                          Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          placeholder="Enter a compelling blog title..."
                          required
                          className="text-lg h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="excerpt" className="text-base">Excerpt</Label>
                        <Textarea
                          id="excerpt"
                          name="excerpt"
                          value={formData.excerpt}
                          onChange={handleInputChange}
                          placeholder="Brief summary of your blog post (optional)"
                          rows={3}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          A short summary that appears in previews
                        </p>
                      </div>

                      <Separator />

                      <ContentEditor
                        value={formData.content}
                        onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                        placeholder="Write your blog content here..."
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardHeader className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        Media
                      </CardTitle>
                      <CardDescription>Add images to enhance your blog post</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-base">Banner Image</Label>
                          {bannerPreview && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeBannerImage}
                              className="h-8 text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <ImageUpload
                          label=""
                          preview={bannerPreview}
                          onDrop={onBannerDrop}
                          onRemove={removeBannerImage}
                          isDragActive={false}
                          helpText="Recommended: 1200x600px • Max: 5MB"
                        />
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          <span className="text-sm text-muted-foreground">Generate with AI:</span>
                          <AIGenerator onFileSelect={(file) => {
                            setBannerImage(file);
                            setBannerPreview(URL.createObjectURL(file));
                          }} />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-base">Featured Image</Label>
                          {featuredPreview && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeFeaturedImage}
                              className="h-8 text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <ImageUpload
                          label=""
                          preview={featuredPreview}
                          onDrop={onFeaturedDrop}
                          onRemove={removeFeaturedImage}
                          isDragActive={false}
                          helpText="Used for social sharing • Max: 5MB"
                        />
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          <span className="text-sm text-muted-foreground">Generate with AI:</span>
                          <AIGenerator onFileSelect={(file) => {
                            setFeaturedImage(file);
                            setFeaturedPreview(URL.createObjectURL(file));
                          }} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="imageAlt" className="text-base">Image Alt Text</Label>
                        <Input
                          id="imageAlt"
                          name="imageAlt"
                          value={formData.imageAlt}
                          onChange={handleInputChange}
                          placeholder="Describe the image for accessibility"
                        />
                        <p className="text-xs text-muted-foreground">
                          Helps screen readers and improves SEO
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                  <Card className="border-2 border-primary/20">
                    <CardHeader className="space-y-1 pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Send className="w-5 h-5 text-primary" />
                        Publishing
                      </CardTitle>
                      <CardDescription>Choose where to publish</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ExternalSitesSection
                        externalSites={externalSites}
                        selectedSiteIds={formData.externalSiteIds}
                        onSiteToggle={handleSiteToggle}
                      />

                      {formData.externalSiteIds.length === 0 && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            Select at least one site to enable publishing
                          </p>
                        </div>
                      )}

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div className="space-y-0.5">
                            <Label htmlFor="published" className="text-sm font-medium cursor-pointer">
                              Publish immediately
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Post will go live right away
                            </p>
                          </div>
                          <Switch
                            id="published"
                            checked={formData.published}
                            onCheckedChange={(checked) => handleSwitchChange('published', checked)}
                            disabled={formData.externalSiteIds.length === 0}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div className="space-y-0.5">
                            <Label htmlFor="featured" className="text-sm font-medium cursor-pointer">
                              Featured post
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Highlight this post
                            </p>
                          </div>
                          <Switch
                            id="featured"
                            checked={formData.featured}
                            onCheckedChange={(checked) => handleSwitchChange('featured', checked)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardHeader className="space-y-1 pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Tag className="w-5 h-5 text-primary" />
                        Tags
                      </CardTitle>
                      <CardDescription>Add relevant tags</CardDescription>
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
              <Card className="border-2">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    SEO Optimization
                  </CardTitle>
                  <CardDescription>Optimize your blog post for search engines</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="seoTitle" className="text-base">SEO Title</Label>
                    <Input
                      id="seoTitle"
                      name="seoTitle"
                      value={formData.seoTitle}
                      onChange={handleInputChange}
                      placeholder="Custom title for search engines"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use main title • Recommended: 50-60 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seoDescription" className="text-base">Meta Description</Label>
                    <Textarea
                      id="seoDescription"
                      name="seoDescription"
                      value={formData.seoDescription}
                      onChange={handleInputChange}
                      placeholder="Brief description for search results"
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: 150-160 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seoKeywords" className="text-base">Keywords</Label>
                    <Input
                      id="seoKeywords"
                      name="seoKeywords"
                      value={formData.seoKeywords}
                      onChange={handleInputChange}
                      placeholder="keyword1, keyword2, keyword3"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated keywords for SEO
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="canonicalUrl" className="text-base">Canonical URL</Label>
                    <Input
                      id="canonicalUrl"
                      name="canonicalUrl"
                      value={formData.canonicalUrl}
                      onChange={handleInputChange}
                      placeholder="https://example.com/original-post"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Specify if this content is published elsewhere first
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-primary" />
                      <Label className="text-base">Frequently Asked Questions</Label>
                    </div>
                    <FAQManager
                      faqs={formData.faqs}
                      onAdd={handleFAQAdd}
                      onRemove={handleFAQRemove}
                      onUpdate={handleFAQUpdate}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Bar */}
          <Card className="border-2 sticky bottom-0 shadow-lg">
            <CardContent className="py-2">
              <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                <div className="flex items-center gap-2 text-sm">
                  {formData.externalSiteIds.length === 0 ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="text-muted-foreground">Select at least one site to publish</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        Ready to publish to <span className="font-medium text-foreground">{formData.externalSiteIds.length}</span> site(s)
                      </span>
                    </>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => hasUnsavedChanges ? setShowCancelDialog(true) : onCancel()}
                    disabled={loading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={loading || !formData.title || !formData.content}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={loading || !formData.title || !formData.content || !canPublish}
                    className="min-w-[140px]"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create & Publish
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>

        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Discard Changes?
              </DialogTitle>
              <DialogDescription>
                You have unsaved changes. Are you sure you want to leave? All your work will be lost.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Continue Editing
              </Button>
              <Button variant="destructive" onClick={() => { setShowCancelDialog(false); onCancel(); }}>
                <X className="w-4 h-4 mr-2" />
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
