'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Bot, Sparkles, Send, Save, FileText,
  Globe, Image as ImageIcon, Calendar, X, Plus, Hash
} from 'lucide-react';
import dynamic from 'next/dynamic';

const TinyEditor = dynamic(() => import('./_components/TinyEditor'), { ssr: false });
const AIImageGen = dynamic(() => import('./_components/AIImageGen'), { ssr: false });

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface DbConnection { id: string; name: string; dbType: string; }

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState('');
  const add = () => {
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed)) { onChange([...tags, trimmed]); setVal(''); }
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

export default function CreateBlogAutomationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandId = searchParams.get('brandId') || '';

  const { data: connData } = useSWR(brandId ? `/api/blogs/db-connections?brandId=${brandId}` : null, fetcher);
  const connections: DbConnection[] = connData?.connections || [];

  // AI generation options
  const [genTopic, setGenTopic] = useState('');
  const [genCount, setGenCount] = useState('1');
  const [genTone, setGenTone] = useState('');
  const [genAudience, setGenAudience] = useState('');
  const [genKeywords, setGenKeywords] = useState('');
  const [generating, setGenerating] = useState(false);

  // Blog post form
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    tags: [] as string[],
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    canonicalUrl: '',
    bannerUrl: '',
    bannerPrompt: '',
    dbConnectionId: '',
    scheduledAt: '',
  });

  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    if (!genTopic.trim()) { toast.error('Enter a topic to generate content'); return; }
    if (!brandId) { toast.error('No brand selected'); return; }

    setGenerating(true);
    try {
      const res = await fetch('/api/blogs/automation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          topic: genTopic,
          count: Number(genCount),
          tone: genTone || undefined,
          targetAudience: genAudience || undefined,
          keywords: genKeywords || undefined,
          dbConnectionId: form.dbConnectionId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const items = data.automations || [];
      setGenerated(items);
      setSelectedIndex(0);

      if (items.length > 0) {
        const first = items[0];
        setForm(p => ({
          ...p,
          title: first.title || '',
          slug: first.slug || '',
          content: first.content || '',
          excerpt: first.excerpt || '',
          seoTitle: first.seoTitle || '',
          seoDescription: first.seoDescription || '',
          seoKeywords: first.seoKeywords || '',
          bannerPrompt: first.bannerPrompt || '',
        }));
      }

      toast.success(`Generated ${items.length} blog post(s)! You can edit them below.`);
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const switchToGenerated = (index: number) => {
    const item = generated[index];
    if (!item) return;
    setSelectedIndex(index);
    setForm(p => ({
      ...p,
      title: item.title || '',
      slug: item.slug || '',
      content: item.content || '',
      excerpt: item.excerpt || '',
      seoTitle: item.seoTitle || '',
      seoDescription: item.seoDescription || '',
      seoKeywords: item.seoKeywords || '',
      bannerPrompt: item.bannerPrompt || '',
    }));
  };

  const handleSave = async (publish = false) => {
    if (!form.title || !form.content) { toast.error('Title and content are required'); return; }

    // If this was AI-generated, update the existing record; otherwise create new
    const existingId = generated[selectedIndex]?.id;

    setSaving(true);
    try {
      let res;
      if (existingId) {
        res = await fetch(`/api/blogs/automation/${existingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            tags: form.tags,
            scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
            status: form.scheduledAt ? 'SCHEDULED' : 'DRAFT',
          }),
        });
      } else {
        res = await fetch('/api/blogs/automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, brandId, tags: form.tags }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const automationId = data.automation?.id || existingId;

      if (publish && automationId && form.dbConnectionId) {
        const pubRes = await fetch(`/api/blogs/automation/${automationId}/publish`, { method: 'POST' });
        const pubData = await pubRes.json();
        if (pubRes.ok) {
          toast.success('Blog saved and published to your portal!');
        } else {
          toast.error(`Saved but publish failed: ${pubData.error}`);
        }
      } else {
        toast.success(form.scheduledAt ? 'Blog scheduled!' : 'Blog saved as draft!');
      }

      router.push(`/blogs/automation?brandId=${brandId}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/blogs/automation?brandId=${brandId}`)} className="mb-3 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog Automation
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" /> Generate Blog Post(s)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI generates HTML blog content → edit → schedule or publish directly to your portal DB
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: AI Generation Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> AI Generation
              </CardTitle>
              <CardDescription>Describe your blog topic and let AI write it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Topic / Title idea *</Label>
                <Textarea
                  placeholder="e.g. How AI is transforming digital marketing in 2025"
                  value={genTopic}
                  onChange={e => setGenTopic(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Number of posts to generate</Label>
                <Select value={genCount} onValueChange={setGenCount}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} post{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tone (optional)</Label>
                <Input placeholder="e.g. Professional, Conversational, Educational" value={genTone} onChange={e => setGenTone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Target Audience (optional)</Label>
                <Input placeholder="e.g. Marketing professionals, SME owners" value={genAudience} onChange={e => setGenAudience(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Focus Keywords (optional)</Label>
                <Input placeholder="e.g. AI marketing, automation, ROI" value={genKeywords} onChange={e => setGenKeywords(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleGenerate} disabled={generating || !genTopic.trim()}>
                {generating ? (
                  <><span className="animate-spin mr-2">⏳</span> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate with AI</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated posts selector */}
          {generated.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Generated Posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3">
                {generated.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => switchToGenerated(i)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedIndex === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="font-medium truncate block">Post {i + 1}</span>
                    <span className="text-xs opacity-70 truncate block">{item.title}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Publishing */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" /> Publishing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Target Database Connection</Label>
                <Select value={form.dbConnectionId} onValueChange={v => set('dbConnectionId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select DB connection..." />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.length === 0 ? (
                      <SelectItem value="none" disabled>No connections — add one first</SelectItem>
                    ) : (
                      connections.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.dbType})</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {connections.length === 0 && (
                  <p className="text-xs text-amber-600">
                    <a href={`/blogs/db-connections?brandId=${brandId}`} className="underline">Add a DB connection</a> to enable publishing
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Schedule (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => set('scheduledAt', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave blank to save as draft. Cron will publish at the set time.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Editor */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="content"><FileText className="w-4 h-4 mr-1.5" /> Content</TabsTrigger>
              <TabsTrigger value="media"><ImageIcon className="w-4 h-4 mr-1.5" /> Media</TabsTrigger>
              <TabsTrigger value="seo"><Globe className="w-4 h-4 mr-1.5" /> SEO</TabsTrigger>
            </TabsList>

            {/* CONTENT TAB */}
            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Title *</Label>
                    <Input
                      placeholder="Blog post title"
                      value={form.title}
                      onChange={e => { set('title', e.target.value); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }}
                      className="text-base h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slug</Label>
                    <Input placeholder="url-friendly-slug" value={form.slug} onChange={e => set('slug', e.target.value)} className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Excerpt</Label>
                    <Textarea placeholder="Brief summary (150-160 chars)..." value={form.excerpt} onChange={e => set('excerpt', e.target.value)} rows={2} className="resize-none" />
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* MEDIA TAB */}
            <TabsContent value="media" className="space-y-4">
              <Card>
                <CardContent className="pt-5 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Banner Image
                    </Label>
                    <Input placeholder="Image URL" value={form.bannerUrl} onChange={e => set('bannerUrl', e.target.value)} />
                    <div className="space-y-1.5">
                      <Label className="text-sm">Or generate with AI</Label>
                      <Input placeholder="Image prompt (auto-filled from AI generation)" value={form.bannerPrompt} onChange={e => set('bannerPrompt', e.target.value)} />
                      <AIImageGen
                        prompt={form.bannerPrompt}
                        onGenerated={url => set('bannerUrl', url)}
                      />
                    </div>
                    {form.bannerUrl && (
                      <div className="relative">
                        <img src={form.bannerUrl} alt="Banner preview" className="w-full h-48 object-cover rounded-lg border" />
                        <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => set('bannerUrl', '')}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SEO TAB */}
            <TabsContent value="seo" className="space-y-4">
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label>SEO Title <span className="text-xs text-muted-foreground">(50-60 chars)</span></Label>
                    <Input placeholder="Custom title for search engines" value={form.seoTitle} onChange={e => set('seoTitle', e.target.value)} />
                    <p className="text-xs text-muted-foreground">{form.seoTitle.length} / 60</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Meta Description <span className="text-xs text-muted-foreground">(150-160 chars)</span></Label>
                    <Textarea placeholder="Brief description for search results" value={form.seoDescription} onChange={e => set('seoDescription', e.target.value)} rows={3} className="resize-none" />
                    <p className="text-xs text-muted-foreground">{form.seoDescription.length} / 160</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>SEO Keywords</Label>
                    <Input placeholder="keyword1, keyword2, keyword3" value={form.seoKeywords} onChange={e => set('seoKeywords', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Canonical URL</Label>
                    <Input placeholder="https://example.com/original-post" value={form.canonicalUrl} onChange={e => set('canonicalUrl', e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="sticky bottom-0 mt-6 bg-background border-t py-3 px-4 -mx-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="text-sm text-muted-foreground">
          {form.scheduledAt ? (
            <span className="text-blue-600 font-medium flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Scheduled for {new Date(form.scheduledAt).toLocaleString()}
            </span>
          ) : form.dbConnectionId ? (
            <span className="text-green-600 font-medium">Ready to publish or save as draft</span>
          ) : (
            <span>Select a DB connection to enable publishing</span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => router.push(`/blogs/automation?brandId=${brandId}`)}>
            <X className="w-4 h-4 mr-1.5" /> Cancel
          </Button>
          <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving || !form.title || !form.content}>
            <Save className="w-4 h-4 mr-1.5" />
            {form.scheduledAt ? 'Schedule' : 'Save Draft'}
          </Button>
          {form.dbConnectionId && !form.scheduledAt && (
            <Button onClick={() => handleSave(true)} disabled={saving || !form.title || !form.content}>
              <Send className="w-4 h-4 mr-1.5" />
              {saving ? 'Publishing...' : 'Publish Now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
