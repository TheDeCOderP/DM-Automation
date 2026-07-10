import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

async function getAutomationAndVerify(id: string, userId: string) {
  const automation = await prisma.blogAutomation.findUnique({
    where: { id },
    include: {
      brand: { include: { members: true } },
      dbConnection: { select: { id: true, name: true, dbType: true, host: true } },
      calendar: { select: { id: true, title: true } },
    },
  });
  if (!automation) return null;
  const isMember = automation.brand.members.some(m => m.userId === userId);
  return isMember ? automation : null;
}

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

async function registerBlogCronJob(title: string, scheduledAt: Date): Promise<string | null> {
  const apiKey = process.env.CRON_JOB_API_KEY;
  if (!apiKey) return null;

  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/cron-jobs/publish-blogs`;
  const schedule = buildBlogCronSchedule(scheduledAt);

  try {
    const res = await fetch('https://api.cron-job.org/jobs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
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
      }),
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const automation = await getAutomationAndVerify(id, token.id);
  if (!automation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ automation });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await getAutomationAndVerify(id, token.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const {
    title, slug, content, excerpt, tags,
    seoTitle, seoDescription, seoKeywords, canonicalUrl,
    bannerUrl, bannerPrompt,
    dbConnectionId, scheduledAt, status,
    articleSection, faqs, selectedCategories, selectedIndustries,
  } = body;

  const newScheduledDate = scheduledAt !== undefined
    ? (scheduledAt ? new Date(scheduledAt) : null)
    : undefined;

  const isBeingScheduled = newScheduledDate instanceof Date && status === 'SCHEDULED';

  // Delete old cron job if rescheduling
  if (isBeingScheduled && existing.cronJobId) {
    await deleteBlogCronJob(existing.cronJobId);
  }

  // Determine new cronJobId
  let newCronJobId: string | null | undefined = undefined;
  if (isBeingScheduled) {
    const titleForCron = (title ?? existing.title) as string;
    newCronJobId = await registerBlogCronJob(titleForCron, newScheduledDate as Date);
  } else if (status && status !== 'SCHEDULED' && existing.cronJobId) {
    // Being un-scheduled / published / failed — remove cron job
    await deleteBlogCronJob(existing.cronJobId);
    newCronJobId = null;
  }

  const updated = await prisma.blogAutomation.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(content !== undefined && { content }),
      ...(excerpt !== undefined && { excerpt }),
      ...(tags !== undefined && { tags }),
      ...(seoTitle !== undefined && { seoTitle }),
      ...(seoDescription !== undefined && { seoDescription }),
      ...(seoKeywords !== undefined && { seoKeywords }),
      ...(canonicalUrl !== undefined && { canonicalUrl }),
      ...(bannerUrl !== undefined && { bannerUrl }),
      ...(bannerPrompt !== undefined && { bannerPrompt }),
      ...(dbConnectionId !== undefined && { dbConnectionId: dbConnectionId || null }),
      ...(newScheduledDate !== undefined && { scheduledAt: newScheduledDate }),
      ...(status !== undefined && { status }),
      ...(articleSection !== undefined && { articleSection: articleSection || null }),
      ...(faqs !== undefined && { faqs: faqs || null }),
      ...(selectedCategories !== undefined && { selectedCategories: selectedCategories || [] }),
      ...(selectedIndustries !== undefined && { selectedIndustries: selectedIndustries || [] }),
      ...(newCronJobId !== undefined && { cronJobId: newCronJobId }),
    },
  });

  return NextResponse.json({ automation: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await getAutomationAndVerify(id, token.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Clean up cron job if exists
  if (existing.cronJobId) {
    await deleteBlogCronJob(existing.cronJobId);
  }

  await prisma.blogAutomation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
