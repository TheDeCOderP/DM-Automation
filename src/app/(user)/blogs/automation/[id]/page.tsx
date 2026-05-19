'use client';

import { useState, useEffect } from 'react';
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
import { ArrowLeft, Save, Send, FileText, Globe, Image as ImageIcon, X, Plus, Hash, Calendar, Tag, Building, HelpCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

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

  const { data } = useSWR(id ? `/api/blogs/automation/${id}` : null, fetcher);
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

  useEffect(() => {
    if (automation) {
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
          ? new Date(automation.scheduledAt).toISOString().slice(0, 16)
          : '',
        articleSection: automation.articleSection || '',
        faqs: parsedFaqs,
        selectedCategories: Array.isArray(automation.selectedCategories) ? automation.selectedCategories : [],
        selectedIndustries: Array.isArray(automation.selectedIndustries) ? automation.selectedIndustries : [],
      });
    }
  }, [automation]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/blogs/automation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          faqs: form.faqs.length ? JSON.stringify(form.faqs) : null,
          scheduledAt: form.scheduledAt || null,
          status: form.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(form.scheduledAt ? 'Blog scheduled!' : 'Blog saved!');
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
      await fetch(`/api/blogs/automation/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, faqs: form.faqs.length ? JSON.stringify(form.faqs) : null, scheduledAt: null }),
      });
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
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Schedule</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} />
              </div>
              {automation.externalId && (
                <p className="text-xs text-green-600">Published — External ID: {automation.externalId}</p>
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
                  <Input value={form.title} onChange={e => { set('title', e.target.value); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} className="text-base h-11" />
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
              <Card><CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <Label>Banner Image URL</Label>
                  <Input value={form.bannerUrl} onChange={e => set('bannerUrl', e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Image Prompt (for AI generation)</Label>
                  <Input value={form.bannerPrompt} onChange={e => set('bannerPrompt', e.target.value)} />
                  <AIImageGen prompt={form.bannerPrompt} onGenerated={url => set('bannerUrl', url)} />
                </div>
                {form.bannerUrl && (
                  <div className="relative">
                    <img src={form.bannerUrl} alt="Banner" className="w-full h-48 object-cover rounded-lg border" />
                    <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => set('bannerUrl', '')}><X className="w-4 h-4" /></Button>
                  </div>
                )}
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
                  <TagInput tags={form.selectedCategories} onChange={v => set('selectedCategories', v)} />
                  <p className="text-xs text-muted-foreground">Will be linked via BlogCategory join table on publish</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Industries</Label>
                  <TagInput tags={form.selectedIndustries} onChange={v => set('selectedIndustries', v)} />
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
        <Button variant="secondary" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1.5" /> {form.scheduledAt ? 'Schedule' : 'Save Draft'}
        </Button>
        {form.dbConnectionId && !form.scheduledAt && (
          <Button onClick={handlePublish} disabled={publishing}>
            <Send className="w-4 h-4 mr-1.5" /> {publishing ? 'Publishing...' : 'Publish Now'}
          </Button>
        )}
      </div>
    </div>
  );
}
