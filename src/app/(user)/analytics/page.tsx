'use client';

import React, { useState, useEffect } from 'react';
import { AnalyticsHeader } from './_components/AnalyticsHeader';
import { MetricsCards } from './_components/MetricsCards';
import { ChartsGrid } from './_components/ChartsGrid';
import { SummaryStats } from './_components/SummaryStats';
import { LoadingState } from './_components/LoadingState';
import { ErrorState } from './_components/ErrorState';

interface AnalyticsData {
  totalPosts: number;
  successfulPosts: number;
  failedPosts: number;
  scheduledPosts: number;
  draftedPosts: number;
  platformStats: Record<string, { total: number; successful: number; failed: number }>;
  brandStats: Record<string, { total: number; successful: number }>;
  dailyStats: Record<string, { total: number; successful: number; failed: number }>;
  successRate: number;
  period: string;
  startDate: string;
  endDate: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('1m');

  const fetchAnalytics = async (period: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api?period=${period}`);
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
    return <LoadingState />;
  }

  if (!data) {
    return <ErrorState />;
  }

  return (
    <div className="space-y-6">
      <AnalyticsHeader 
        selectedPeriod={selectedPeriod} 
        onPeriodChange={handlePeriodChange} 
      />
      
      <MetricsCards data={data} />
      
      <ChartsGrid data={data} />
      
      <SummaryStats data={data} />
    </div>
  );
}