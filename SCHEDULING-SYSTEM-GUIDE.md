# Scheduling System Guide

## Overview

Your application has two levels of scheduling:

1. **ContentCalendarItem** - Planning/draft level (shown in UI)
2. **Post** - Actual scheduled posts (what gets published by cron jobs)

## How It Works

### Normal Flow

1. User creates a content calendar with items (status: DRAFT)
2. User edits calendar items (status: EDITED)
3. User clicks "Schedule" → Creates Post records (status: SCHEDULED)
4. Cron job runs every 5 minutes → Publishes posts (status: PUBLISHED)
5. Calendar item status updates to PUBLISHED

### The Problem You Had

- Calendar item was marked as SCHEDULED
- But NO Post records were created
- Cron job only looks for Post records
- Result: Nothing got published even though UI showed "Scheduled"

## Monitoring & Fixing

### Check System Status

```bash
# Monitor all scheduled posts and calendar items
node scripts/monitor-scheduled-posts.js
```

This shows:
- Overdue posts (should have been published)
- Upcoming posts
- Calendar item status counts
- Broken calendar items (scheduled but no posts)

### Fix Broken Calendar Items

```bash
# Reset calendar items that are marked SCHEDULED but have no posts
node scripts/reset-empty-scheduled-items.js
```

This will:
- Find calendar items with status SCHEDULED but 0 posts
- Reset them to EDITED status
- Delete empty post groups
- Allow you to reschedule them properly

### Publish Overdue Posts

```bash
# Manually publish posts that should have been published
node scripts/test-publish-overdue.js
```

Or call the API directly:
```bash
POST /api/posts/publish-overdue
Authorization: Bearer <CRON_SECRET_TOKEN>
```

## Cron Job Configuration

### Main Cron Job
- **URL**: `https://dma.prabisha.com/api/cron-jobs/publish-post`
- **Method**: POST
- **Schedule**: Every 5 minutes (or as configured)
- **Header**: `Authorization: Bearer gdfgvdfgfdbfdhgfbbfghfbfhfgbhffhffbdfgdfdffg`

### Backup Cron Job (Recommended)
Set up a second cron job to catch overdue posts:
- **URL**: `https://dma.prabisha.com/api/posts/publish-overdue`
- **Method**: POST
- **Schedule**: Every 15 minutes
- **Header**: `Authorization: Bearer gdfgvdfgfdbfdhgfbbfghfbfhfgbhffhffbdfgdfdffg`

## Improvements Made

### 1. Better Validation in schedule-item API
- Checks that at least one platform has content before scheduling
- Validates that posts were actually created
- Rolls back if no posts are created
- Updates calendar item status AFTER posts are created (not before)

### 2. Overdue Post Publishing
- New endpoint: `/api/posts/publish-overdue`
- Publishes any posts that are past their scheduled time
- Can be called manually or via cron job
- Catches posts that were missed by the main cron job

### 3. Enhanced Cron Job
- Now processes posts in order (oldest first)
- Logs when posts are overdue
- Returns early if no posts to publish

### 4. Monitoring Scripts
- `monitor-scheduled-posts.js` - Check system status
- `check-past-scheduled-posts.js` - Find overdue posts
- `reset-empty-scheduled-items.js` - Fix broken calendar items
- `test-publish-overdue.js` - Manually trigger overdue publishing

## Common Issues & Solutions

### Issue: Calendar shows "Scheduled" but nothing publishes

**Cause**: Calendar item is marked SCHEDULED but no Post records exist

**Solution**:
```bash
node scripts/monitor-scheduled-posts.js
node scripts/reset-empty-scheduled-items.js
```
Then reschedule the item in the UI.

### Issue: Post is scheduled but time has passed

**Cause**: Cron job didn't run or failed

**Solution**:
```bash
node scripts/test-publish-overdue.js
```

### Issue: Cron job returns 401 Unauthorized

**Cause**: Wrong or missing CRON_SECRET_TOKEN

**Solution**: 
- Check `.env` file has `CRON_SECRET_TOKEN`
- Update cron job header: `Authorization: Bearer <token>`

### Issue: Posts created but not linked to calendar item

**Cause**: Missing platformMetadata.calendarItemId

**Solution**: This is now handled automatically in the schedule-item API

## Best Practices

1. **Always check monitoring before troubleshooting**
   ```bash
   node scripts/monitor-scheduled-posts.js
   ```

2. **Set up both cron jobs** (main + backup)
   - Main: Every 5 minutes
   - Backup: Every 15 minutes (publish-overdue)

3. **Run monitoring daily** to catch issues early

4. **Check logs** in cron-job.org dashboard for failures

5. **Test scheduling** with a post 5 minutes in the future before scheduling many posts

## API Endpoints

### POST /api/cron-jobs/publish-post
Publishes posts scheduled for now or earlier (up to 50 posts)

### POST /api/posts/publish-overdue
Publishes overdue posts (backup/manual trigger)

### POST /api/content-calendar/schedule-item
Schedules a calendar item (creates Post records)

## Environment Variables

```env
CRON_SECRET_TOKEN=gdfgvdfgfdbfdhgfbbfghfbfhfgbhffhffbdfgdfdffg
NEXTAUTH_URL=https://dma.prabisha.com
```

## Troubleshooting Checklist

- [ ] Check if Post records exist: `node scripts/monitor-scheduled-posts.js`
- [ ] Check if calendar items are broken: Look for "scheduled calendar items with no posts"
- [ ] Check cron job is running: Look at cron-job.org dashboard
- [ ] Check cron job authentication: Verify Bearer token matches CRON_SECRET_TOKEN
- [ ] Check for overdue posts: `node scripts/check-past-scheduled-posts.js`
- [ ] Manually trigger publishing: `node scripts/test-publish-overdue.js`
- [ ] Check application logs for errors
- [ ] Verify social account tokens are valid

## Support

If issues persist:
1. Run all monitoring scripts
2. Check cron-job.org execution history
3. Check application logs
4. Verify database state with Prisma Studio: `npx prisma studio`
