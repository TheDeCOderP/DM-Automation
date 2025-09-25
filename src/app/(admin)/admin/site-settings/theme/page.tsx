"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { toast } from "sonner";
import { 
  Palette, 
  Upload, 
  Save,
  Loader2,
  AlertTriangle,
  Trash2,
  Eye,
  Moon,
  Sun
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Image from "next/image";

// Form validation schema
const ThemeSettingsFormSchema = z.object({
  themeName: z.string().min(1, "Theme name is required"),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  tertiaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  font: z.string(),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").optional(),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").optional(),
  mode: z.enum(['LIGHT', 'DARK']),
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Font options
const fonts = [
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'poppins', label: 'Poppins' },
];

export default function ThemeSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [showThemePreview, setShowThemePreview] = useState(true);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  const { data, error, mutate } = useSWR('/api/site-settings/theme', fetcher);

  const form = useForm<z.infer<typeof ThemeSettingsFormSchema>>({
    resolver: zodResolver(ThemeSettingsFormSchema),
    defaultValues: {
      themeName: 'Default Theme',
      primaryColor: '#111CA8',
      secondaryColor: '#DE6A2C',
      tertiaryColor: '#8b5cf6',
      font: 'montserrat',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      mode: 'LIGHT',
    },
  });

  // Update form when data is loaded
  useEffect(() => {
    if (data?.data) {
      const theme = data.data;
      form.reset({
        themeName: theme.themeName || 'Prabisha Theme',
        primaryColor: theme.primaryColor || '#111CA8',
        secondaryColor: theme.secondaryColor || '#DE6A2C',
        tertiaryColor: theme.tertiaryColor || '#8b5cf6',
        font: theme.font || 'montserrat',
        backgroundColor: theme.backgroundColor || '#ffffff',
        textColor: theme.textColor || '#000000',
        mode: theme.mode || 'LIGHT',
      });
      setLogoPreview(theme.logoUrl || null);
      setFaviconPreview(theme.faviconUrl || null);
    }
  }, [data, form]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Logo file size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        setLogoFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) { // 1MB limit for favicon
        toast.error('Favicon file size must be less than 1MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFaviconPreview(result);
        setFaviconFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
  };

  const removeFavicon = () => {
    setFaviconPreview(null);
    setFaviconFile(null);
  };

  const onSubmit = async (values: z.infer<typeof ThemeSettingsFormSchema>) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      Object.keys(values).forEach(key => {
        formData.append(key, values[key as keyof typeof values] as string);
      });
      
      if (logoFile) formData.append('logo', logoFile);
      if (faviconFile) formData.append('favicon', faviconFile);
      
      // Try PUT first; if infra blocks PUT (405), retry with POST
      const doRequest = async () => {
        let res = await fetch('/api/site-settings/theme', { method: 'PUT', body: formData });
        if (res.status === 405) {
          res = await fetch('/api/site-settings/theme', { method: 'POST', body: formData });
        }
        return res;
      };

      const response = await doRequest();
      const result = await response.json();

      if (result.success) {
        toast.success('Theme settings updated successfully');
        mutate();
      } else {
        toast.error(result.error || 'Failed to update theme settings');
      }
    } catch (error) {
      console.error('Error updating theme settings:', error);
      toast.error('Failed to update theme settings');
    } finally {
      setIsLoading(false);
    }
  };

  const currentTheme = {
    primaryColor: form.watch('primaryColor') || '#111CA8',
    secondaryColor: form.watch('secondaryColor') || '#DE6A2C',
    tertiaryColor: form.watch('tertiaryColor') || '#8b5cf6',
    backgroundColor: form.watch('backgroundColor') || '#ffffff',
    textColor: form.watch('textColor') || '#000000',
    font: form.watch('font') || 'montserrat',
    mode: form.watch('mode') || 'LIGHT',
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load theme settings. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Theme Settings</h1>
        <p className="text-gray-600 mt-1 dark:text-gray-300">Customize the appearance of your application</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-24">
            <div className="space-y-4">
              {/* Theme & Color Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Theme & Colors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="themeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter theme name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme Mode</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select theme mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="LIGHT">
                                <div className="flex items-center gap-2">
                                  <Sun className="h-4 w-4" />
                                  Light
                                </div>
                              </SelectItem>
                              <SelectItem value="DARK">
                                <div className="flex items-center gap-2">
                                  <Moon className="h-4 w-4" />
                                  Dark
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="font"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font Family</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select font" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {fonts.map((font) => (
                                <SelectItem key={font.value} value={font.value}>
                                  {font.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="color" className="w-10 h-10 p-1" {...field} />
                              <Input placeholder="#111CA8" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="color" className="w-10 h-10 p-1" {...field} />
                              <Input placeholder="#DE6A2C" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tertiaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tertiary</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="color" className="w-10 h-10 p-1" {...field} />
                              <Input placeholder="#8b5cf6" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField
                      control={form.control}
                      name="backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Background</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="color" className="w-10 h-10 p-1" {...field} />
                              <Input placeholder="#ffffff" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="textColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Text</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="color" className="w-10 h-10 p-1" {...field} />
                              <Input placeholder="#000000" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                   </div>
                </CardContent>
              </Card>

              {/* Branding Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Logo</Label>
                      {logoPreview ? (
                        <div className="space-y-2">
                          <Image height={48} width={48} src={logoPreview} alt="Logo preview" className="h-12 w-auto rounded-lg border"/>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('logo-upload')?.click()}>
                              <Upload className="h-3 w-3 mr-2" /> Change
                            </Button>
                            <Button type="button" variant="destructive" size="sm" onClick={removeLogo}>
                              <Trash2 className="h-3 w-3 mr-2" /> Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-4 text-center flex flex-col items-center justify-center h-full">
                          <Button type="button" variant="outline" onClick={() => document.getElementById('logo-upload')?.click()}>
                            <Upload className="h-4 w-4 mr-2" /> Upload
                          </Button>
                          <p className="text-xs text-gray-500 mt-2">Max 5MB</p>
                        </div>
                      )}
                      <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden"/>
                    </div>
                    <div className="space-y-2">
                      <Label>Favicon</Label>
                      {faviconPreview ? (
                        <div className="space-y-2">
                          <Image height={48} width={48} src={faviconPreview} alt="Favicon preview" className="h-12 w-12 rounded border"/>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('favicon-upload')?.click()}>
                              <Upload className="h-3 w-3 mr-2" /> Change
                            </Button>
                            <Button type="button" variant="destructive" size="sm" onClick={removeFavicon}>
                              <Trash2 className="h-3 w-3 mr-2" /> Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-4 text-center flex flex-col items-center justify-center h-full">
                           <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('favicon-upload')?.click()}>
                            <Upload className="h-4 w-4 mr-2" /> Upload
                          </Button>
                          <p className="text-xs text-gray-500 mt-1">Max 1MB</p>
                        </div>
                      )}
                      <input id="favicon-upload" type="file" accept="image/*" onChange={handleFaviconUpload} className="hidden"/>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {/* Theme Preview Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Live Preview
                    </CardTitle>
                    <Switch 
                        checked={showThemePreview} 
                        onCheckedChange={setShowThemePreview}
                      />
                  </div>
                </CardHeader>
                {showThemePreview && (
                  <CardContent>
                    <div 
                      className="p-4 rounded-lg border space-y-6 text-sm"
                      style={{
                        backgroundColor: currentTheme.backgroundColor,
                        color: currentTheme.textColor,
                        fontFamily: `var(--font-${currentTheme.font})`,
                      }}
                    >
                      {/* Mock Header */}
                      <div className="flex items-center justify-between pb-2 border-b">
                        {logoPreview ? (
                          <Image height={32} width={32} src={logoPreview} alt="Logo" className="h-8 w-auto" />
                        ) : (
                          <div className="h-8 w-24 bg-gray-300 rounded animate-pulse" />
                        )}
                        <div className="flex items-center gap-4 text-xs">
                          <span>Home</span>
                          <span className="opacity-70">About</span>
                          <span className="opacity-70">Contact</span>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-lg">Sample Page Title</h4>
                        <p className="opacity-90">
                          This is a paragraph demonstrating the body text. The quick brown fox jumps over the lazy dog.
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <Button style={{ backgroundColor: currentTheme.primaryColor, color: '#ffffff' }}>Primary</Button>
                          <Button style={{ backgroundColor: currentTheme.secondaryColor, color: '#ffffff' }}>Secondary</Button>
                          <Button variant="outline">Outline</Button>
                          <Button variant="ghost">Ghost</Button>
                          <Button disabled>Disabled</Button>
                        </div>

                        <Card className="p-4" style={{ backgroundColor: currentTheme.tertiaryColor, color: '#ffffff' }}>
                          <h5 className="font-semibold">Card with Tertiary Color</h5>
                          <p className="text-xs opacity-90 mt-1">This card uses the tertiary background color.</p>
                        </Card>

                        <Input placeholder="Example input field..." />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>

          {/* Save Button */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur py-4 px-6 border-t -mx-6 -mb-6">
            <div className="flex justify-end max-w-7xl mx-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                className="mr-2"
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button type="submit" disabled={isLoading} className="min-w-[120px]">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Theme
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
