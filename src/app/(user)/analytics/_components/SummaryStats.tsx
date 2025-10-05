'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PLATFORM_COLORS: Record<string, string> = {
  FACEBOOK: '#1877f2',
  INSTAGRAM: '#e4405f',
  TWITTER: '#1da1f2',
  LINKEDIN: '#0077b5',
  ALL: '#6b7280'
};

interface SummaryStatsProps {
  data: {
    platformStats: Record<string, { total: number; successful: number; failed: number }>;
    brandStats: Record<string, { total: number; successful: number }>;
    dailyStats: Record<string, { total: number; successful: number; failed: number }>;
    totalPosts: number;
  };
}

export function SummaryStats({ data }: SummaryStatsProps) {
  const averageDailyPosts = data.dailyStats && Object.keys(data.dailyStats).length > 0 
    ? Math.round(data.totalPosts / Object.keys(data.dailyStats).length) 
    : 0;

  const bestPerformingPlatform = Object.entries(data.platformStats).reduce((best, [platform, stats]) => 
    stats.successful > (data.platformStats[best]?.successful || 0) ? platform : best, 
    Object.keys(data.platformStats)[0] || 'N/A'
  );

  return (
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
            <span className="font-medium">{averageDailyPosts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Best performing platform</span>
            <span className="font-medium">{bestPerformingPlatform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total brands</span>
            <span className="font-medium">{Object.keys(data.brandStats).length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}