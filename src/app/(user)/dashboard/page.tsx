"use client";

import React from "react";
import Link from "next/link";
import useSWR from "swr";
import { formatDistanceToNow, format } from "date-fns";
import {
  FileText,
  Send,
  Heart,
  Users,
  Megaphone,
  Sparkles,
  Linkedin,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Globe,
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  ImageIcon,
  Video,
  BarChart3,
  Upload,
  Zap,
  FileSpreadsheet,
  AlertTriangle,
  HardDrive,
  Star,
  ArrowUpRight,
  Bell,
  Inbox,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* --------------------------- static-only data ---------------------------
 * These four cards have no backing model yet (no Campaign, Lead, AI-usage,
 * or Storage-provider tables), so per your call they stay as placeholders
 * until that schema exists. Everything else on this page is live.
 * -------------------------------------------------------------------- */
const staticLeads = { value: "89", delta: "↑ 34%", deltaNote: "vs last 7 days" };
const staticCampaignsCount = { value: "7", delta: "→ 0%", deltaNote: "vs last 7 days" };
const staticAiCredits = { pct: 0.78, used: "7,800", total: "10,000" };

const storage = [
  { name: "Google Drive", value: "38 GB", color: "bg-blue-600" },
  { name: "Dropbox", value: "18 GB", color: "bg-sky-400" },
  { name: "OneDrive", value: "12 GB", color: "bg-indigo-800" },
];

const aiSuggestions = [
  "Generate 3 LinkedIn posts",
  "Repurpose yesterday's blog",
  "Best posting time: 6:30 PM",
];
const trendingTopics = ["Artificial Intelligence", "Digital Marketing", "ChatGPT"];

const campaign = {
  name: "Summer Sale Campaign",
  metrics: [
    { label: "Reach", value: "52.3K", delta: "↑ 24%" },
    { label: "Engagement", value: "8.4%", delta: "↑ 16%" },
    { label: "Clicks", value: "2,438", delta: "↑ 32%" },
    { label: "Leads", value: "183", delta: "↑ 18%" },
    { label: "ROI", value: "4.2X", delta: "↑ 22%" },
  ],
};

/* ------------------------------- platform ui ------------------------------ */

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  LINKEDIN: Linkedin,
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  YOUTUBE: Youtube,
  TWITTER: Twitter,
};
function platformIcon(platform: string) {
  return PLATFORM_ICONS[platform] || Globe;
}

const PLATFORM_COLORS: Record<string, string> = {
  LINKEDIN: "#2563eb",
  FACEBOOK: "#1e3a8a",
  INSTAGRAM: "#f97316",
  YOUTUBE: "#ef4444",
  TWITTER: "#0f172a",
  PINTEREST: "#e11d48",
};
const FALLBACK_COLORS = ["#6366f1", "#059669", "#d97706", "#7c3aed", "#0891b2"];
function platformColor(platform: string, i: number) {
  return PLATFORM_COLORS[platform] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
}
function platformLabel(platform: string) {
  return platform.charAt(0) + platform.slice(1).toLowerCase();
}

const FILE_TYPE_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  DOCUMENT: { icon: FileText, color: "text-red-500", bg: "bg-red-50" },
  IMAGE: { icon: ImageIcon, color: "text-blue-500", bg: "bg-blue-50" },
  VIDEO: { icon: Video, color: "text-violet-600", bg: "bg-violet-50" },
  LINK: { icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50" },
  NOTE: { icon: FileSpreadsheet, color: "text-emerald-600", bg: "bg-emerald-50" },
};

const NOTIF_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  POST_PUBLISHED: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  POST_FAILED: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  POST_SCHEDULED: { icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
  ACCOUNT_DISCONNECTED: { icon: Share2Icon, color: "text-pink-500", bg: "bg-pink-50" },
  SUBSCRIPTION_RENEWAL: { icon: Bell, color: "text-orange-500", bg: "bg-orange-50" },
  GENERAL: { icon: Bell, color: "text-slate-500", bg: "bg-slate-50" },
};
// small alias since lucide's disconnect-style icon is just Globe here
function Share2Icon(props: any) {
  return <Globe {...props} />;
}

const AVATAR_COLORS = ["bg-pink-200", "bg-blue-200", "bg-violet-200", "bg-emerald-200", "bg-orange-200"];

function deltaColor(pct: number | null) {
  if (pct === null) return "text-slate-400";
  if (pct > 0) return "text-emerald-600";
  if (pct < 0) return "text-red-500";
  return "text-slate-400";
}
function deltaLabel(pct: number | null) {
  if (pct === null) return "—";
  if (pct > 0) return `↑ ${pct}%`;
  if (pct < 0) return `↓ ${Math.abs(pct)}%`;
  return "→ 0%";
}

/* ---------------------------------- helpers ---------------------------------- */

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-1">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {action}
    </div>
  );
}

function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200/70 ${className}`} />;
}

function postLabel(p: { title?: string | null; content: string }) {
  return p.title || p.content?.slice(0, 60) || "Untitled";
}

/* ---------------------------------- page ---------------------------------- */

export default function DashboardPage() {
  const { data, isLoading } = useSWR("/api/dashboard/stats", fetcher, { refreshInterval: 60_000 });

  const stats = data?.stats;
  const priorities = data?.priorities;
  const pipeline = data?.pipeline;
  const platformBreakdown = data?.platformBreakdown ?? [];
  const topPost = data?.topPost;
  const schedule = data?.schedule ?? [];
  const recentFiles = data?.recentFiles ?? [];
  const teamActivity = data?.teamActivity ?? [];
  const platformHealth = data?.platformHealth ?? [];
  const notifications = data?.notifications ?? [];

  // Build "Today's Priorities" from real signals
  const priorityItems: Array<{ icon: React.ElementType; iconBg: string; iconColor: string; title: string; subtitle: string; action: string; href: string }> = [];
  if (priorities) {
    for (const platform of priorities.expiredPlatforms) {
      priorityItems.push({
        icon: platformIcon(platform),
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        title: `${platformLabel(platform)} token`,
        subtitle: "Expired",
        action: "Reconnect",
        href: "/accounts",
      });
    }
    if (priorities.pendingInvites > 0) {
      priorityItems.push({
        icon: Bell,
        iconBg: "bg-orange-50",
        iconColor: "text-orange-500",
        title: `${priorities.pendingInvites} Pending`,
        subtitle: "invitation(s)",
        action: "Review",
        href: "/accounts",
      });
    }
    if (priorities.drafted > 0) {
      priorityItems.push({
        icon: FileText,
        iconBg: "bg-indigo-50",
        iconColor: "text-indigo-500",
        title: `${priorities.drafted} Drafts`,
        subtitle: "need attention",
        action: "Review",
        href: "/posts?status=DRAFTED",
      });
    }
    if (priorities.scheduledToday > 0) {
      priorityItems.push({
        icon: Calendar,
        iconBg: "bg-orange-50",
        iconColor: "text-orange-500",
        title: `${priorities.scheduledToday} Posts Scheduled`,
        subtitle: "today",
        action: "View Calendar",
        href: "/content-calendar",
      });
    }
  }

  const pipelineSteps = pipeline
    ? [
        { label: "Drafts", value: pipeline.drafted, icon: FileText, circleBg: "bg-blue-50", iconColor: "text-blue-600" },
        { label: "Scheduled", value: pipeline.scheduled, icon: Calendar, circleBg: "bg-indigo-50", iconColor: "text-indigo-600" },
        { label: "Published", value: pipeline.published, icon: Send, circleBg: "bg-emerald-50", iconColor: "text-emerald-600" },
        { label: "Failed", value: pipeline.failed, icon: AlertTriangle, circleBg: "bg-red-50", iconColor: "text-red-500" },
        { label: "Top Performing", value: pipeline.topPerforming, icon: Star, circleBg: "bg-orange-50", iconColor: "text-orange-500" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[#F6F7FB] font-sans text-slate-800 p-4 sm:p-6 lg:p-8">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back <span className="inline-block">👋</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Create smarter. Automate faster. Grow everywhere.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link href="/posts/create" className="inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors w-full sm:w-auto">
            <span className="text-base leading-none">+</span> Create Post
          </Link>
          <button className="inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors w-full sm:w-auto">
            <Sparkles className="h-4 w-4 text-blue-600" /> Generate with AI
          </button>
          <Link href="/content-calendar" className="inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors w-full sm:w-auto">
            <Calendar className="h-4 w-4 text-slate-500" /> Schedule
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-50">
              <FileText className="h-4.5 w-4.5 text-blue-600" size={18} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Total Content Created</p>
            {isLoading ? <Skel className="h-7 w-14 mt-1" /> : (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{stats?.totalContent ?? 0}</span>
              </div>
            )}
          </div>
          <p className={`mt-1 text-xs font-medium ${deltaColor(stats?.totalContentDeltaPct)}`}>
            {deltaLabel(stats?.totalContentDeltaPct)} <span className="text-slate-400 font-normal">vs last 7 days</span>
          </p>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-50">
              <Send className="h-4.5 w-4.5 text-emerald-600" size={18} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Published Today</p>
            {isLoading ? <Skel className="h-7 w-14 mt-1" /> : (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{stats?.publishedToday ?? 0}</span>
              </div>
            )}
          </div>
          <p className={`mt-1 text-xs font-medium ${deltaColor(stats?.publishedTodayDeltaPct)}`}>
            {deltaLabel(stats?.publishedTodayDeltaPct)} <span className="text-slate-400 font-normal">vs yesterday</span>
          </p>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-pink-50">
              <Heart className="h-4.5 w-4.5 text-pink-500" size={18} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Engagement Rate</p>
            {isLoading ? <Skel className="h-7 w-14 mt-1" /> : (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{stats?.engagementRate ?? 0}%</span>
              </div>
            )}
          </div>
          <p className={`mt-1 text-xs font-medium ${deltaColor(stats?.engagementDeltaPct)}`}>
            {deltaLabel(stats?.engagementDeltaPct)} <span className="text-slate-400 font-normal">vs last 7 days</span>
          </p>
        </Card>

        {/* Static placeholder: no Lead model yet */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-violet-50">
              <Users className="h-4.5 w-4.5 text-violet-600" size={18} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Leads Generated</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{staticLeads.value}</span>
            </div>
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-600">
            {staticLeads.delta} <span className="text-slate-400 font-normal">{staticLeads.deltaNote}</span>
          </p>
        </Card>

        {/* Static placeholder: no Campaign model yet */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-rose-50">
              <Megaphone className="h-4.5 w-4.5 text-rose-500" size={18} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Active Campaigns</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{staticCampaignsCount.value}</span>
            </div>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-400">
            {staticCampaignsCount.delta} <span className="font-normal">{staticCampaignsCount.deltaNote}</span>
          </p>
        </Card>

        {/* Static placeholder: no AI-usage/credits model yet */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-50">
                <Sparkles className="h-4.5 w-4.5 text-blue-600" size={18} />
              </div>
              <div className="relative h-9 w-9">
                <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none" stroke="#2563EB" strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 15.5}`}
                    strokeDashoffset={`${2 * Math.PI * 15.5 * (1 - staticAiCredits.pct)}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">AI Credits Left</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{Math.round(staticAiCredits.pct * 100)}%</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-400">{staticAiCredits.used} / {staticAiCredits.total}</p>
        </Card>
      </div>

      {/* Today's priorities */}
      <Card className="mb-6 p-5 overflow-hidden">
        <h3 className="text-sm font-semibold text-slate-800">Today&apos;s Priorities</h3>
        <p className="text-xs text-slate-400 mb-4">Stay on top of important tasks</p>
        {isLoading ? (
          <div className="flex gap-6">
            {Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-9 w-40" />)}
          </div>
        ) : priorityItems.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground text-slate-400 text-sm">
            <CheckCircle2 className="h-4 w-4 opacity-50" /> All caught up — nothing needs your attention.
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-2 snap-x sm:flex-wrap gap-6 sm:overflow-visible sm:pb-0 hide-scrollbar">
            {priorityItems.map((p, i) => (
              <div key={i} className="flex items-center gap-3 min-w-[180px] snap-start">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${p.iconBg}`}>
                  <p.icon className={`h-4.5 w-4.5 ${p.iconColor}`} size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-600 leading-tight">
                    {p.title}
                    <br />
                    {p.subtitle}
                  </p>
                  <Link href={p.href} className="text-xs font-medium text-blue-600 hover:underline mt-0.5 inline-block">
                    {p.action}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Main grid: left content + right sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Content pipeline + AI command center */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <Card className="p-5 overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Content Pipeline</h3>
                  <p className="text-xs text-slate-400">Track your content workflow</p>
                </div>
              </div>

              <div className="mt-8 flex items-center overflow-x-auto pb-4 snap-x hide-scrollbar justify-start sm:justify-between">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skel key={i} className="h-12 w-12 rounded-full mr-6" />)
                ) : (
                  pipelineSteps.map((step, i) => (
                    <React.Fragment key={step.label}>
                      <div className="flex flex-col items-center gap-2 shrink-0 snap-start px-2 sm:px-0">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${step.circleBg}`}>
                          <step.icon className={`h-5 w-5 ${step.iconColor}`} />
                        </div>
                        <span className="text-base font-bold text-slate-900 leading-none">{step.value}</span>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{step.label}</span>
                      </div>
                      {i < pipelineSteps.length - 1 && (
                        <div className="flex-1 h-px bg-slate-200 mx-2 min-w-[32px] sm:min-w-[16px] -mt-6 shrink-0" />
                      )}
                    </React.Fragment>
                  ))
                )}
              </div>
            </Card>

            {/* AI Command Center: suggestions/trending are generated, kept static */}
            <Card className="p-5 bg-gradient-to-b from-white to-white">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">AI Command Center</h3>
                <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                  Powered by AI
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">Good morning!</p>
              <p className="text-xs text-slate-400 mb-3">
                Here are your AI-powered suggestions for today.
              </p>

              <ul className="space-y-2 mb-4">
                {aiSuggestions.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> {s}
                  </li>
                ))}
              </ul>

              <p className="text-xs text-slate-400 mb-2">Trending Topic</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {trendingTopics.map((t) => (
                  <span key={t} className="text-[11px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>

              <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors mt-auto">
                <Sparkles className="h-4 w-4" /> Generate Content
              </button>
            </Card>
          </div>

          {/* Campaign Performance: static, no Campaign model yet */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Campaign Performance</h3>
              <button className="text-xs font-medium text-blue-600 flex items-center gap-1">
                View Report <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <Megaphone className="h-4.5 w-4.5 text-orange-500" size={18} />
              </div>
              <span className="text-sm font-semibold text-slate-800">{campaign.name}</span>
              <span className="text-[11px] font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {campaign.metrics.map((m) => (
                <div key={m.label}>
                  <p className="text-xs text-slate-400">{m.label}</p>
                  <p className="text-lg font-bold text-slate-900">
                    {m.value} <span className="text-xs font-medium text-emerald-600">{m.delta}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Posts by platform / Top performing post / Upcoming schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <SectionHeader title="Posts by Platform" />
              <div className="px-5 pb-5 flex flex-col sm:flex-row md:flex-col lg:flex-row items-center gap-4">
                {isLoading ? (
                  <Skel className="h-32 w-32 rounded-full" />
                ) : platformBreakdown.length === 0 ? (
                  <div className="w-full flex flex-col items-center py-6 text-slate-400 text-xs gap-2">
                    <Inbox className="h-6 w-6 opacity-40" /> No posts yet
                  </div>
                ) : (
                  <>
                    <div className="h-32 w-32 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={platformBreakdown}
                            dataKey="percentage"
                            nameKey="platform"
                            innerRadius={38}
                            outerRadius={58}
                            paddingAngle={0}
                            stroke="#ffffff"
                            strokeWidth={1}
                          >
                            {platformBreakdown.map((d: any, i: number) => (
                              <Cell key={d.platform} fill={platformColor(d.platform, i)} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-1.5 text-xs w-full">
                      {platformBreakdown.map((d: any, i: number) => (
                        <li key={d.platform} className="flex items-center gap-2 text-slate-600">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: platformColor(d.platform, i) }} />
                          {platformLabel(d.platform)}
                          <span className="ml-auto font-medium text-slate-800">{d.percentage}%</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </Card>

            <Card>
              <SectionHeader title="Top Performing Post" />
              <div className="px-5 pb-5">
                {isLoading ? (
                  <Skel className="h-28 w-full rounded-xl" />
                ) : !topPost ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                    <Star className="h-6 w-6 mb-2 opacity-40" />
                    <p className="text-sm">No performance data yet</p>
                  </div>
                ) : (
                  <>
                    <div className="relative h-28 w-full rounded-xl overflow-hidden mb-3 bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-900">
                      <div
                        className="absolute inset-0 opacity-70"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle at 20% 30%, rgba(96,165,250,0.45), transparent 45%), radial-gradient(circle at 75% 65%, rgba(129,140,248,0.4), transparent 50%), radial-gradient(circle at 50% 100%, rgba(56,189,248,0.3), transparent 55%)",
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-white/30" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 mb-1">
                      {React.createElement(platformIcon(topPost.platform), { className: "h-3.5 w-3.5" })}
                      {platformLabel(topPost.platform)}
                      {topPost.publishedAt ? ` · ${format(new Date(topPost.publishedAt), "d MMM, yyyy")}` : ""}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mb-3 truncate">
                      {postLabel(topPost)}
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-center mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{topPost.reach}</p>
                        <p className="text-[10px] text-slate-400">Reach</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{topPost.likes}</p>
                        <p className="text-[10px] text-slate-400">Likes</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{topPost.comments}</p>
                        <p className="text-[10px] text-slate-400">Comms</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{topPost.shares}</p>
                        <p className="text-[10px] text-slate-400">Shares</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-50 px-2.5 py-1 rounded-full">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      Top Performer
                    </span>
                  </>
                )}
              </div>
            </Card>

            <Card className="md:col-span-2 lg:col-span-1">
              <SectionHeader
                title="Upcoming Schedule"
                action={
                  <Link href="/content-calendar" className="flex items-center gap-1 text-xs text-slate-500">
                    Today <ChevronRight className="h-3 w-3 rotate-90" />
                  </Link>
                }
              />
              <div className="px-5 pb-3">
                {isLoading ? (
                  <div className="space-y-3 py-3">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-6 w-full" />)}</div>
                ) : schedule.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-slate-400 text-xs gap-2">
                    <Clock className="h-6 w-6 opacity-40" /> Nothing scheduled
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {schedule.map((s: any) => {
                      const Icon = platformIcon(s.platform);
                      return (
                        <li key={s.id} className="py-3 flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-16 shrink-0">{format(new Date(s.scheduledAt), "h:mm a")}</span>
                          <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                          <span className="text-xs text-slate-700 flex-1 truncate">{postLabel(s)}</span>
                          <span className="text-[11px] font-medium text-blue-600 shrink-0">Scheduled</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Link href="/content-calendar" className="text-xs font-medium text-blue-600 flex items-center gap-1 pt-1 pb-1">
                  View Calendar <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>
          </div>

          {/* Recent files / Team activity / Storage usage / Platform health */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <SectionHeader title="Recent Files" />
              {isLoading ? (
                <div className="px-5 pb-5 space-y-3 mt-2">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-8 w-full" />)}</div>
              ) : recentFiles.length === 0 ? (
                <div className="px-5 pb-5 flex flex-col items-center py-4 text-slate-400 text-xs gap-2">
                  <Inbox className="h-5 w-5 opacity-40" /> No files yet
                </div>
              ) : (
                <ul className="px-5 pb-5 space-y-3 mt-2">
                  {recentFiles.map((f: any) => {
                    const cfg = FILE_TYPE_ICONS[f.type] || FILE_TYPE_ICONS.NOTE;
                    return (
                      <li key={f.id} className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                          <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-700 truncate">{f.name}</p>
                          <p className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <SectionHeader title="Team Activity" />
              {isLoading ? (
                <div className="px-5 pb-5 space-y-3 mt-2">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-8 w-full" />)}</div>
              ) : teamActivity.length === 0 ? (
                <div className="px-5 pb-5 flex flex-col items-center py-4 text-slate-400 text-xs gap-2">
                  <Inbox className="h-5 w-5 opacity-40" /> No recent activity
                </div>
              ) : (
                <ul className="px-5 pb-5 space-y-3 mt-2">
                  {teamActivity.map((t: any, i: number) => (
                    <li key={t.id} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`} />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-700 truncate">
                          <span className="font-medium">{t.userName}</span> {t.action.replace(/_/g, " ").toLowerCase()}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Static: no storage-provider model yet */}
            <Card>
              <SectionHeader title="Storage Usage" />
              <div className="px-5 pb-5 flex items-center gap-4 mt-2">
                <div className="relative h-16 w-16 xl:h-20 xl:w-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2563EB" strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 15.5}`}
                      strokeDashoffset={`${2 * Math.PI * 15.5 * (1 - 0.68)}`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs xl:text-sm font-bold text-slate-800">68%</span>
                </div>
                <div className="text-xs w-full">
                  <p className="font-semibold text-slate-800 mb-2 truncate">68 / 100 GB</p>
                  <ul className="space-y-1.5">
                    {storage.map((s) => (
                      <li key={s.name} className="flex items-center gap-2 text-slate-500">
                        <span className={`h-2 w-2 rounded-full ${s.color}`} />
                        <span className="truncate">{s.name}</span> <span className="ml-auto text-slate-700 shrink-0">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            <Card>
              <SectionHeader title="Platform Health" />
              {isLoading ? (
                <div className="px-5 pb-5 space-y-3 mt-2">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-6 w-full" />)}</div>
              ) : platformHealth.length === 0 ? (
                <div className="px-5 pb-5 flex flex-col items-center py-4 text-slate-400 text-xs gap-2">
                  <Inbox className="h-5 w-5 opacity-40" /> No accounts connected
                </div>
              ) : (
                <ul className="px-5 pb-5 space-y-3 mt-2">
                  {platformHealth.map((p: any) => {
                    const Icon = platformIcon(p.platform);
                    return (
                      <li key={p.platform} className="flex items-center gap-2 text-xs">
                        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="text-slate-700 truncate">{platformLabel(p.platform)}</span>
                        <span className="ml-auto flex items-center gap-1.5 shrink-0">
                          <span className={`h-1.5 w-1.5 rounded-full ${p.expired ? "bg-red-500" : "bg-emerald-500"}`} />
                          <span className={p.expired ? "text-red-500" : "text-emerald-600"}>
                            {p.expired ? "Token Expired" : "Operational"}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
              <Link href="/notifications" className="text-xs text-blue-600">View all</Link>
            </div>
            {isLoading ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-8 w-full" />)}</div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-slate-400 justify-center">
                <Bell className="h-4 w-4 opacity-40" /> <p className="text-sm">All caught up</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {notifications.map((n: any) => {
                  const cfg = NOTIF_ICONS[n.type] || NOTIF_ICONS.GENERAL;
                  return (
                    <li key={n.id} className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-700 leading-snug truncate">{n.title}</p>
                        <p className="text-[10px] text-slate-400 leading-snug line-clamp-1">{n.message}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2 gap-3">
              {[
                { label: "Create Post", icon: FileText, color: "text-blue-600", href: "/posts/create" },
                { label: "AI Content", icon: Sparkles, color: "text-violet-600", href: "/posts/create?ai=1" },
                { label: "AI Image", icon: ImageIcon, color: "text-orange-500", href: "/posts/create?ai=image" },
                { label: "AI Video", icon: Video, color: "text-red-500", href: "/posts/create?ai=video" },
                { label: "Schedule", icon: Calendar, color: "text-emerald-600", href: "/content-calendar" },
                { label: "Analytics", icon: BarChart3, color: "text-indigo-600", href: "/analytics" },
                { label: "Upload Media", icon: Upload, color: "text-blue-500", href: "/media" },
                { label: "Automate", icon: Zap, color: "text-amber-500", href: "/accounts" },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <a.icon className={`h-4 w-4 shrink-0 ${a.color}`} /> <span className="truncate">{a.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Automation Status</h3>
              <Link href="/accounts" className="text-xs text-blue-600">View all</Link>
            </div>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-6 w-full" />)}</div>
            ) : platformHealth.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-slate-400 justify-center">
                <Zap className="h-4 w-4 opacity-40" /> <p className="text-sm">No connections yet</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {platformHealth.map((p: any) => {
                  const Icon = platformIcon(p.platform);
                  return (
                    <li key={p.platform} className="flex items-center gap-2 text-xs">
                      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="text-slate-700">{platformLabel(p.platform)}</span>
                      <span className={`ml-auto font-medium ${p.expired ? "text-red-500" : "text-emerald-600"}`}>
                        {p.expired ? "Disconnected" : "Healthy"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}