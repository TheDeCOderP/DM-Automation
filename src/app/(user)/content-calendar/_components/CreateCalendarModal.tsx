"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Pin,
  MessageCircle,
  Music,
  Globe,
  CalendarDays,
  PartyPopper,
  X,
  RefreshCw,
  Lightbulb,
  Settings2,
  Calendar,
  Layers,
  Zap,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/utils/format";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Platform } from "@prisma/client";

interface CreateCalendarModalProps {
  brandId: string;
  connectedPlatforms?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface PublicHoliday {
  date: string;
  name: string;
  localName: string;
  global: boolean;
  types: string[];
}

const PLATFORMS = [
  { value: "LINKEDIN", label: "LinkedIn", icon: Linkedin, color: "text-[#0A66C2]" },
  { value: "TWITTER", label: "Twitter / X", icon: Twitter, color: "text-sky-500" },
  { value: "INSTAGRAM", label: "Instagram", icon: Instagram, color: "text-pink-600" },
  { value: "FACEBOOK", label: "Facebook", icon: Facebook, color: "text-[#1877F2]" },
  { value: "YOUTUBE", label: "YouTube", icon: Youtube, color: "text-red-600" },
  { value: "PINTEREST", label: "Pinterest", icon: Pin, color: "text-red-500" },
  { value: "REDDIT", label: "Reddit", icon: MessageCircle, color: "text-orange-600" },
  { value: "TIKTOK", label: "TikTok", icon: Music, color: "text-foreground" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & Friendly" },
  { value: "inspirational", label: "Inspirational" },
  { value: "educational", label: "Educational" },
  { value: "humorous", label: "Humorous" },
  { value: "authoritative", label: "Authoritative" },
  { value: "conversational", label: "Conversational" },
  { value: "storytelling", label: "Storytelling" },
];

const CTA_STYLES = [
  { value: "engagement", label: "Engagement", desc: "comment, share, like" },
  { value: "traffic", label: "Drive Traffic", desc: "visit website, read more" },
  { value: "leads", label: "Lead Gen", desc: "DM, sign up, download" },
  { value: "sales", label: "Sales", desc: "buy, get offer, limited time" },
  { value: "community", label: "Community", desc: "tag someone, join group" },
  { value: "awareness", label: "Awareness", desc: "follow, save, subscribe" },
];

const LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Spanish", label: "Spanish" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Hindi", label: "Hindi" },
  { value: "Arabic", label: "Arabic" },
  { value: "Italian", label: "Italian" },
  { value: "Dutch", label: "Dutch" },
  { value: "Japanese", label: "Japanese" },
];

const CONTENT_PILLAR_OPTIONS = [
  "Educational", "Inspirational", "Promotional", "Behind-the-scenes",
  "User-generated", "Trending/News", "Case studies", "Tips & Tricks",
  "Product showcase", "Community", "Storytelling", "How-to guides",
];

const COUNTRY_OPTIONS = [
  { value: "US", label: "🇺🇸 United States" },
  { value: "GB", label: "🇬🇧 United Kingdom" },
  { value: "IN", label: "🇮🇳 India" },
  { value: "CA", label: "🇨🇦 Canada" },
  { value: "AU", label: "🇦🇺 Australia" },
  { value: "DE", label: "🇩🇪 Germany" },
  { value: "FR", label: "🇫🇷 France" },
  { value: "BR", label: "🇧🇷 Brazil" },
  { value: "MX", label: "🇲🇽 Mexico" },
  { value: "JP", label: "🇯🇵 Japan" },
  { value: "CN", label: "🇨🇳 China" },
  { value: "SG", label: "🇸🇬 Singapore" },
  { value: "AE", label: "🇦🇪 UAE" },
  { value: "ZA", label: "🇿🇦 South Africa" },
  { value: "NG", label: "🇳🇬 Nigeria" },
  { value: "AR", label: "🇦🇷 Argentina" },
  { value: "IT", label: "🇮🇹 Italy" },
  { value: "ES", label: "🇪🇸 Spain" },
  { value: "NL", label: "🇳🇱 Netherlands" },
  { value: "SE", label: "🇸🇪 Sweden" },
  { value: "NO", label: "🇳🇴 Norway" },
  { value: "DK", label: "🇩🇰 Denmark" },
  { value: "FI", label: "🇫🇮 Finland" },
  { value: "PL", label: "🇵🇱 Poland" },
  { value: "PT", label: "🇵🇹 Portugal" },
  { value: "CH", label: "🇨🇭 Switzerland" },
  { value: "AT", label: "🇦🇹 Austria" },
  { value: "BE", label: "🇧🇪 Belgium" },
  { value: "NZ", label: "🇳🇿 New Zealand" },
  { value: "KR", label: "🇰🇷 South Korea" },
  { value: "PH", label: "🇵🇭 Philippines" },
  { value: "ID", label: "🇮🇩 Indonesia" },
  { value: "MY", label: "🇲🇾 Malaysia" },
  { value: "TH", label: "🇹🇭 Thailand" },
  { value: "PK", label: "🇵🇰 Pakistan" },
  { value: "BD", label: "🇧🇩 Bangladesh" },
  { value: "EG", label: "🇪🇬 Egypt" },
  { value: "IL", label: "🇮🇱 Israel" },
  { value: "TR", label: "🇹🇷 Turkey" },
  { value: "SA", label: "🇸🇦 Saudi Arabia" },
  { value: "GH", label: "🇬🇭 Ghana" },
  { value: "KE", label: "🇰🇪 Kenya" },
  { value: "CL", label: "🇨🇱 Chile" },
  { value: "CO", label: "🇨🇴 Colombia" },
  { value: "VN", label: "🇻🇳 Vietnam" },
  { value: "UA", label: "🇺🇦 Ukraine" },
  { value: "RO", label: "🇷🇴 Romania" },
  { value: "CZ", label: "🇨🇿 Czech Republic" },
  { value: "HU", label: "🇭🇺 Hungary" },
  { value: "SK", label: "🇸🇰 Slovakia" },
  { value: "HR", label: "🇭🇷 Croatia" },
  { value: "GR", label: "🇬🇷 Greece" },
  { value: "IE", label: "🇮🇪 Ireland" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  accent = false,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 space-y-4 ${accent ? "border-primary/30 bg-primary/[0.02]" : "border-border bg-card"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent ? "bg-primary/10" : "bg-muted"}`}>
          <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
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

export default function CreateCalendarModal({
  brandId,
  connectedPlatforms,
  onClose,
  onSuccess,
}: CreateCalendarModalProps) {
  const availablePlatforms = connectedPlatforms && connectedPlatforms.length > 0
    ? PLATFORMS.filter((p) => connectedPlatforms.map(s => s.toUpperCase()).includes(p.value))
    : PLATFORMS;

  // Basic
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);

  // Content settings
  const [tone, setTone] = useState("professional");
  const [ctaStyle, setCtaStyle] = useState("engagement");
  const [targetAudience, setTargetAudience] = useState("");
  const [language, setLanguage] = useState("English");
  const [hashtagCount, setHashtagCount] = useState(5);
  const [selectedPillars, setSelectedPillars] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");

  // Holidays
  const [enableHolidays, setEnableHolidays] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [removedHolidayKeys, setRemovedHolidayKeys] = useState<Set<string>>(new Set());
  const [isFetchingHolidays, setIsFetchingHolidays] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);

  // UI
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);
  const endDateStr = endDate.toISOString().split("T")[0];

  const activeHolidays = holidays.filter(h => !removedHolidayKeys.has(`${h.date}-${h.name}`));

  // Reset removals when holidays list changes
  useEffect(() => { setRemovedHolidayKeys(new Set()); }, [holidays]);

  useEffect(() => {
    if (!enableHolidays) { setHolidays([]); return; }
    fetchHolidaysInRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableHolidays, selectedCountry, startDate, duration]);

  const fetchHolidaysInRange = async () => {
    setIsFetchingHolidays(true);
    setHolidayError(null);
    try {
      const start = new Date(startDate);
      const end = new Date(startDate);
      end.setDate(end.getDate() + duration);

      const yearsFetched = new Set<number>();
      const allHolidays: PublicHoliday[] = [];

      for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
        if (yearsFetched.has(year)) continue;
        yearsFetched.add(year);
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${selectedCountry}`);
        if (!res.ok) {
          if (res.status === 404) {
            setHolidayError(`No holiday data for ${COUNTRY_OPTIONS.find(c => c.value === selectedCountry)?.label ?? selectedCountry}.`);
            setHolidays([]);
            return;
          }
          throw new Error(`Failed (${res.status})`);
        }
        allHolidays.push(...(await res.json() as PublicHoliday[]));
      }

      const seen = new Set<string>();
      const deduped = allHolidays.filter(h => {
        const d = new Date(h.date);
        if (d < start || d > end) return false;
        const key = `${h.date}-${h.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setHolidays(deduped);
    } catch {
      setHolidayError("Could not load holidays. They'll be skipped during generation.");
      setHolidays([]);
    } finally {
      setIsFetchingHolidays(false);
    }
  };

  const removeHoliday = (h: PublicHoliday) =>
    setRemovedHolidayKeys(prev => new Set(prev).add(`${h.date}-${h.name}`));

  const restoreHoliday = (h: PublicHoliday) =>
    setRemovedHolidayKeys(prev => { const s = new Set(prev); s.delete(`${h.date}-${h.name}`); return s; });

  const hasFormData = () =>
    topic.trim() !== "" || selectedPlatforms.length > 0 || duration !== 30 ||
    postsPerWeek !== 5 || startDate !== new Date().toISOString().split("T")[0];

  const handleCloseAttempt = () => {
    if (isGenerating) { toast.error("Please wait while content is being generated..."); return; }
    if (hasFormData()) { setShowCloseConfirm(true); } else { onClose(); }
  };

  const handlePlatformToggle = (platform: Platform) =>
    setSelectedPlatforms(prev => prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]);

  const handlePillarToggle = (pillar: string) =>
    setSelectedPillars(prev => prev.includes(pillar) ? prev.filter(p => p !== pillar) : [...prev, pillar]);

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error("Please enter a topic"); return; }
    if (selectedPlatforms.length === 0) { toast.error("Please select at least one platform"); return; }
    if (duration < 7 || duration > 90) { toast.error("Duration must be between 7 and 90 days"); return; }
    if (postsPerWeek < 1 || postsPerWeek > 14) { toast.error("Posts per week must be between 1 and 14"); return; }

    setIsGenerating(true);
    setProgress("Creating calendar structure...");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      setProgress("Generating content ideas (this may take 30–60 seconds)...");

      const response = await fetch("/api/content-calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId, topic, duration,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate.toISOString(),
          platforms: selectedPlatforms,
          postsPerWeek,
          tone, ctaStyle,
          targetAudience: targetAudience.trim() || undefined,
          language, hashtagCount,
          contentPillars: selectedPillars.length > 0 ? selectedPillars : undefined,
          customInstructions: customInstructions.trim() || undefined,
          holidays: enableHolidays && activeHolidays.length > 0 ? activeHolidays : undefined,
          countryCode: enableHolidays ? selectedCountry : undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 503) throw new Error("AI service is experiencing high demand. Please try again.");
        if (response.status === 429) throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        throw new Error(error.error || "Failed to generate calendar");
      }

      const data = await response.json();

      if (data.needsCaptions && data.calendar?.items) {
        setProgress(`Generating captions for ${data.calendar.items.length} posts...`);
        const itemIds = data.calendar.items.map((item: any) => item.id);
        const BATCH_SIZE = 3;
        for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
          const batchIds = itemIds.slice(i, i + BATCH_SIZE);
          setProgress(`Generating captions ${i + 1}–${Math.min(i + BATCH_SIZE, itemIds.length)} of ${itemIds.length}...`);
          try {
            const cc = new AbortController();
            const ct = setTimeout(() => cc.abort(), 120000);
            await fetch("/api/content-calendar/generate-captions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                calendarId: data.calendar.id, itemIds: batchIds,
                tone, ctaStyle,
                targetAudience: targetAudience.trim() || undefined,
                language, hashtagCount,
                contentPillars: selectedPillars.length > 0 ? selectedPillars : undefined,
                customInstructions: customInstructions.trim() || undefined,
              }),
              signal: cc.signal,
            });
            clearTimeout(ct);
          } catch (batchError) {
            console.error(`Error in caption batch ${i}:`, batchError);
          }
        }
      }

      toast.success(`Calendar generated! ${data.calendar.items.length} posts created.`);
      onSuccess();
    } catch (error: any) {
      if (error.name === "AbortError") toast.error("Request timed out. Please try again.");
      else toast.error(error instanceof Error ? error.message : "Failed to generate calendar");
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  const totalPosts = Math.ceil((duration / 7) * postsPerWeek);

  return (
    <>
      <Dialog open onOpenChange={handleCloseAttempt}>
        <DialogContent
          className="!max-w-[980px] !w-[95vw] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col"
          onPointerDownOutside={(e) => {
            if (isGenerating) { e.preventDefault(); toast.error("Please wait while content is being generated..."); }
          }}
          onEscapeKeyDown={(e) => {
            if (isGenerating) { e.preventDefault(); toast.error("Please wait while content is being generated..."); }
          }}
        >
          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-6 py-4 border-b bg-card shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold leading-tight">Generate Content Calendar</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                AI-powered content across platforms for your selected date range
              </DialogDescription>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* ══ LEFT COLUMN ══ */}
              <div className="space-y-5">

                {/* Topic & Audience */}
                <SectionCard icon={Lightbulb} title="Topic & Theme" description="What is this calendar about?" accent>
                  <div className="space-y-1.5">
                    <FieldLabel required>Topic / Theme</FieldLabel>
                    <Input
                      placeholder="e.g., Digital Marketing Tips, Fitness Motivation, Product Launch"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={isGenerating}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Target Audience</FieldLabel>
                    <Input
                      placeholder="e.g., Small business owners, B2B SaaS founders, fitness enthusiasts"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      disabled={isGenerating}
                      className="h-10"
                    />
                  </div>
                </SectionCard>

                {/* Schedule */}
                <SectionCard icon={Calendar} title="Schedule" description="When and how often to post">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel required>Start Date</FieldLabel>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        disabled={isGenerating}
                        min={new Date().toISOString().split("T")[0]}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel required>Duration</FieldLabel>
                      <div className="flex gap-1.5">
                        {[7, 14, 30, 90].map((d) => (
                          <button
                            key={d} type="button"
                            onClick={() => !isGenerating && setDuration(d)}
                            disabled={isGenerating}
                            className={`flex-1 h-10 rounded-lg text-xs font-semibold border transition-all ${
                              duration === d
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            {d === 7 ? "1W" : d === 14 ? "2W" : d === 30 ? "1M" : "3M"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {startDate && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatDate(startDate)}</span>
                      <span className="opacity-40">→</span>
                      <span>{formatDate(endDateStr)}</span>
                      <span className="ml-auto font-semibold text-foreground">{duration} days</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <FieldLabel required>Posts Per Week</FieldLabel>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5 flex-1">
                        {[3, 5, 7, 10, 14].map((n) => (
                          <button
                            key={n} type="button"
                            onClick={() => !isGenerating && setPostsPerWeek(n)}
                            disabled={isGenerating}
                            className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition-all ${
                              postsPerWeek === n
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <Input
                        type="number" min={1} max={14} value={postsPerWeek}
                        onChange={(e) => setPostsPerWeek(parseInt(e.target.value))}
                        disabled={isGenerating}
                        className="h-9 w-16 text-center shrink-0"
                      />
                    </div>
                    {selectedPlatforms.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ~{totalPosts} posts total across {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </SectionCard>

                {/* Platforms */}
                <SectionCard icon={Layers} title="Platforms" description="Which channels to create content for">
                  {availablePlatforms.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No connected platforms found for this brand.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availablePlatforms.map((platform) => {
                        const IconComponent = platform.icon;
                        const isSelected = selectedPlatforms.includes(platform.value as Platform);
                        return (
                          <button
                            key={platform.value} type="button"
                            onClick={() => !isGenerating && handlePlatformToggle(platform.value as Platform)}
                            disabled={isGenerating}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                              isSelected
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border bg-background hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                            }`}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <IconComponent className={`w-4 h-4 shrink-0 ${platform.color}`} />
                            <span>{platform.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>

                {/* Custom Instructions */}
                <SectionCard icon={Settings2} title="Custom Instructions" description="Extra guidance for the AI (optional)">
                  <Textarea
                    placeholder="e.g., Always mention our free trial. Avoid competitor names. Use UK English. Include a stat in every post."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={3}
                    disabled={isGenerating}
                    className="resize-none text-sm"
                  />
                </SectionCard>


              </div>

              {/* ══ RIGHT COLUMN ══ */}
              <div className="space-y-5">

                {/* Voice & Style */}
                <SectionCard icon={MessageSquare} title="Voice & Style" description="How the content should sound">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel required>Tone</FieldLabel>
                      <Select value={tone} onValueChange={setTone} disabled={isGenerating}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel required>Language</FieldLabel>
                      <Select value={language} onValueChange={setLanguage} disabled={isGenerating}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required>CTA Goal</FieldLabel>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CTA_STYLES.map((c) => (
                        <button
                          key={c.value} type="button"
                          onClick={() => !isGenerating && setCtaStyle(c.value)}
                          disabled={isGenerating}
                          className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                            ctaStyle === c.value
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <p className="font-semibold">{c.label}</p>
                          <p className="text-muted-foreground mt-0.5 text-[10px]">{c.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Hashtags per Post</FieldLabel>
                    <div className="flex gap-1.5">
                      {[3, 5, 10, 15, 20].map((n) => (
                        <button
                          key={n} type="button"
                          onClick={() => !isGenerating && setHashtagCount(n)}
                          disabled={isGenerating}
                          className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition-all ${
                            hashtagCount === n
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted border-border text-muted-foreground"
                          }`}
                        >
                          #{n}
                        </button>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                {/* Content Pillars */}
                <SectionCard icon={Zap} title="Content Pillars" description="Optional mix of content types to include">
                  <div className="flex flex-wrap gap-1.5">
                    {CONTENT_PILLAR_OPTIONS.map((pillar) => {
                      const active = selectedPillars.includes(pillar);
                      return (
                        <button
                          key={pillar} type="button"
                          onClick={() => !isGenerating && handlePillarToggle(pillar)}
                          disabled={isGenerating}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {pillar}
                        </button>
                      );
                    })}
                  </div>
                  {selectedPillars.length > 0 && (
                    <p className="text-xs text-muted-foreground">{selectedPillars.length} pillar{selectedPillars.length !== 1 ? "s" : ""} selected</p>
                  )}
                </SectionCard>

                {/* Holidays */}
                <SectionCard icon={PartyPopper} title="Holiday-Aware Content" description="Schedule posts around public holidays & festivals">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Enable holiday calendar</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {enableHolidays && activeHolidays.length > 0
                          ? `${activeHolidays.length} holiday${activeHolidays.length !== 1 ? "s" : ""} will get themed posts`
                          : "Posts will be themed around local holidays"}
                      </p>
                    </div>
                    <Switch checked={enableHolidays} onCheckedChange={setEnableHolidays} disabled={isGenerating} />
                  </div>

                  {enableHolidays && (
                    <>
                      <div className="space-y-1.5">
                        <FieldLabel>Country</FieldLabel>
                        <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={isGenerating}>
                          <SelectTrigger className="h-10">
                            <Globe className="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {COUNTRY_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Holidays list with remove */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <FieldLabel>Holidays in range</FieldLabel>
                          <div className="flex items-center gap-3">
                            {removedHolidayKeys.size > 0 && (
                              <button
                                type="button"
                                onClick={() => setRemovedHolidayKeys(new Set())}
                                className="text-xs text-primary hover:underline"
                              >
                                Restore all ({removedHolidayKeys.size})
                              </button>
                            )}
                            {!isFetchingHolidays && (
                              <button
                                type="button"
                                onClick={fetchHolidaysInRange}
                                disabled={isGenerating}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Refresh
                              </button>
                            )}
                          </div>
                        </div>

                        {isFetchingHolidays ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Fetching holidays...
                          </div>
                        ) : holidayError ? (
                          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                            {holidayError}
                          </div>
                        ) : holidays.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic text-center py-3">
                            No public holidays found in this date range.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                            {holidays.map((h) => {
                              const key = `${h.date}-${h.name}`;
                              const removed = removedHolidayKeys.has(key);
                              return (
                                <div
                                  key={key}
                                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                                    removed
                                      ? "opacity-50 bg-muted/20 border-dashed"
                                      : "bg-background border-border hover:border-muted-foreground/30"
                                  }`}
                                >
                                  {/* Date pill */}
                                  <span className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                                    removed ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                                  }`}>
                                    {new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>

                                  {/* Name */}
                                  <span className={`flex-1 truncate font-medium ${removed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                    {h.name}
                                    {h.localName !== h.name && (
                                      <span className="text-muted-foreground font-normal ml-1">· {h.localName}</span>
                                    )}
                                  </span>

                                  {/* Action button */}
                                  {removed ? (
                                    <button
                                      type="button"
                                      onClick={() => restoreHoliday(h)}
                                      className="shrink-0 text-[10px] font-semibold text-primary hover:underline px-1"
                                    >
                                      Restore
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => removeHoliday(h)}
                                      className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded hover:bg-destructive/10"
                                    >
                                      <X className="w-3 h-3" />
                                      Remove
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {holidays.length > 0 && !holidayError && (
                          <p className="text-xs text-muted-foreground">
                            {activeHolidays.length > 0
                              ? `✨ ${activeHolidays.length} holiday${activeHolidays.length !== 1 ? "s" : ""} included`
                              : "No holidays included — all removed"}
                            {removedHolidayKeys.size > 0 && ` · ${removedHolidayKeys.size} excluded`}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </SectionCard>
              </div>
            </div>

            {/* ── Summary strip ── */}
            {selectedPlatforms.length > 0 && !isGenerating && (
              <div className="mx-6 mb-5 p-4 rounded-xl bg-muted/40 border border-border/60">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Generation Summary</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Date Range</p>
                    <p className="text-sm font-semibold">{formatDate(startDate)} → {formatDate(endDateStr)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Posts</p>
                    <p className="text-sm font-semibold">{totalPosts} ideas · {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Voice</p>
                    <p className="text-sm font-semibold">{TONE_OPTIONS.find(t => t.value === tone)?.label} · {language}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Extras</p>
                    <p className="text-sm font-semibold">
                      {[
                        `#${hashtagCount}`,
                        enableHolidays && activeHolidays.length > 0 && `${activeHolidays.length} holidays`,
                        selectedPillars.length > 0 && `${selectedPillars.length} pillars`,
                      ].filter(Boolean).join(" · ") || "None"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Progress ── */}
            {isGenerating && (
              <div className="mx-6 mb-5 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">{progress}</p>
                  <p className="text-xs text-muted-foreground">Please don't close this window.</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky Footer ── */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t bg-card">
            <p className="text-xs text-muted-foreground hidden sm:block">
              Estimated time: <span className="font-semibold text-foreground">2–5 minutes</span>
            </p>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={handleCloseAttempt} disabled={isGenerating}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim() || selectedPlatforms.length === 0}
                className="min-w-[160px]"
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Generate Calendar</>
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
              You have unsaved changes. Are you sure you want to close?
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