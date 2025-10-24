import { toast } from 'sonner';
import { useState, useEffect } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { Brand, ExternalBlogSite } from '@prisma/client';
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

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

export default function SiteForm({
  open,
  onOpenChange,
  brands,
  onSubmit,
  editingSite
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: Brand[];
  onSubmit: (formData: any, isEditing?: boolean) => Promise<void>;
  editingSite?: ExternalBlogSite | null;
}) {
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
    fieldMapping: JSON.stringify(DEFAULT_FIELD_MAPPINGS.WORDPRESS, null, 2)
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editingSite) {
      const fieldMapping = editingSite.config && typeof editingSite.config === 'object' && 'fieldMapping' in editingSite.config
        ? editingSite.config.fieldMapping
        : DEFAULT_FIELD_MAPPINGS[editingSite.platform as keyof typeof DEFAULT_FIELD_MAPPINGS] || DEFAULT_FIELD_MAPPINGS.CUSTOM_API;

      setFormData({
        name: editingSite.name,
        platform: editingSite.platform,
        baseUrl: editingSite.baseUrl,
        apiEndpoint: editingSite.apiEndpoint,
        apiKey: editingSite.apiKey,
        secretKey: editingSite.secretKey || '',
        username: editingSite.username || '',
        authType: editingSite.authType,
        contentType: editingSite.contentType,
        brandId: editingSite.brandId,
        fieldMapping: JSON.stringify(fieldMapping, null, 2)
      });
    } else {
      // Reset form when not editing
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
    }

    // Reset visibility states when dialog opens/closes
    setShowApiKey(false);
    setShowSecretKey(false);
    setShowFieldMapping(false);
  }, [editingSite, open]);

  const handlePlatformChange = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platform,
      fieldMapping: JSON.stringify(DEFAULT_FIELD_MAPPINGS[platform as keyof typeof DEFAULT_FIELD_MAPPINGS] || DEFAULT_FIELD_MAPPINGS.CUSTOM_API, null, 2)
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let fieldMapping;
      try {
        fieldMapping = JSON.parse(formData.fieldMapping);
      } catch (error) {
        console.error('Error parsing field mapping JSON:', error);
        toast.error('Invalid field mapping JSON. Please check the format.');
        return;
      }

      const payload = {
        ...formData,
        config: {
          fieldMapping,
          contentType: formData.contentType
        }
      };

      await onSubmit(payload, !!editingSite);
      
      // Only reset form on success when not editing (editing will close modal)
      if (!editingSite) {
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
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle>{editingSite ? 'Edit External Blog Site' : 'Add External Blog Site'}</DialogTitle>
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

            {/* API Key with visibility toggle */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="apiKey">API Key / Token *</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  name="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={handleInputChange}
                  required
                  placeholder="Your API key or token"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
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

            {/* Secret Key with visibility toggle */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="secretKey">Secret Key (Optional)</Label>
              <div className="relative">
                <Input
                  id="secretKey"
                  name="secretKey"
                  type={showSecretKey ? "text" : "password"}
                  value={formData.secretKey}
                  onChange={handleInputChange}
                  placeholder="Your secret key if required"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                >
                  {showSecretKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
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

          {/* Collapsible Field Mapping Section */}
          <Collapsible open={showFieldMapping} onOpenChange={setShowFieldMapping}>
            <div className="space-y-4 border rounded-lg p-4">
              <CollapsibleTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="flex items-center justify-between w-full hover:bg-transparent"
                >
                  <div className="flex-1 text-left min-w-0">
                    <Label className="text-base font-medium block truncate">
                      Field Mapping Configuration
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1 break-words whitespace-normal">
                      Configure how your blog fields map to the external API (Advanced)
                    </p>
                  </div>
                  {showFieldMapping ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 pt-4">
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
              </CollapsibleContent>
            </div>
          </Collapsible>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (editingSite ? 'Updating...' : 'Adding...') 
                : (editingSite ? 'Update Site' : 'Add Site')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}