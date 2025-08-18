import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';

interface PlatformStats {
  total: number;
  successful: number;
  failed: number;
  scheduled: number;
  drafted: number;
}

interface BrandStats {
  total: number;
  successful: number;
  failed: number;
  scheduled: number;
  drafted: number;
}

interface DailyStats {
  total: number;
  successful: number;
  failed: number;
  scheduled: number;
  drafted: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1w';
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '1w':
        startDate = subWeeks(now, 1);
        break;
      case '2w':
        startDate = subWeeks(now, 2);
        break;
      case '1m':
        startDate = subMonths(now, 1);
        break;
      case '2m':
        startDate = subMonths(now, 2);
        break;
      case '3m':
        startDate = subMonths(now, 3);
        break;
      case '6m':
        startDate = subMonths(now, 6);
        break;
      case '1y':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subWeeks(now, 1);
    }

    // Get user's brands
    const userBrands = await prisma.userBrand.findMany({
      where: { userId: session.user.id },
      include: { brand: true }
    });

    const brandIds = userBrands.map(ub => ub.brandId);

    // Get posts analytics
    const posts = await prisma.post.findMany({
      where: {
        userId: session.user.id,
        brandId: { in: brandIds },
        createdAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(now)
        }
      },
      include: {
        brand: true,
        pageToken: {
          include: {
            socialAccount: true
          }
        }
      }
    });

    // Process data for analytics
    const analytics = {
      totalPosts: posts.length,
      successfulPosts: posts.filter(p => p.status === 'PUBLISHED').length,
      failedPosts: posts.filter(p => p.status === 'FAILED').length,
      scheduledPosts: posts.filter(p => p.status === 'SCHEDULED').length,
      draftedPosts: posts.filter(p => p.status === 'DRAFTED').length,
      
      // Posts by platform
      platformStats: posts.reduce<Record<string, PlatformStats>>((acc, post) => {
        const platform = post.platform;
        if (!acc[platform]) {
          acc[platform] = { total: 0, successful: 0, failed: 0, scheduled: 0, drafted: 0 };
        }
        acc[platform].total++;
        if (post.status === 'PUBLISHED') acc[platform].successful++;
        if (post.status === 'FAILED') acc[platform].failed++;
        if (post.status === 'SCHEDULED') acc[platform].scheduled++;
        if (post.status === 'DRAFTED') acc[platform].drafted++;
        return acc;
      }, {}),
      
      // Posts by brand
      brandStats: posts.reduce<Record<string, BrandStats>>((acc, post) => {
        const brandName = post.brand.name;
        if (!acc[brandName]) {
          acc[brandName] = { total: 0, successful: 0, failed: 0, scheduled: 0, drafted: 0 };
        }
        acc[brandName].total++;
        if (post.status === 'PUBLISHED') acc[brandName].successful++;
        if (post.status === 'FAILED') acc[brandName].failed++;
        if (post.status === 'SCHEDULED') acc[brandName].scheduled++;
        if (post.status === 'DRAFTED') acc[brandName].drafted++;
        return acc;
      }, {}),
      
      // Daily posts timeline
      dailyStats: posts.reduce<Record<string, DailyStats>>((acc, post) => {
        const date = post.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { total: 0, successful: 0, failed: 0, scheduled: 0, drafted: 0 };
        }
        acc[date].total++;
        if (post.status === 'PUBLISHED') acc[date].successful++;
        if (post.status === 'FAILED') acc[date].failed++;
        if (post.status === 'SCHEDULED') acc[date].scheduled++;
        if (post.status === 'DRAFTED') acc[date].drafted++;
        return acc;
      }, {}),
      
      // Success rate
      successRate: posts.length > 0 ? 
        Math.round((posts.filter(p => p.status === 'PUBLISHED').length / posts.length) * 100) : 0,
      
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}