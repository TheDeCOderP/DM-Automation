'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import BarChart from '@/components/analytics/BarChart';
import PieChart from '@/components/analytics/PieChart';
import LineChart from '@/components/analytics/LineChart';
import DonutChart from '@/components/analytics/DonutChart';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  Calendar,
  Users,
  Target,
  AlertCircle,
  ChartNoAxesCombined
} from 'lucide-react';

interface PlatformStats {
  total: number;
  successful: number;
  failed: number;
}

interface BrandStats {
  total: number;
  successful: number;
  failed?: number;
}

interface DailyStats {
  total: number;
  successful: number;
  failed: number;
}

interface AnalyticsData {
  totalPosts: number;
  successfulPosts: number;
  failedPosts: number;
  scheduledPosts: number;
  draftedPosts: number;
  platformStats: Record<string, PlatformStats>;
  brandStats: Record<string, BrandStats>;
  dailyStats: Record<string, DailyStats>;
  successRate: number;
  period: string;
  startDate: string;
  endDate: string;
}

const TIME_PERIODS = [
  { value: '1w', label: '1 Week' },
  { value: '2w', label: '2 Weeks' },
  { value: '1m', label: '1 Month' },
  { value: '2m', label: '2 Months' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' }
];

const PLATFORM_COLORS: Record<string, string> = {
  FACEBOOK: '#1877f2',
  INSTAGRAM: '#e4405f',
  TWITTER: '#1da1f2',
  LINKEDIN: '#0077b5',
  ALL: '#6b7280'
};

const STATUS_COLORS = {
  PUBLISHED: '#10b981',
  FAILED: '#ef4444',
  SCHEDULED: '#f59e0b',
  DRAFTED: '#6b7280'
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('1m');

  const fetchAnalytics = async (period: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics?period=${period}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No data available</h3>
          <p className="text-muted-foreground">Unable to load analytics data.</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const platformChartData = Object.entries(data.platformStats).map(([platform, stats]) => ({
    label: platform,
    value: stats.total,
    color: PLATFORM_COLORS[platform] || '#6b7280'
  }));

  const brandChartData = Object.entries(data.brandStats).map(([brand, stats]) => ({
    label: brand,
    value: stats.total
  }));

  const statusChartData = [
    { label: 'Published', value: data.successfulPosts, color: STATUS_COLORS.PUBLISHED },
    { label: 'Failed', value: data.failedPosts, color: STATUS_COLORS.FAILED },
    { label: 'Scheduled', value: data.scheduledPosts, color: STATUS_COLORS.SCHEDULED },
    { label: 'Drafted', value: data.draftedPosts, color: STATUS_COLORS.DRAFTED }
  ].filter(item => item.value > 0);

  const timelineData = Object.entries(data.dailyStats)
    .map(([date, stats]) => ({
      date,
      value: stats.total,
      successful: stats.successful,
      failed: stats.failed
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const platformSuccessData = Object.entries(data.platformStats).map(([platform, stats]) => ({
    label: platform,
    value: stats.successful,
    color: PLATFORM_COLORS[platform] || '#6b7280'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="relative">
            <ChartNoAxesCombined className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Analytics
            </h1>
            <p className="text-muted-foreground text-lg">Overview of your social media posting performance</p>
          </div>
        </div>
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-40">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_PERIODS.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPosts}</div>
            <p className="text-xs text-muted-foreground">
              All posts in selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.successfulPosts} successful posts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Posts</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.failedPosts}</div>
            <p className="text-xs text-muted-foreground">
              Posts that failed to publish
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.scheduledPosts}</div>
            <p className="text-xs text-muted-foreground">
              Posts waiting to be published
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts by Platform */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Posts by Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            {platformChartData.length > 0 ? (
              <PieChart 
                data={platformChartData} 
                width={400} 
                height={300}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No platform data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Post Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <DonutChart 
                data={statusChartData} 
                width={400} 
                height={300}
                centerText={`${data.successRate}%`}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Posts by Brand */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Posts by Brand
            </CardTitle>
          </CardHeader>
          <CardContent>
            {brandChartData.length > 0 ? (
              <BarChart 
                data={brandChartData} 
                width={400} 
                height={300}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No brand data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Successful Posts by Platform */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Successful Posts by Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            {platformSuccessData.length > 0 ? (
              <BarChart 
                data={platformSuccessData} 
                width={400} 
                height={300}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No success data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      {timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Posts Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart 
              data={timelineData} 
              width={800} 
              height={400}
            />
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.platformStats).map(([platform, stats]) => (
              <div key={platform} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: PLATFORM_COLORS[platform] || '#6b7280' }}
                  />
                  <span className="text-sm">{platform}</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{stats.total}</Badge>
                  <Badge variant="outline" className="text-green-600">
                    {stats.successful}
                  </Badge>
                  {stats.failed > 0 && (
                    <Badge variant="outline" className="text-red-600">
                      {stats.failed}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.brandStats).slice(0, 5).map(([brand, stats]) => (
              <div key={brand} className="flex justify-between items-center">
                <span className="text-sm truncate">{brand}</span>
                <div className="flex gap-2">
                  <Badge variant="secondary">{stats.total}</Badge>
                  <Badge variant="outline" className="text-green-600">
                    {stats.successful}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Average daily posts</span>
              <span className="font-medium">
                {timelineData.length > 0 
                  ? Math.round(data.totalPosts / timelineData.length) 
                  : 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Best performing platform</span>
              <span className="font-medium">
                {Object.entries(data.platformStats).reduce((best, [platform, stats]) => 
                  stats.successful > (data.platformStats[best]?.successful || 0) ? platform : best, 
                  'N/A'
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total brands</span>
              <span className="font-medium">{Object.keys(data.brandStats).length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
