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
    excerpt: 'excerpt',
    banner: 'featured_media',
    slug: 'slug',
    tags: 'tags',
    status: 'status'
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
    excerpt: 'excerpt',
    banner: 'banner_image',
    slug: 'slug',
    tags: 'tags'
  }
};

interface SiteFormData {
  name: string;
  platform: string;
  baseUrl: string;
  apiEndpoint: string;
  apiKey: string;
  secretKey: string;
  username: string;
  authType: string;
  contentType: string;
  brandId: string;
  fieldMapping: string;
}

interface SiteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: Brand[];
  onSubmit: (formData: SiteFormPayload, isEditing?: boolean) => Promise<void>;
  editingSite?: ExternalBlogSite | null;
}

interface SiteFormPayload {
  name: string;
  platform: string;
  baseUrl: string;
  apiEndpoint: string;
  apiKey: string;
  secretKey: string;
  username: string;
  authType: string;
  contentType: string;
  brandId: string;
  config: {
    fieldMapping: Record<string, string>;
    contentType: string;
  };
}

export default function SiteForm({
  open,
  onOpenChange,
  brands,
  onSubmit,
  editingSite
}: SiteFormProps) {
  const [formData, setFormData] = useState<SiteFormData>({
    name: '',
    platform: 'WORDPRESS',
    baseUrl: '',
    apiEndpoint: '',
    apiKey: '',
    secretKey: '',
    username: '',
    authType: 'BASIC_AUTH', // WordPress uses Basic Auth by default
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
        authType: 'BASIC_AUTH',
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
    // Set default auth type based on platform
    let defaultAuthType = 'API_KEY';
    if (platform === 'WORDPRESS') {
      defaultAuthType = 'BASIC_AUTH';
    }
    
    setFormData(prev => ({
      ...prev,
      platform,
      authType: defaultAuthType,
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

  const handleSelectChange = (name: keyof SiteFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let fieldMapping: Record<string, string>;
      try {
        fieldMapping = JSON.parse(formData.fieldMapping);
      } catch (error) {
        console.error('Error parsing field mapping JSON:', error);
        toast.error('Invalid field mapping JSON. Please check the format.');
        return;
      }

      const payload: SiteFormPayload = {
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
          authType: 'BASIC_AUTH',
          contentType: 'application/json',
          brandId: '',
          fieldMapping: JSON.stringify(DEFAULT_FIELD_MAPPINGS.WORDPRESS, null, 2)
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get platform-specific help text
  const getPlatformHelp = () => {
    switch (formData.platform) {
      case 'WORDPRESS':
        return {
          baseUrlPlaceholder: 'https://yourdomain.com',
          baseUrlHelp: 'Your WordPress site URL (without trailing slash)',
          apiEndpointPlaceholder: '/wp-json/wp/v2/posts',
          apiEndpointHelp: 'Standard WordPress REST API endpoint',
          authLabel: 'WordPress Username',
          authPlaceholder: 'admin',
          authHelp: 'Your WordPress admin username',
          tokenLabel: 'Application Password',
          tokenPlaceholder: 'xxxx xxxx xxxx xxxx xxxx xxxx',
          tokenHelp: 'Generate this from WordPress Users → Profile → Application Passwords',
          defaultAuthType: 'BASIC_AUTH',
          showAuthType: false, // Hide auth type selector for WordPress
        };
      case 'HASHNODE':
        return {
          baseUrlPlaceholder: 'https://api.hashnode.com',
          baseUrlHelp: 'Hashnode API URL',
          apiEndpointPlaceholder: '/graphql',
          apiEndpointHelp: 'Hashnode GraphQL endpoint',
          authLabel: 'Publication ID',
          authPlaceholder: 'Your publication ID',
          authHelp: 'Find this in your Hashnode dashboard',
          tokenLabel: 'API Token',
          tokenPlaceholder: 'Your Hashnode API token',
          tokenHelp: 'Generate from Hashnode Settings → Developer',
          defaultAuthType: 'API_KEY',
          showAuthType: false,
        };
      case 'DEV_TO':
        return {
          baseUrlPlaceholder: 'https://dev.to',
          baseUrlHelp: 'Dev.to API URL',
          apiEndpointPlaceholder: '/api/articles',
          apiEndpointHelp: 'Dev.to articles endpoint',
          authLabel: 'Username (Optional)',
          authPlaceholder: 'your-username',
          authHelp: 'Your Dev.to username',
          tokenLabel: 'API Key',
          tokenPlaceholder: 'Your Dev.to API key',
          tokenHelp: 'Generate from Dev.to Settings → Extensions → DEV API Keys',
          defaultAuthType: 'API_KEY',
          showAuthType: false,
        };
      default:
        return {
          baseUrlPlaceholder: 'https://api.example.com',
          baseUrlHelp: 'Base URL of your API',
          apiEndpointPlaceholder: '/posts',
          apiEndpointHelp: 'API endpoint for creating posts',
          authLabel: 'Username',
          authPlaceholder: 'username',
          authHelp: 'Username if using Basic Auth',
          tokenLabel: 'API Key / Token',
          tokenPlaceholder: 'Your API key or token',
          tokenHelp: 'Authentication token for your API',
          defaultAuthType: 'API_KEY',
          showAuthType: true,
        };
    }
  };

  const platformHelp = getPlatformHelp();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle>{editingSite ? 'Edit External Blog Site' : 'Add External Blog Site'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Site Configuration */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Site URL *</Label>
            <Input
              id="baseUrl"
              name="baseUrl"
              type="url"
              value={formData.baseUrl}
              onChange={handleInputChange}
              required
              placeholder={platformHelp.baseUrlPlaceholder}
            />
            <p className="text-xs text-muted-foreground">{platformHelp.baseUrlHelp}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API Endpoint *</Label>
            <Input
              id="apiEndpoint"
              name="apiEndpoint"
              value={formData.apiEndpoint}
              onChange={handleInputChange}
              required
              placeholder={platformHelp.apiEndpointPlaceholder}
            />
            <p className="text-xs text-muted-foreground">{platformHelp.apiEndpointHelp}</p>
          </div>

          {/* Authentication Section */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-medium">Authentication</h3>
            
            {platformHelp.showAuthType && (
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
            )}

            {(formData.authType === 'BASIC_AUTH' || formData.platform === 'WORDPRESS') && (
              <div className="space-y-2">
                <Label htmlFor="username">{platformHelp.authLabel} *</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required={formData.platform === 'WORDPRESS'}
                  placeholder={platformHelp.authPlaceholder}
                />
                <p className="text-xs text-muted-foreground">{platformHelp.authHelp}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="apiKey">{platformHelp.tokenLabel} *</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  name="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={handleInputChange}
                  required
                  placeholder={platformHelp.tokenPlaceholder}
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
              <p className="text-xs text-muted-foreground">{platformHelp.tokenHelp}</p>
            </div>
          </div>

          {/* Advanced Settings - Collapsible */}
          <Collapsible open={showFieldMapping} onOpenChange={setShowFieldMapping}>
            <div className="border rounded-lg">
              <CollapsibleTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="flex items-center justify-between w-full p-4 hover:bg-transparent"
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium">Advanced Settings</p>
                    <p className="text-xs text-muted-foreground">
                      Field mapping, content type, and other options
                    </p>
                  </div>
                  {showFieldMapping ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="px-4 pb-4 space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="fieldMapping">Field Mapping (JSON)</Label>
                  <Textarea
                    id="fieldMapping"
                    name="fieldMapping"
                    value={formData.fieldMapping}
                    onChange={handleInputChange}
                    rows={6}
                    className="font-mono text-xs"
                    placeholder='{"title": "title", "content": "content"}'
                  />
                  <p className="text-xs text-muted-foreground">
                    Map your blog fields to the external API fields
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secretKey">Secret Key (Optional)</Label>
                  <div className="relative">
                    <Input
                      id="secretKey"
                      name="secretKey"
                      type={showSecretKey ? "text" : "password"}
                      value={formData.secretKey}
                      onChange={handleInputChange}
                      placeholder="Additional secret key if required"
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