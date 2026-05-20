'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Eye, Bot, Send, Trash2, Pencil, CheckCircle2, Clock, Image as ImageIcon, FileText, Database, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { formatDate } from '@/utils/format';
import GenerateBlogModal from './_components/GenerateBlogModal';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Brand { id: string; name: string; logo?: string; description?: string; }
interface DbConnection { id: string; name: string; dbType: string; }
interface BlogAutomation {
  id: string; title: string; status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
  scheduledAt?: string; publishedAt?: string; externalId?: string; errorMessage?: string;
  bannerUrl?: string; bannerPrompt?: string; createdAt: string; calendarId?: string;
  dbConnection?: { id: string; name: string; dbType: string } | null;
  calendar?: { id: string; title: string } | null;
}

const STATUS_CONFIG = {
  DRAFT:     { label: 'Draft',     icon: FileText,      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  SCHEDULED: { label: 'Scheduled', icon: Clock,         className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  PUBLISHED: { label: 'Published', icon: CheckCircle2,  className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  FAILED:    { label: 'Failed',    icon: XCircle,       className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

interface BrandStats {
  total: number; published: number; scheduled: number; draft: number; failed: number; withImages: number;
}

export default function BlogAutomationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandIdFromUrl = searchParams.get('brandId') || '';

  const [selectedBrandId, setSelectedBrandId] = useState(brandIdFromUrl);
  const [showModal, setShowModal] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [brandStats, setBrandStats] = useState<Record<string, BrandStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [imagePopup, setImagePopup] = useState<{ id: string; prompt: string; generatedUrl: string } | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  const { data: brandsData, isLoading: isLoadingBrands } = useSWR('/api/brands', fetcher);
  const brands: Brand[] = brandsData?.data || [];

  useEffect(() => {
    if (brandIdFromUrl) setSelectedBrandId(brandIdFromUrl);
  }, [brandIdFromUrl]);

  // Fetch stats for all brands
  useEffect(() => {
    if (brands.length === 0) return;
    setLoadingStats(true);
    Promise.all(
      brands.map(async brand => {
        try {
          const res = await fetch(`/api/blogs/automation?brandId=${brand.id}`);
          const data = await res.json();
          const automations: BlogAutomation[] = data.automations || [];
          return {
            brandId: brand.id,
            stats: {
              total: automations.length,
              published: automations.filter(a => a.status === 'PUBLISHED').length,
              scheduled: automations.filter(a => a.status === 'SCHEDULED').length,
              draft: automations.filter(a => a.status === 'DRAFT').length,
              failed: automations.filter(a => a.status === 'FAILED').length,
              withImages: automations.filter(a => a.bannerUrl).length,
            },
          };
        } catch {
          return { brandId: brand.id, stats: { total: 0, published: 0, scheduled: 0, draft: 0, failed: 0, withImages: 0 } };
        }
      })
    ).then(results => {
      const map: Record<string, BrandStats> = {};
      results.forEach(r => { map[r.brandId] = r.stats; });
      setBrandStats(map);
      setLoadingStats(false);
    });
  }, [brands.length]);

  // Selected brand's automations
  const swrKey = selectedBrandId ? `/api/blogs/automation?brandId=${selectedBrandId}` : null;
  const { data: automationsData, isLoading: isLoadingAutomations, mutate } = useSWR(swrKey, fetcher);
  const automations: BlogAutomation[] = automationsData?.automations || [];

  // DB connections for selected brand
  const { data: connData } = useSWR(
    selectedBrandId ? `/api/blogs/db-connections?brandId=${selectedBrandId}` : null, fetcher
  );
  const connections: DbConnection[] = connData?.connections || [];

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  const refreshAll = () => {
    mutate();
    // refresh stats for this brand
    if (selectedBrandId && brands.length > 0) {
      fetch(`/api/blogs/automation?brandId=${selectedBrandId}`)
        .then(r => r.json())
        .then(data => {
          const automations: BlogAutomation[] = data.automations || [];
          setBrandStats(prev => ({
            ...prev,
            [selectedBrandId]: {
              total: automations.length,
              published: automations.filter(a => a.status === 'PUBLISHED').length,
              scheduled: automations.filter(a => a.status === 'SCHEDULED').length,
              draft: automations.filter(a => a.status === 'DRAFT').length,
              failed: automations.filter(a => a.status === 'FAILED').length,
              withImages: automations.filter(a => a.bannerUrl).length,
            },
          }));
        });
    }
  };

  const handlePublish = async (automation: BlogAutomation) => {
    if (!automation.dbConnection) { toast.error('No DB connection linked. Edit the post to add one.'); return; }
    setPublishing(automation.id);
    try {
      const res = await fetch(`/api/blogs/automation/${automation.id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) { toast.success('Blog published successfully!'); refreshAll(); }
      else toast.error(data.error || 'Publish failed');
    } finally { setPublishing(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/blogs/automation/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      refreshAll();
    } finally { setDeleting(null); }
  };

  const handleGenerateImage = async () => {
    if (!imagePopup) return;
    if (!imagePopup.prompt.trim()) { toast.error('Enter an image prompt first'); return; }
    setGeneratingImage(true);
    try {
      const res = await fetch('/api/ai-agent/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePopup.prompt, aspectRatio: '16:9' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed');
      setImagePopup(p => p ? { ...p, generatedUrl: data.imageUrl } : p);
      toast.success('Image generated!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSaveImage = async () => {
    if (!imagePopup?.generatedUrl) return;
    setSavingImage(true);
    try {
      const res = await fetch(`/api/blogs/automation/${imagePopup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerUrl: imagePopup.generatedUrl, bannerPrompt: imagePopup.prompt }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Image saved!');
      setImagePopup(null);
      refreshAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingImage(false);
    }
  };

  // ── Brand table (no brand selected) ─────────────────────────────────────────
  if (!selectedBrandId) {
    return (
      <div className="container mx-auto p-2 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bot className="w-7 h-7 text-primary" /> Blog Automation
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-generated, SEO-optimised blog posts published directly to your portal databases
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Brands & Blog Status</CardTitle>
            <CardDescription>View blog automation status for each brand and generate new posts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">S. No.</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-center">Total Posts</TableHead>
                  <TableHead className="text-center">Published</TableHead>
                  <TableHead className="text-center">Scheduled</TableHead>
                  <TableHead className="text-center">Draft / Failed</TableHead>
                  <TableHead className="text-center">With Images</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingBrands ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                        <p className="text-muted-foreground">Loading brands...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : brands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No brands found. Create a brand first to generate blog posts.
                    </TableCell>
                  </TableRow>
                ) : (
                  brands.map((brand, index) => {
                    const stats = brandStats[brand.id] ?? { total: 0, published: 0, scheduled: 0, draft: 0, failed: 0, withImages: 0 };
                    const hasContent = stats.total > 0;

                    return (
                      <TableRow key={brand.id}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            {brand.logo ? (
                              <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-lg font-bold text-primary">{brand.name.charAt(0)}</span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{brand.name}</p>
                              {brand.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-xs">{brand.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-2xl font-bold">{loadingStats ? '–' : stats.total}</span>
                            {stats.total > 0 && (
                              <span className="text-xs text-muted-foreground">posts</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          {loadingStats ? (
                            <span className="text-muted-foreground">–</span>
                          ) : stats.published > 0 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> {stats.published}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {loadingStats ? (
                            <span className="text-muted-foreground">–</span>
                          ) : stats.scheduled > 0 ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Clock className="w-3 h-3 mr-1" /> {stats.scheduled}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {loadingStats ? (
                            <span className="text-muted-foreground">–</span>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              {stats.draft > 0 && (
                                <Badge variant="outline" className="text-xs text-gray-600">{stats.draft} Draft</Badge>
                              )}
                              {stats.failed > 0 && (
                                <Badge variant="outline" className="text-xs text-red-600 border-red-200">{stats.failed} Failed</Badge>
                              )}
                              {stats.draft === 0 && stats.failed === 0 && (
                                <span className="text-muted-foreground text-sm">0</span>
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-lg font-semibold">{loadingStats ? '–' : stats.withImages}</span>
                              {!loadingStats && <span className="text-muted-foreground">/ {stats.total}</span>}
                            </div>
                            {stats.total > 0 && (
                              <div className="w-20 bg-muted rounded-full h-1.5">
                                <div
                                  className="bg-primary h-1.5 rounded-full transition-all"
                                  style={{ width: `${(stats.withImages / stats.total) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {hasContent && (
                              <Button variant="outline" size="sm" onClick={() => {
                                setSelectedBrandId(brand.id);
                                router.push(`/blogs/automation?brandId=${brand.id}`);
                              }}>
                                <Eye className="w-4 h-4 mr-1" /> View ({stats.total})
                              </Button>
                            )}
                            <Button variant="default" size="sm" onClick={() => {
                              setSelectedBrandId(brand.id);
                              setShowModal(true);
                            }}>
                              <Plus className="w-4 h-4 mr-1" /> Generate
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {showModal && selectedBrandId && (
          <GenerateBlogModal
            brandId={selectedBrandId}
            connections={connections}
            onClose={() => { setShowModal(false); setSelectedBrandId(''); }}
            onSuccess={() => {
              setShowModal(false);
              setSelectedBrandId('');
              // re-fetch stats
              const bid = selectedBrandId;
              fetch(`/api/blogs/automation?brandId=${bid}`)
                .then(r => r.json())
                .then(data => {
                  const list: BlogAutomation[] = data.automations || [];
                  setBrandStats(prev => ({
                    ...prev,
                    [bid]: {
                      total: list.length,
                      published: list.filter(a => a.status === 'PUBLISHED').length,
                      scheduled: list.filter(a => a.status === 'SCHEDULED').length,
                      draft: list.filter(a => a.status === 'DRAFT').length,
                      failed: list.filter(a => a.status === 'FAILED').length,
                      withImages: list.filter(a => a.bannerUrl).length,
                    },
                  }));
                });
              toast.success('Blogs generated successfully!');
            }}
          />
        )}
      </div>
    );
  }

  // ── Brand selected — card grid ───────────────────────────────────────────────
  return (
    <div className="container mx-auto p-2 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Blog Automation</h1>
          <p className="text-muted-foreground mt-1">
            AI-generated blog posts published directly to your portal databases
          </p>
        </div>
        <Button variant="outline" onClick={() => { setSelectedBrandId(''); router.push('/blogs/automation'); }}>
          ← Back to All Brands
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedBrand?.logo ? (
                <img src={selectedBrand.logo} alt={selectedBrand.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{selectedBrand?.name?.charAt(0)}</span>
                </div>
              )}
              <div>
                <CardTitle>{selectedBrand?.name} — Blog Posts</CardTitle>
                <CardDescription>
                  {automations.length} post{automations.length !== 1 ? 's' : ''} generated
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Generate New Blogs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAutomations ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                <p className="text-muted-foreground">Loading blog posts...</p>
              </div>
            </div>
          ) : automations.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No blog posts generated yet</p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" /> Generate Your First Blog
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-36">Date</TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map((automation, index) => {
                  const cfg = STATUS_CONFIG[automation.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow
                      key={automation.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/blogs/automation/${automation.id}?brandId=${selectedBrandId}`)}
                    >
                      <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          {automation.bannerUrl ? (
                            <img src={automation.bannerUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                          ) : (
                            <div
                              className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 cursor-pointer hover:bg-muted/70 hover:ring-2 hover:ring-primary/40 transition-all group/img"
                              title="Generate image"
                              onClick={e => { e.stopPropagation(); setImagePopup({ id: automation.id, prompt: automation.bannerPrompt || '', generatedUrl: '' }); }}
                            >
                              <Sparkles className="w-4 h-4 text-muted-foreground group-hover/img:text-primary transition-colors" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-xs">{automation.title}</p>
                            {automation.calendar && (
                              <p className="text-xs text-muted-foreground truncate">{automation.calendar.title}</p>
                            )}
                            {automation.errorMessage && (
                              <p className="text-xs text-red-500 truncate">Error: {automation.errorMessage}</p>
                            )}
                            {automation.externalId && (
                              <p className="text-xs text-green-600 truncate">ID: {automation.externalId}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
                          <StatusIcon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {automation.publishedAt ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                            {formatDate(automation.publishedAt)}
                          </span>
                        ) : automation.scheduledAt ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {formatDate(automation.scheduledAt)}
                          </span>
                        ) : (
                          formatDate(automation.createdAt)
                        )}
                      </TableCell>

                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {(automation.status === 'DRAFT' || automation.status === 'FAILED') && automation.dbConnection && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                              onClick={() => handlePublish(automation)} disabled={publishing === automation.id}>
                              <Send className="w-3 h-3 mr-1" />
                              {publishing === automation.id ? 'Publishing...' : 'Publish'}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                            onClick={() => router.push(`/blogs/automation/${automation.id}?brandId=${selectedBrandId}`)}>
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(automation.id)} disabled={deleting === automation.id}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <GenerateBlogModal
          brandId={selectedBrandId}
          connections={connections}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            refreshAll();
            toast.success('Blog posts generated successfully!');
          }}
        />
      )}

      <Dialog open={!!imagePopup} onOpenChange={open => { if (!open) setImagePopup(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Generate Banner Image
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Image Prompt</label>
              <Input
                value={imagePopup?.prompt ?? ''}
                onChange={e => setImagePopup(p => p ? { ...p, prompt: e.target.value } : p)}
                placeholder="Describe the image..."
              />
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleGenerateImage}
              disabled={generatingImage || !imagePopup?.prompt?.trim()}
            >
              {generatingImage ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 text-purple-500" /> Generate Image</>
              )}
            </Button>

            {imagePopup?.generatedUrl && (
              <img
                src={imagePopup.generatedUrl}
                alt="Generated banner"
                className="w-full h-48 object-cover rounded-lg border"
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setImagePopup(null)}>Cancel</Button>
            <Button onClick={handleSaveImage} disabled={!imagePopup?.generatedUrl || savingImage}>
              {savingImage ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</> : 'Save Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
