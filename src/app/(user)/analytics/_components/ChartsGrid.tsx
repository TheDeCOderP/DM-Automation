'use client';

import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartIcon, Target, Users, TrendingUp } from 'lucide-react';
import PieChart from '@/components/analytics/PieChart';
import DonutChart from '@/components/analytics/DonutChart';
import BarChart from '@/components/analytics/BarChart';
import LineChart from '@/components/analytics/LineChart';

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

interface ChartsGridProps {
  data: {
    platformStats: Record<string, { total: number; successful: number; failed: number }>;
    brandStats: Record<string, { total: number; successful: number }>;
    dailyStats: Record<string, { total: number; successful: number; failed: number }>;
    successfulPosts: number;
    failedPosts: number;
    scheduledPosts: number;
    draftedPosts: number;
    successRate: number;
  };
}

export function ChartsGrid({ data }: ChartsGridProps) {
  const pieChartRef = useRef<HTMLDivElement>(null);
  const donutChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const successBarChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);

  const [chartDimensions, setChartDimensions] = useState({
    pie: { width: 0, height: 0 },
    donut: { width: 0, height: 0 },
    bar: { width: 0, height: 0 },
    successBar: { width: 0, height: 0 },
    line: { width: 0, height: 0 },
  });

  useEffect(() => {
    const updateDimensions = () => {
      const pieWidth = pieChartRef.current?.offsetWidth || 0;
      const donutWidth = donutChartRef.current?.offsetWidth || 0;
      const barWidth = barChartRef.current?.offsetWidth || 0;
      const successBarWidth = successBarChartRef.current?.offsetWidth || 0;
      const lineWidth = lineChartRef.current?.offsetWidth || 0;

      setChartDimensions({
        pie: { width: pieWidth, height: Math.min(300, pieWidth * 0.75) },
        donut: { width: donutWidth, height: Math.min(300, donutWidth * 0.75) },
        bar: { width: barWidth, height: Math.min(300, barWidth * 0.75) },
        successBar: { width: successBarWidth, height: Math.min(300, successBarWidth * 0.75) },
        line: { width: lineWidth, height: Math.min(400, lineWidth * 0.5) },
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

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
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Posts by Platform
            </CardTitle>
          </CardHeader>
          <CardContent ref={pieChartRef}>
            <div className="flex justify-center">
              {platformChartData.length > 0 ? (
                <PieChart 
                  data={platformChartData} 
                  width={chartDimensions.pie.width} 
                  height={chartDimensions.pie.height}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No platform data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Post Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent ref={donutChartRef}>
            <div className="flex justify-center">
              {statusChartData.length > 0 ? (
                <DonutChart 
                  data={statusChartData} 
                  width={chartDimensions.donut.width} 
                  height={chartDimensions.donut.height}
                  centerText={`${data.successRate}%`}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No status data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Posts by Brand
            </CardTitle>
          </CardHeader>
          <CardContent ref={barChartRef}>
            <div className="flex justify-center">
              {brandChartData.length > 0 ? (
                <BarChart 
                  data={brandChartData} 
                  width={chartDimensions.bar.width} 
                  height={chartDimensions.bar.height}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No brand data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Successful Posts by Platform
            </CardTitle>
          </CardHeader>
          <CardContent ref={successBarChartRef}>
            <div className="flex justify-center">
              {platformSuccessData.length > 0 ? (
                <BarChart 
                  data={platformSuccessData} 
                  width={chartDimensions.successBar.width} 
                  height={chartDimensions.successBar.height}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No success data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Posts Timeline
            </CardTitle>
          </CardHeader>
          <CardContent ref={lineChartRef}>
            <div className="flex justify-center">
              <LineChart 
                data={timelineData} 
                width={chartDimensions.line.width} 
                height={chartDimensions.line.height}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}