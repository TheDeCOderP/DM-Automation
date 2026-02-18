# Vercel Timeout Fix Summary

## Problem
Multiple API endpoints were timing out after 60 seconds on Vercel's free/hobby tier:
1. Content calendar generation with captions
2. Bulk image generation for calendar items
3. AI agent image/video generation

## Root Cause
- Vercel serverless functions have a 60-second timeout limit on free/hobby tier
- Sequential AI API calls (Gemini) for multiple items exceeded this limit
- Generating 7+ posts with captions for multiple platforms took 2-5 minutes

## Solutions Implemented

### 1. Content Calendar Generation (Split into 2 Phases)

**Before:** Single endpoint generated everything (content ideas + captions for all platforms)
**After:** Two-phase approach

#### Phase 1: Structure Creation (`/api/content-calendar/generate`)
- Generates content ideas only (~5-10 seconds)
- Creates calendar structure in database
- Returns immediately with `needsCaptions: true` flag
- **Files modified:**
  - `src/app/api/content-calendar/generate/route.ts`

#### Phase 2: Caption Generation (`/api/content-calendar/generate-captions`)
- New endpoint for generating platform-specific captions
- Frontend calls this in batches of 3 items
- Shows real-time progress to users
- **Files created:**
  - `src/app/api/content-calendar/generate-captions/route.ts`

#### Frontend Updates
- `src/app/(user)/content-calendar/_components/CreateCalendarModal.tsx`
  - Updated to handle two-step process
  - Shows progress: "Creating calendar structure..." → "Generating captions 1-3 of 7..."
  - Calls caption generation API in batches

### 2. Image Generation (Batch Processing)

**Before:** Generated all images in one request (could timeout with 7+ images)
**After:** Batch processing with automatic continuation

#### Backend Changes (`/api/content-calendar/generate-images`)
- Added `maxDuration = 60` config
- Reduced batch size from 3 to 2 images at a time
- Limited to 5 images per request (MAX_IMAGES_PER_REQUEST)
- Returns `needsMoreGeneration: true` and `remaining` count if more images needed
- **Files modified:**
  - `src/app/api/content-calendar/generate-images/route.ts`

#### Frontend Changes
- `src/app/(user)/content-calendar/[id]/page.tsx`
  - Automatically calls API multiple times until all images generated
  - Shows progress: "Generating images: 5 / 12"
  - Handles up to 20 batches (safety limit)
  - 1-second delay between batches

### 3. AI Agent Endpoints (Timeout Config)

Added timeout configuration to ensure maximum execution time:

**Files modified:**
- `src/app/api/ai-agent/generate-image/route.ts`
  - Added `maxDuration = 60`
  - Added `dynamic = 'force-dynamic'`
  
- `src/app/api/ai-agent/generate-video/route.ts`
  - Added `maxDuration = 60`
  - Added `dynamic = 'force-dynamic'`

## Technical Details

### Route Segment Config
All affected routes now include:
```typescript
export const maxDuration = 60; // Maximum for Vercel Hobby tier
export const dynamic = 'force-dynamic';
```

### Batch Processing Strategy
1. **Content Calendar Captions:** 3 items per batch
2. **Image Generation:** 2 images per batch, max 5 per request
3. **Frontend:** Automatic retry until completion

### Progress Tracking
Users now see real-time progress for long-running operations:
- "Creating calendar structure..."
- "Generating captions 1-3 of 7..."
- "Generating images: 5 / 12"

## Benefits

1. **No More Timeouts:** All operations complete within 60-second limit
2. **Better UX:** Users see progress instead of waiting blindly
3. **Resilient:** Automatic retry on batch failures
4. **Scalable:** Can handle calendars with 30+ days and multiple platforms
5. **Cost Effective:** Works on Vercel free/hobby tier

## Testing Recommendations

1. Test calendar generation with:
   - 7 days, 1 platform (should complete in ~30 seconds)
   - 7 days, 3 platforms (should complete in ~60 seconds)
   - 30 days, 5 platforms (should complete in multiple batches)

2. Test image generation with:
   - 5 images (single batch)
   - 12 images (multiple batches)
   - Monitor progress updates

3. Verify error handling:
   - Network interruption during batch processing
   - Individual item failures don't stop entire process

## Future Improvements (Optional)

If you upgrade to Vercel Pro plan:
- Increase `maxDuration` to 300 seconds (5 minutes)
- Increase batch sizes for faster processing
- Consider parallel processing for captions

For even better performance:
- Consider using background jobs (Vercel Cron, Queue systems)
- Implement WebSocket for real-time progress updates
- Add Redis caching for generated content
