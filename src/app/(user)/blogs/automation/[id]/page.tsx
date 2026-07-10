'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Send, FileText, Globe, Image as ImageIcon, X, Plus, Hash, Calendar, Tag, Building, HelpCircle, Upload, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PortalTagSelect } from './_components/PortalTagSelect';

const TinyEditor = dynamic(() => import('../create/_components/TinyEditor'), { ssr: false });
const AIImageGen = dynamic(() => import('../create/_components/AIImageGen'), { ssr: false });

const fetcher = (url: string) => fetch(url).then(r => r.json());

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState('');
  const add = () => {
    const t = val.trim();
    if (t && !tags.includes(t)) { onChange([...tags, t]); setVal(''); }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Add tag..." value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} className="h-9" />
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="w-4 h-4" /></Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <Badge key={t} variant="secondary" className="gap-1">
              <Hash className="w-3 h-3" /> {t}
              <button onClick={() => onChange(tags.filter(x => x !== t))} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EditBlogAutomationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandId = searchParams.get('brandId') || '';

  const { data } = useSWR(id ? `/api/blogs/automation/${id}` : null, fetcher, { revalidateOnFocus: false });
  const { data: connData } = useSWR(brandId ? `/api/blogs/db-connections?brandId=${brandId}` : null, fetcher);

  const automation = data?.automation;
  const connections = connData?.connections || [];

  const [form, setForm] = useState({
    title: '', slug: '', content: '', excerpt: '',
    tags: [] as string[],
    seoTitle: '', seoDescription: '', seoKeywords: '', canonicalUrl: '',
    bannerUrl: '', bannerPrompt: '',
    dbConnectionId: '', scheduledAt: '',
    articleSection: '',
    faqs: [] as { question: string; answer: string }[],
    selectedCategories: [] as string[],
    selectedIndustries: [] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [portalCategories, setPortalCategories] = useState<string[]>([]);
  const [portalIndustries, setPortalIndustries] = useState<string[]>([]);
  const [loadingPortalTags, setLoadingPortalTags] = useState(false);

  const formInitialized = useRef(false);

  useEffect(() => {
    if (automation && !formInitialized.current) {
      formInitialized.current = true;
      let parsedFaqs: { question: string; answer: string }[] = [];
      try {
        const raw = automation.faqs;
        if (typeof raw === 'string') parsedFaqs = JSON.parse(raw);
        else if (Array.isArray(raw)) parsedFaqs = raw;
      } catch { /* keep empty */ }

      setForm({
        title: automation.title || '',
        slug: automation.slug || '',
        content: automation.content || '',
        excerpt: automation.excerpt || '',
        tags: Array.isArray(automation.tags) ? automation.tags : [],
        seoTitle: automation.seoTitle || '',
        seoDescription: automation.seoDescription || '',
        seoKeywords: automation.seoKeywords || '',
        canonicalUrl: automation.canonicalUrl || '',
        bannerUrl: automation.bannerUrl || '',
        bannerPrompt: automation.bannerPrompt || '',
        dbConnectionId: automation.dbConnectionId || '',
        scheduledAt: automation.scheduledAt
          ? (() => {
              const d = new Date(automation.scheduledAt);
              const pad = (n: number) => String(n).padStart(2, '0');
              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            })()
          : '',
        articleSection: automation.articleSection || '',
        faqs: parsedFaqs,
        selectedCategories: Array.isArray(automation.selectedCategories) ? automation.selectedCategories : [],
        selectedIndustries: Array.isArray(automation.selectedIndustries) ? automation.selectedIndustries : [],
      });
    }
  }, [automation]);

  useEffect(() => {
    if (!form.dbConnectionId) { setPortalCategories([]); setPortalIndustries([]); return; }
    const controller = new AbortController();
    setLoadingPortalTags(true);
    fetch(`/api/blogs/db-connections/${form.dbConnectionId}/lookup`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setPortalCategories(data.categories || []);
        setPortalIndustries(data.industries || []);
      })
      .catch(e => { if (e.name !== 'AbortError') { setPortalCategories([]); setPortalIndustries([]); } })
      .finally(() => setLoadingPortalTags(false));
    return () => controller.abort();
  }, [form.dbConnectionId]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'blog-banners');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set('bannerUrl', data.url);
      toast.success('Image uploaded!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
    setSaving(true);
    try {
      const status = isPublished ? 'PUBLISHED' : (form.scheduledAt ? 'SCHEDULED' : 'DRAFT');
      const res = await fetch(`/api/blogs/automation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          faqs: form.faqs.length ? JSON.stringify(form.faqs) : null,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
          status,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(isPublished ? 'Changes saved!' : (form.scheduledAt ? 'Blog scheduled!' : 'Blog saved!'));
      router.push(`/blogs/automation?brandId=${brandId}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!form.dbConnectionId) { toast.error('Select a DB connection first'); return; }
    setPublishing(true);
    try {
      const putRes = await fetch(`/api/blogs/automation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, faqs: form.faqs.length ? JSON.stringify(form.faqs) : null, scheduledAt: null }),
      });
      if (!putRes.ok) throw new Error((await putRes.json()).error || 'Failed to save before publishing');
      const res = await fetch(`/api/blogs/automation/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Published to your portal!');
      router.push(`/blogs/automation?brandId=${brandId}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPublishing(false);
    }
  };

  if (!automation) return <div className="text-muted-foreground p-8">Loading...</div>;

  const isPublished = automation.status === 'PUBLISHED';

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/blogs/automation?brandId=${brandId}`)} className="mb-3 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold">Edit Blog Post</h1>
          <Badge variant={
            automation.status === 'PUBLISHED' ? 'default' :
            automation.status === 'SCHEDULED' ? 'secondary' :
            automation.status === 'FAILED' ? 'destructive' : 'outline'
          }>{automation.status}</Badge>
        </div>
      </div>

      {isPublished && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">This post is live</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              Published {automation.publishedAt ? new Date(automation.publishedAt).toLocaleString() : ''}
              {automation.externalId && <> · External ID: <span className="font-mono">{automation.externalId}</span></>}
            </p>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 shrink-0">Editing will not auto-update the live post — use Re-publish.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-2">
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Target DB Connection</Label>
                <Select value={form.dbConnectionId} onValueChange={v => set('dbConnectionId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select connection..." /></SelectTrigger>
                  <SelectContent>
                    {connections.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isPublished && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Schedule</Label>
                  <Input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} />
                </div>
              )}
              {automation.errorMessage && (
                <p className="text-xs text-red-500">{automation.errorMessage}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="content">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="content"><FileText className="w-4 h-4 mr-1.5" /> Content</TabsTrigger>
              <TabsTrigger value="media"><ImageIcon className="w-4 h-4 mr-1.5" /> Media</TabsTrigger>
              <TabsTrigger value="seo"><Globe className="w-4 h-4 mr-1.5" /> SEO</TabsTrigger>
              <TabsTrigger value="portal"><Building className="w-4 h-4 mr-1.5" /> Portal</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <Card><CardContent className="pt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => {
                    set('title', e.target.value);
                    if (!form.slug) set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }} className="text-base h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={e => set('slug', e.target.value)} className="font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Excerpt</Label>
                  <Textarea value={form.excerpt} onChange={e => set('excerpt', e.target.value)} rows={2} className="resize-none" />
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label>Content (HTML) *</Label>
                  <TinyEditor value={form.content} onChange={v => set('content', v)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tags</Label>
                  <TagInput tags={form.tags} onChange={v => set('tags', v)} />
                </div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="media" className="space-y-4">
              <Card><CardContent className="pt-5 space-y-5">

                {/* 1200×630 preview / placeholder */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Banner Image</Label>
                    <span className="text-xs text-muted-foreground">Recommended: 1200 × 630 px</span>
                  </div>

                  <div className="relative w-full rounded-lg border overflow-hidden" style={{ aspectRatio: '1200/630' }}>
                    {form.bannerUrl ? (
                      <img src={form.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted/30 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        {uploading ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-sm">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-10 h-10 opacity-40" />
                            <div className="text-center">
                              <p className="text-sm font-medium">No image set</p>
                              <p className="text-xs opacity-60">1200 × 630 px recommended · PNG, JPG, WebP</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* overlay action bar */}
                    <div className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-2 bg-black/50 px-3 py-2">
                      <label className="cursor-pointer">
                        <input
                          type="file" accept="image/*" className="sr-only"
                          onChange={handleFileUpload} disabled={uploading}
                        />
                        <span className="inline-flex items-center gap-1.5 text-xs text-white font-medium hover:text-primary transition-colors">
                          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          {form.bannerUrl ? 'Replace' : 'Upload'}
                        </span>
                      </label>

                      {form.bannerUrl && (
                        <button
                          onClick={() => set('bannerUrl', '')}
                          className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Manual URL override */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Or paste an image URL</Label>
                  <Input
                    value={form.bannerUrl}
                    onChange={e => set('bannerUrl', e.target.value)}
                    placeholder="https://..."
                    className="text-sm"
                  />
                </div>

                {/* AI generation */}
                <div className="space-y-2 pt-1 border-t">
                  <Label>AI Image Generation</Label>
                  <Input
                    value={form.bannerPrompt}
                    onChange={e => set('bannerPrompt', e.target.value)}
                    placeholder="Describe the image you want..."
                  />
                  <AIImageGen prompt={form.bannerPrompt} onGenerated={url => set('bannerUrl', url)} />
                </div>

              </CardContent></Card>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <Card><CardContent className="pt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label>SEO Title</Label>
                  <Input value={form.seoTitle} onChange={e => set('seoTitle', e.target.value)} />
                  <p className="text-xs text-muted-foreground">{form.seoTitle.length}/60</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Meta Description</Label>
                  <Textarea value={form.seoDescription} onChange={e => set('seoDescription', e.target.value)} rows={3} className="resize-none" />
                  <p className="text-xs text-muted-foreground">{form.seoDescription.length}/160</p>
                </div>
                <div className="space-y-1.5">
                  <Label>SEO Keywords</Label>
                  <Input value={form.seoKeywords} onChange={e => set('seoKeywords', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Canonical URL</Label>
                  <Input value={form.canonicalUrl} onChange={e => set('canonicalUrl', e.target.value)} />
                </div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="portal" className="space-y-4">
              <Card><CardContent className="pt-5 space-y-5">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Article Section</Label>
                  <Input value={form.articleSection} onChange={e => set('articleSection', e.target.value)} placeholder="e.g. Technology, Marketing, Finance" />
                  <p className="text-xs text-muted-foreground">Broad category for the article (maps to portal&#39;s articleSection field)</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Categories</Label>
                  {!form.dbConnectionId ? (
                    <p className="text-xs text-amber-600">Select a DB connection in the sidebar to load available categories.</p>
                  ) : (
                    <PortalTagSelect
                      label="Categories"
                      selected={form.selectedCategories}
                      onChange={v => set('selectedCategories', v)}
                      options={portalCategories}
                      loading={loadingPortalTags}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">Will be linked via BlogCategory join table on publish</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Industries</Label>
                  {!form.dbConnectionId ? (
                    <p className="text-xs text-amber-600">Select a DB connection in the sidebar to load available industries.</p>
                  ) : (
                    <PortalTagSelect
                      label="Industries"
                      selected={form.selectedIndustries}
                      onChange={v => set('selectedIndustries', v)}
                      options={portalIndustries}
                      loading={loadingPortalTags}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">Will be linked via BlogIndustry join table on publish</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> FAQs</Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => set('faqs', [...form.faqs, { question: '', answer: '' }])}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add FAQ
                    </Button>
                  </div>
                  {form.faqs.length === 0 && (
                    <p className="text-xs text-muted-foreground">No FAQs added yet. Click &quot;Add FAQ&quot; to add one.</p>
                  )}
                  {form.faqs.map((faq, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">FAQ {i + 1}</span>
                        <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => set('faqs', form.faqs.filter((_, j) => j !== i))}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Question"
                        value={faq.question}
                        onChange={e => set('faqs', form.faqs.map((f, j) => j === i ? { ...f, question: e.target.value } : f))}
                        className="text-sm"
                      />
                      <Textarea
                        placeholder="Answer"
                        value={faq.answer}
                        onChange={e => set('faqs', form.faqs.map((f, j) => j === i ? { ...f, answer: e.target.value } : f))}
                        rows={2}
                        className="resize-none text-sm"
                      />
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky bottom-0 mt-6 bg-background border-t py-3 px-4 -mx-4 flex justify-end gap-2 shadow-lg">
        <Button variant="outline" onClick={() => router.push(`/blogs/automation?brandId=${brandId}`)}>
          <X className="w-4 h-4 mr-1.5" /> Cancel
        </Button>

        {isPublished ? (
          <>
            <Button variant="secondary" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={handlePublish} disabled={publishing}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              {publishing ? 'Re-publishing...' : 'Re-publish'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Saving...' : (form.scheduledAt ? 'Schedule' : 'Save Draft')}
            </Button>
            {form.dbConnectionId && !form.scheduledAt && (
              <Button onClick={handlePublish} disabled={publishing}>
                <Send className="w-4 h-4 mr-1.5" />
                {publishing ? 'Publishing...' : 'Publish Now'}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
