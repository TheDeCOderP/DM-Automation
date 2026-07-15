"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Store, 
  MapPin, 
  Star, 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw, 
  Loader2, 
  MessageSquare,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  PenSquare,
} from "lucide-react";
import useSWR from "swr";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { Eye, MousePointerClick, PhoneCall, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch data");
  }
  return res.json();
};

export default function BusinessDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  // 1. Fetch Location Details
  const { data: business, isLoading: loadingBusiness } = useSWR(
    `/api/locations/${businessId}`, 
    fetcher
  );

  // 2. Fetch Reviews from the new separated API endpoint
  const { data: reviewsData, isLoading: loadingReviews, mutate: mutateReviews } = useSWR(
    `/api/locations/${businessId}/reviews`, 
    fetcher
  );

  // 3. Fetch Insights Data
  const { data: insightsData, isLoading: loadingInsights } = useSWR(
    `/api/locations/${businessId}/insights`, 
    fetcher
  );

  const { data: postsData, isLoading: loadingPosts } = useSWR(
    `/api/locations/${businessId}/posts`, 
    fetcher
  );
  const localPosts = postsData?.posts || [];
  
  const reviews = reviewsData?.reviews || [];

  const [isSyncing, setIsSyncing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Sync reviews using the newly structured POST endpoint
  const handleSyncReviews = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/locations/${businessId}/reviews`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to sync");
      
      toast.success(data.message || "Reviews synced successfully");
      mutateReviews(); 
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync reviews");
    } finally {
      setIsSyncing(false);
    }
  };

  // Submit new or updated reply
  const handleSubmitReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);

    try {
      // Assuming your reply endpoint is set up here
      const res = await fetch(`/api/locations/${businessId}/reviews/${reviewId}/reply`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: replyText }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success("Reply successfully published to Google.");
      setReplyingTo(null);
      setReplyText("");
      mutateReviews(); 
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    }).format(new Date(dateString));
  };

  // ─── LOADING STATE ────────────────────────────────────────────────────────
  if (loadingBusiness) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <div className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <Skeleton className="h-12 w-full max-w-md rounded-lg" />
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-8">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Location Not Found</h2>
        <p className="text-muted-foreground mb-6">This business profile doesn't exist or you don't have access.</p>
        <Button onClick={() => router.push('/locations')}>Back to Locations</Button>
      </div>
    );
  }

  // ─── MAIN UI ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.back()} 
          className="mt-1 shrink-0 h-9 w-9 bg-background shadow-sm"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Button>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground min-w-0 max-w-full break-words line-clamp-2">
              {business.title}
            </h1>
            {business.isSuspended ? (
              <Badge variant="destructive" className="gap-1.5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                <AlertTriangle className="h-3 w-3"/> Suspended
              </Badge>
            ) : business.isVerified ? (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 gap-1.5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                <CheckCircle2 className="h-3 w-3" /> Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                Unverified
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {business.primaryCategory?.displayName && (
              <span className="flex items-center gap-1.5">
                <Store className="h-4 w-4 opacity-70"/> 
                {business.primaryCategory.displayName}
              </span>
            )}
            {business.address?.addressLines?.length > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 opacity-70"/> 
                {business.address.addressLines.join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs defaultValue="reviews" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 w-full sm:w-auto overflow-x-auto flex justify-start">
          <TabsTrigger value="overview" className="px-6">Overview</TabsTrigger>
          <TabsTrigger value="reviews" className="px-6">
            Reviews {reviews.length > 0 && <Badge variant="secondary" className="ml-2 bg-background">{reviews.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="posts" className="px-6">Local Posts</TabsTrigger>
          <TabsTrigger value="insights" className="px-6">Insights</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Manage your core Google Business profile details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-center justify-center border-2 border-dashed border-border/60 rounded-lg bg-muted/10">
                <p className="text-sm text-muted-foreground">Detailed business editing coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── REVIEWS TAB ─── */}
        <TabsContent value="reviews" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Customer Reviews</h3>
              <p className="text-sm text-muted-foreground">Monitor and respond to feedback across Google Search and Maps.</p>
            </div>
            <Button 
              onClick={handleSyncReviews} 
              disabled={isSyncing} 
              className="gap-2 shadow-sm whitespace-nowrap"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync from Google
            </Button>
          </div>

          <div className="grid gap-5">
            {loadingReviews ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-border/40 shadow-sm p-6"><Skeleton className="h-24 w-full"/></Card>
              ))
            ) : reviews.length === 0 ? (
              <Card className="border-border/40 border-dashed shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">No reviews found</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mb-6">
                    We don't have any reviews stored in the database for this location yet.
                  </p>
                  <Button onClick={handleSyncReviews} disabled={isSyncing} variant="outline" className="bg-background">
                    Fetch Reviews Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              reviews.map((review: any) => (
                <Card key={review.id} className="overflow-hidden border-border/50 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="p-0">
                    
                    {/* Review Header & Content */}
                    <div className="p-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-4">
                          <Avatar className="h-11 w-11 border border-border/50 shadow-sm">
                            <AvatarImage src={review.reviewerImage} />
                            <AvatarFallback className="bg-primary/5 text-primary font-medium">
                              {review.reviewerName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{review.reviewerName || "A Google User"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-3.5 w-3.5 ${i < review.starRating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`} 
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(review.createTime)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {review.comment && (
                        <p className="mt-4 text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>

                    <Separator className="bg-border/40" />

                    {/* Reply Section Handler */}
                    <div className="px-6 py-4 bg-muted/10">
                      {replyingTo === review.reviewId ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <Textarea 
                            placeholder="Write your public response as the business owner..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="min-h-[120px] text-sm bg-background resize-y"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText("");
                              }}
                              disabled={isSubmittingReply}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleSubmitReply(review.reviewId)}
                              disabled={isSubmittingReply || !replyText.trim()}
                              className="shadow-sm"
                            >
                              {isSubmittingReply && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                              Publish Response
                            </Button>
                          </div>
                        </div>
                      ) : review.isReplied ? (
                        <div className="bg-background rounded-lg border border-border/50 p-4 relative shadow-sm">
                          <div className="absolute top-4 right-4">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setReplyingTo(review.reviewId);
                                setReplyText(review.replyComment || "");
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Store className="h-4 w-4 text-primary" />
                            <p className="font-semibold text-sm text-foreground">Response from owner</p>
                            {review.replyUpdateTime && (
                              <span className="text-[11px] text-muted-foreground ml-2">
                                {formatDate(review.replyUpdateTime)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed pr-12">
                            {review.replyComment}
                          </p>
                        </div>
                      ) : (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-background shadow-sm border border-border/50 hover:bg-muted"
                          onClick={() => {
                            setReplyingTo(review.reviewId);
                            setReplyText("");
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                          Reply to Review
                        </Button>
                      )}
                    </div>

                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        {/* ─── POSTS TAB ─── */}
        <TabsContent value="posts" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Google Local Posts</h3>
              <p className="text-sm text-muted-foreground">View your active announcements, offers, and updates live on Google.</p>
            </div>
            <Button 
              onClick={() => router.push('/content-calendar')} 
              className="shadow-sm whitespace-nowrap"
            >
              <PenSquare className="h-4 w-4 mr-2" />
              Create New Post
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingPosts ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-border/40 shadow-sm overflow-hidden">
                  <Skeleton className="h-48 w-full rounded-none"/>
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-4 w-3/4"/>
                    <Skeleton className="h-4 w-1/2"/>
                  </CardContent>
                </Card>
              ))
            ) : localPosts.length === 0 ? (
              <div className="col-span-full">
                <Card className="border-border/40 border-dashed shadow-none">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <ImageIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">No local posts found</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mb-6">
                      You haven't published any local updates to this Google Business Profile yet.
                    </p>
                    <Button onClick={() => router.push('/content-calendar')} variant="outline" className="bg-background">
                      Schedule a Post
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              localPosts.map((post: any) => (
                <Card key={post.name} className="overflow-hidden flex flex-col border-border/50 shadow-sm transition-all hover:shadow-md">
                  {/* Media Section */}
                  {post.media && post.media.length > 0 ? (
                    <div className="relative h-48 w-full bg-muted overflow-hidden">
                      <img 
                        src={post.media[0].sourceUrl} 
                        alt="Post media" 
                        className="object-cover w-full h-full"
                      />
                      <Badge className="absolute top-3 left-3 bg-black/60 text-white backdrop-blur-sm border-none shadow-none text-[10px] uppercase tracking-wider">
                        {post.topicType}
                      </Badge>
                    </div>
                  ) : (
                    <div className="h-4 bg-primary/10 w-full" />
                  )}

                  <CardContent className="p-5 flex-1 flex flex-col">
                    {!post.media && (
                      <Badge variant="secondary" className="w-fit mb-3 text-[10px] uppercase tracking-wider">
                        {post.topicType}
                      </Badge>
                    )}
                    
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap flex-1 leading-relaxed">
                      {post.summary}
                    </p>

                    {post.callToAction && (
                      <div className="mt-5 pt-5 border-t border-border/50">
                        <Button 
                          variant="secondary" 
                          className="w-full text-xs font-semibold"
                          onClick={() => window.open(post.callToAction.url, '_blank')}
                        >
                          {post.callToAction.actionType.replace(/_/g, ' ')}
                          <ExternalLink className="w-3 h-3 ml-2" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  
                  <div className="bg-muted/30 px-5 py-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(post.createTime)}
                    </span>
                    {post.searchUrl && (
                      <a 
                        href={post.searchUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        View on Google <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ─── INSIGHTS TAB ─── */}
        <TabsContent value="insights" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
            <div>
              <h3 className="text-lg font-semibold text-foreground">30-Day Performance Overview</h3>
              <p className="text-sm text-muted-foreground">Monitor your search visibility and customer interactions.</p>
            </div>
          </div>

          {loadingInsights ? (
            <div className="grid gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
              <Skeleton className="h-[400px] rounded-xl w-full" />
            </div>
          ) : !insightsData?.timeSeries ? (
            <Card className="border-border/40 border-dashed shadow-none">
               <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                 <AlertTriangle className="h-8 w-8 text-amber-500 mb-4 opacity-80" />
                 <h3 className="text-lg font-medium text-foreground mb-1">Insights Unavailable</h3>
                 {/* This will render the specific "Performance insights are only available..." message we wrote in the backend */}
                 <p className="text-sm text-muted-foreground max-w-md">
                   {business.isVerified === false 
                     ? "Performance insights are only available for verified locations. Please verify this business on Google." 
                     : "Unable to load insights data right now."}
                 </p>
               </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Impressions</CardTitle>
                    <Eye className="h-4 w-4 text-primary opacity-70" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {insightsData.timeSeries.reduce((acc: number, curr: any) => acc + curr.impressions, 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Interactions</CardTitle>
                    <MousePointerClick className="h-4 w-4 text-emerald-500 opacity-70" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {insightsData.timeSeries.reduce((acc: number, curr: any) => acc + curr.interactions, 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Website Clicks</CardTitle>
                    <Globe className="h-4 w-4 text-blue-500 opacity-70" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {insightsData.timeSeries.reduce((acc: number, curr: any) => acc + curr.websiteClicks, 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Phone Calls</CardTitle>
                    <PhoneCall className="h-4 w-4 text-amber-500 opacity-70" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {insightsData.timeSeries.reduce((acc: number, curr: any) => acc + curr.calls, 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle>Visibility & Engagement Trends</CardTitle>
                  <CardDescription>Daily breakdown of profile views and customer actions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={insightsData.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(val) => {
                            const date = new Date(val);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '4px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="impressions" 
                          name="Impressions" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorImpressions)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="interactions" 
                          name="Interactions" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorInteractions)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}