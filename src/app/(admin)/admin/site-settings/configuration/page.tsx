"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  AlertTriangle,
  Globe,
  Mail,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Form validation schema
const SiteConfigFormSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  domain: z.string().min(1, "Domain is required"),
  supportEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
  whatsappNumber: z.string().optional(),
  googleAnalyticsId: z.string().optional(),
  metaPixelId: z.string().optional(),
  gaPropertyId: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  twitterHandle: z.string().optional(),
  ogType: z.string().optional(),
  robotsEnabled: z.boolean().default(true).optional(),
  robotsDisallow: z.string().optional(),
  robotsAllow: z.string().optional(),
  sitemapEnabled: z.boolean().default(true).optional(),
  sitemapExtraUrls: z.string().optional(), // CSV list
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SiteConfigPage() {
  const [isLoading, setIsLoading] = useState(false);

  const { data, error, mutate } = useSWR('/api/site-settings/configuration', fetcher);

  const form = useForm<z.infer<typeof SiteConfigFormSchema>>({
    resolver: zodResolver(SiteConfigFormSchema),
    defaultValues: {
      siteName: '',
      domain: '',
      supportEmail: '',
      whatsappNumber: '',
      googleAnalyticsId: '',
      metaPixelId: '',
      gaPropertyId: '',
      metaTitle: '',
      metaDescription: '',
      twitterHandle: '',
      ogType: 'website',
      robotsEnabled: true,
      robotsDisallow: '',
      robotsAllow: '',
      sitemapEnabled: true,
      sitemapExtraUrls: '',
    },
  });

  // Update form when data is loaded
  useEffect(() => {
    if (data?.data) {
      const config = data.data;
      form.reset({
        siteName: config.siteName || '',
        domain: config.domain || '',
        supportEmail: config.supportEmail || '',
        whatsappNumber: config.whatsappNumber || '',
        googleAnalyticsId: config.googleAnalyticsId || '',
        metaPixelId: config.metaPixelId || '',
        gaPropertyId: config.gaPropertyId || '',
        metaTitle: config.metaTitle || '',
        metaDescription: config.metaDescription || '',
        twitterHandle: config.twitterHandle || '',
        ogType: config.ogType || 'website',
        robotsEnabled: config.robotsEnabled ?? true,
        robotsDisallow: config.robotsDisallow || '',
        robotsAllow: config.robotsAllow || '',
        sitemapEnabled: config.sitemapEnabled ?? true,
        sitemapExtraUrls: Array.isArray(config.sitemapExtraUrls) ? config.sitemapExtraUrls.join(',') : (config.sitemapExtraUrls || ''),
      });
    }
  }, [data, form]);

  const onSubmit = async (values: z.infer<typeof SiteConfigFormSchema>) => {
    setIsLoading(true);
    
    try {
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                // convert CSV to array for sitemapExtraUrls
                if (key === 'sitemapExtraUrls' && typeof value === 'string') {
                  formData.append(key, value);
                } else {
                  formData.append(key, value as string);
                }
            }
        });
        // Append GA credentials file if chosen
        const gaFileInput = document.querySelector<HTMLInputElement>('input[name="gaCredentials"]');
        const gaFile = gaFileInput?.files?.[0];
        if (gaFile) formData.append('gaCredentials', gaFile);
        // Append SEO site image if chosen
        const siteImgInput = document.querySelector<HTMLInputElement>('input[name="siteImage"]');
        const siteImg = siteImgInput?.files?.[0];
        if (siteImg) formData.append('siteImage', siteImg);

        const response = await fetch('/api/site-settings/configuration', {
            method: 'PUT',
            body: formData,
        });

        const result = await response.json();

        if (response.ok) {
            toast.success('Site configuration updated successfully');
            mutate(); // Refresh the data
        } else {
            toast.error(result.error || 'Failed to update site configuration');
        }
    } catch (error) {
      console.error('Error updating site configuration:', error);
      toast.error('Failed to update site configuration');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load site configuration. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Site Configuration</h1>
        <p className="text-gray-600 mt-1 dark:text-white">Manage your site&apos;s global settings and configurations</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-24">
            <div className="space-y-6">
              {/* Basic Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your site name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain *</FormLabel>
                        <FormControl>
                          <Input placeholder="example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Contact Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="supportEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Support Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="support@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsappNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Analytics & Tracking Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Analytics & Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="googleAnalyticsId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Analytics ID</FormLabel>
                        <FormControl>
                          <Input placeholder="G-XXXXXXXXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metaPixelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Pixel ID</FormLabel>
                        <FormControl>
                          <Input placeholder="XXXXXXXXXXXXXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="gaPropertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GA4 Property ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 494804041" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-2">
                    <Label>Service Account JSON</Label>
                    <Input
                      type="file"
                      accept="application/json"
                      name="gaCredentials"
                    />
                    <p className="text-sm text-muted-foreground">
                      Upload the Google service account JSON.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* SEO Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    SEO
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Default site title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Default site description..." rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-2">
                    <Label>Site Image (1200x630)</Label>
                    <Input type="file" accept="image/*" name="siteImage" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="twitterHandle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Twitter Handle</FormLabel>
                          <FormControl>
                            <Input placeholder="@yourhandle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ogType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OpenGraph Type</FormLabel>
                          <FormControl>
                            <Input placeholder="website" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-4">
                    <FormField
                        control={form.control}
                        name="robotsEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between w-full">
                            <FormLabel>Enable robots.txt</FormLabel>
                            <FormControl>
                              <input type="checkbox" className="h-4 w-4" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                    <FormField
                      control={form.control}
                      name="robotsDisallow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Disallow (one per line)</FormLabel>
                          <FormControl>
                            <Textarea rows={3} placeholder="/admin\n/private" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="robotsAllow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allow (one per line)</FormLabel>
                          <FormControl>
                            <Textarea rows={3} placeholder="/public" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <FormField
                        control={form.control}
                        name="sitemapEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between w-full">
                            <FormLabel>Enable sitemap.xml</FormLabel>
                            <FormControl>
                              <input type="checkbox" className="h-4 w-4" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                    <FormField
                      control={form.control}
                      name="sitemapExtraUrls"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional URLs (CSV)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/extra1, https://example.com/extra2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Save Button */}
          <div className="sticky bottom-0 dark:bg-gray-900 bg-background/95 backdrop-blur py-4 px-6 border-t -mx-6 -mb-6">
            <div className="flex justify-end max-w-7xl mx-auto">
              <Button type="submit" disabled={isLoading} className="min-w-[120px] dark:bg-white">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
