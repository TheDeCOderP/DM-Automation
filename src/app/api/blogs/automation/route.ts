import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

function buildBlogCronSchedule(scheduledAt: Date) {
  const utc = new Date(scheduledAt);
  return {
    timezone: 'UTC',
    expiresAt: Math.floor(utc.getTime() / 1000) + 3600,
    minutes: [utc.getUTCMinutes()],
    hours: [utc.getUTCHours()],
    mdays: [utc.getUTCDate()],
    months: [utc.getUTCMonth() + 1],
    wdays: [-1],
  };
}

async function registerBlogCronJob(automationId: string, title: string, scheduledAt: Date): Promise<string | null> {
  const apiKey = process.env.CRON_JOB_API_KEY;
  if (!apiKey) return null;

  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/cron-jobs/publish-blogs`;
  const schedule = buildBlogCronSchedule(scheduledAt);

  const scheduleData = {
    job: {
      title: `Blog - ${title.slice(0, 60)}`,
      url: callbackUrl,
      enabled: true,
      saveResponses: true,
      schedule,
      requestMethod: 1,
      requestTimeout: 30,
      extendedData: {
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    },
  };

  try {
    const res = await fetch('https://api.cron-job.org/jobs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(scheduleData),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.jobId?.toString() ?? null;
  } catch {
    return null;
  }
}

async function deleteBlogCronJob(cronJobId: string) {
  const apiKey = process.env.CRON_JOB_API_KEY;
  if (!apiKey || !cronJobId) return;
  try {
    await fetch(`https://api.cron-job.org/jobs/${cronJobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch { /* best-effort */ }
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get('brandId');
  const status = searchParams.get('status');
  const calendarId = searchParams.get('calendarId');

  if (!brandId) return NextResponse.json({ error: 'brandId required' }, { status: 400 });

  const userBrand = await prisma.userBrand.findFirst({ where: { userId: token.id, brandId } });
  if (!userBrand) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const automations = await prisma.blogAutomation.findMany({
    where: {
      brandId,
      ...(status && { status: status as any }),
      ...(calendarId && { calendarId }),
    },
    include: {
      dbConnection: { select: { id: true, name: true, dbType: true } },
      calendar: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ automations });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    brandId, title, slug, content, excerpt, tags,
    seoTitle, seoDescription, seoKeywords, canonicalUrl,
    bannerUrl, bannerPrompt,
    dbConnectionId, scheduledAt,
  } = body;

  if (!brandId || !title || !content) {
    return NextResponse.json({ error: 'brandId, title, and content are required' }, { status: 400 });
  }

  const userBrand = await prisma.userBrand.findFirst({ where: { userId: token.id, brandId } });
  if (!userBrand) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;

  const automation = await prisma.blogAutomation.create({
    data: {
      brandId, title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
      content, excerpt,
      tags: tags || [],
      seoTitle, seoDescription, seoKeywords, canonicalUrl,
      bannerUrl, bannerPrompt,
      dbConnectionId: dbConnectionId || null,
      scheduledAt: scheduledDate,
      status: scheduledDate ? 'SCHEDULED' : 'DRAFT',
    },
  });

  if (scheduledDate) {
    const cronJobId = await registerBlogCronJob(automation.id, title, scheduledDate);
    if (cronJobId) {
      await prisma.blogAutomation.update({ where: { id: automation.id }, data: { cronJobId } });
      (automation as any).cronJobId = cronJobId;
    }
  }

  return NextResponse.json({ automation }, { status: 201 });
}

export { deleteBlogCronJob };
