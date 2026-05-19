'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, Sparkles, AlertTriangle, X,
  Lightbulb, Settings2, Database, Calendar,
  FileText, Zap, Target, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface DbConnection { id: string; name: string; dbType: string; }

interface GenerateBlogModalProps {
  brandId: string;
  connections: DbConnection[];
  onClose: () => void;
  onSuccess: () => void;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'storytelling', label: 'Storytelling' },
];

const ANGLES = [
  "Beginner's ultimate guide with step-by-step examples",
  'Advanced strategies used by top Fortune 500 companies',
  'Common mistakes businesses make and how to avoid them',
  'Future trends and predictions backed by industry data',
  'ROI and business case — why this matters for your bottom line',
  'Tools, frameworks, and best practices compared',
  'Real-world case studies and success stories',
  'Actionable checklist and implementation roadmap',
  'Myths vs. facts — debunking misconceptions',
  'Expert interviews and insider insights',
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, description, children, accent = false,
}: {
  icon: React.ElementType; title: string; description?: string;
  children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 space-y-4 ${accent ? 'border-primary/30 bg-primary/[0.02]' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`w-4 h-4 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function GenerateBlogModal({ brandId, connections, onClose, onSuccess }: GenerateBlogModalProps) {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(1);
  const [tone, setTone] = useState('professional');
  const [targetAudience, setTargetAudience] = useState('');
  const [keywords, setKeywords] = useState('');
  const [dbConnectionId, setDbConnectionId] = useState('');
  const [calendarTitle, setCalendarTitle] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const hasFormData = () => topic.trim() !== '' || count !== 1 || targetAudience.trim() !== '' || keywords.trim() !== '';

  const handleCloseAttempt = () => {
    if (isGenerating) { toast.error('Please wait while blogs are being generated...'); return; }
    if (hasFormData()) { setShowCloseConfirm(true); } else { onClose(); }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error('Please enter a topic'); return; }

    setIsGenerating(true);
    setProgress(`Generating ${count} blog post${count > 1 ? 's' : ''} with AI...`);

    try {
      const res = await fetch('/api/blogs/automation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId, topic, count,
          tone,
          targetAudience: targetAudience.trim() || undefined,
          keywords: keywords.trim() || undefined,
          dbConnectionId: (dbConnectionId && dbConnectionId !== '__none__') ? dbConnectionId : undefined,
          calendarTitle: (count > 1 && calendarTitle.trim()) ? calendarTitle.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      toast.success(`${data.automations.length} blog post${data.automations.length !== 1 ? 's' : ''} generated successfully!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate blogs');
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  return (
    <>
      <Dialog open onOpenChange={handleCloseAttempt}>
        <DialogContent
          className="!max-w-[980px] !w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col"
          onPointerDownOutside={e => {
            if (isGenerating) { e.preventDefault(); toast.error('Please wait while blogs are being generated...'); }
          }}
          onEscapeKeyDown={e => {
            if (isGenerating) { e.preventDefault(); }
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b bg-card shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold leading-tight">Generate Blog Posts</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                AI-powered, SEO-optimised long-form blog content published directly to your portal DB
              </DialogDescription>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* ── LEFT COLUMN ── */}
              <div className="space-y-5">

                <SectionCard icon={Lightbulb} title="Topic & Audience" description="What should the blog series be about?" accent>
                  <div className="space-y-1.5">
                    <FieldLabel required>Blog Topic / Theme</FieldLabel>
                    <Input
                      placeholder="e.g., AI in Healthcare, B2B SaaS Marketing, Sustainable Packaging"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      disabled={isGenerating}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Target Audience</FieldLabel>
                    <Input
                      placeholder="e.g., CTOs at mid-market SaaS companies, healthcare administrators"
                      value={targetAudience}
                      onChange={e => setTargetAudience(e.target.value)}
                      disabled={isGenerating}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Primary Keywords</FieldLabel>
                    <Input
                      placeholder="e.g., AI automation, digital transformation, ROI"
                      value={keywords}
                      onChange={e => setKeywords(e.target.value)}
                      disabled={isGenerating}
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated. Woven naturally into every post.</p>
                  </div>
                </SectionCard>

                <SectionCard icon={FileText} title="Number of Posts" description="How many blog posts to generate in one run">
                  <div className="space-y-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {[1, 2, 3, 5, 7, 10].map(n => (
                        <button
                          key={n} type="button"
                          onClick={() => !isGenerating && setCount(n)}
                          disabled={isGenerating}
                          className={`flex-1 min-w-[3rem] h-10 rounded-lg text-sm font-semibold border transition-all ${
                            count === n
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {count === 1
                        ? 'Single post — one deep-dive article'
                        : `${count} posts — each from a unique angle for maximum SEO coverage`}
                    </p>

                    {count > 1 && (
                      <div className="space-y-1.5">
                        <FieldLabel>Series / Calendar Title</FieldLabel>
                        <Input
                          placeholder={`${topic || 'Topic'} — ${count} posts`}
                          value={calendarTitle}
                          onChange={e => setCalendarTitle(e.target.value)}
                          disabled={isGenerating}
                          className="h-10"
                        />
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard icon={Settings2} title="Custom Instructions" description="Extra guidance for the AI (optional)">
                  <Textarea
                    placeholder="e.g., Always mention our product in the final CTA. Use UK English. Include a stat in every section. Avoid competitor names."
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    rows={3}
                    disabled={isGenerating}
                    className="resize-none text-sm"
                  />
                </SectionCard>

              </div>

              {/* ── RIGHT COLUMN ── */}
              <div className="space-y-5">

                <SectionCard icon={Target} title="Voice & Style" description="Tone and writing style for every post">
                  <div className="space-y-1.5">
                    <FieldLabel required>Tone</FieldLabel>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TONE_OPTIONS.map(t => (
                        <button
                          key={t.value} type="button"
                          onClick={() => !isGenerating && setTone(t.value)}
                          disabled={isGenerating}
                          className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                            tone === t.value
                              ? 'border-primary bg-primary/5 text-foreground'
                              : 'border-border hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={Database} title="Publishing Target" description="Where to publish these blogs (optional — can publish later)">
                  <div className="space-y-1.5">
                    <FieldLabel>Target DB Connection</FieldLabel>
                    <Select
                      value={dbConnectionId || '__none__'}
                      onValueChange={v => setDbConnectionId(v === '__none__' ? '' : v)}
                      disabled={isGenerating}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Save as draft (publish later)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Save as draft — publish later</SelectItem>
                        {connections.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.dbType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {connections.length === 0 && (
                      <p className="text-xs text-amber-600">
                        No DB connections set up yet. Posts will be saved as drafts. Add connections in DB Connections.
                      </p>
                    )}
                  </div>
                </SectionCard>

                {count > 1 && (
                  <SectionCard icon={Zap} title="Content Angles" description="Each post covers a unique strategic angle">
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                      {ANGLES.slice(0, count).map((angle, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 px-3 py-2 rounded-lg border border-border bg-background"
                        >
                          <span className="shrink-0 w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-xs text-muted-foreground leading-relaxed">{angle}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Each article gets a completely unique perspective for maximum organic reach.
                    </p>
                  </SectionCard>
                )}

                {count === 1 && (
                  <SectionCard icon={BookOpen} title="What You'll Get" description="Every post includes all of these">
                    <div className="space-y-1.5">
                      {[
                        '1,200+ words of authoritative HTML content',
                        'McKinsey-level writing with MNC examples & stats',
                        'Key Takeaways + Final Thoughts sections',
                        'Full SEO: title, meta description, keywords',
                        'AI image prompt for banner generation',
                        'Ready to publish — directly to your portal DB',
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

              </div>
            </div>

            {/* Summary strip */}
            {topic.trim() && !isGenerating && (
              <div className="mx-6 mb-5 p-4 rounded-xl bg-muted/40 border border-border/60">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Generation Summary</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Topic</p>
                    <p className="text-sm font-semibold truncate">{topic}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Posts</p>
                    <p className="text-sm font-semibold">{count} blog{count !== 1 ? 's' : ''} · 1,200+ words each</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Voice</p>
                    <p className="text-sm font-semibold">{TONE_OPTIONS.find(t => t.value === tone)?.label}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Publishing</p>
                    <p className="text-sm font-semibold">
                      {dbConnectionId && dbConnectionId !== '__none__'
                        ? connections.find(c => c.id === dbConnectionId)?.name || 'Selected DB'
                        : 'Draft (publish later)'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Progress */}
            {isGenerating && (
              <div className="mx-6 mb-5 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">{progress}</p>
                  <p className="text-xs text-muted-foreground">Please don't close this window. Generation takes 30–90 seconds.</p>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t bg-card">
            <p className="text-xs text-muted-foreground hidden sm:block">
              Estimated time: <span className="font-semibold text-foreground">{count <= 3 ? '30–60 seconds' : '1–3 minutes'}</span>
            </p>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={handleCloseAttempt} disabled={isGenerating}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="min-w-[160px]"
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Generate {count} Blog{count !== 1 ? 's' : ''}</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Discard Changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved form data. Are you sure you want to close?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowCloseConfirm(false); onClose(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
