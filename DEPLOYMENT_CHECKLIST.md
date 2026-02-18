# Deployment Checklist - Timeout Fixes

## Pre-Deployment Verification

### 1. Code Changes Review
- [ ] All modified files have been reviewed
- [ ] No syntax errors (run `npm run build` or `pnpm build`)
- [ ] TypeScript types are correct
- [ ] No console errors in development

### 2. Files Modified (7 files)

#### API Routes (5 files)
- [ ] `src/app/api/content-calendar/generate/route.ts` - Simplified to structure only
- [ ] `src/app/api/content-calendar/generate-captions/route.ts` - NEW FILE for captions
- [ ] `src/app/api/content-calendar/generate-images/route.ts` - Batch processing
- [ ] `src/app/api/ai-agent/generate-image/route.ts` - Timeout config
- [ ] `src/app/api/ai-agent/generate-video/route.ts` - Timeout config

#### Frontend Components (2 files)
- [ ] `src/app/(user)/content-calendar/_components/CreateCalendarModal.tsx` - Two-phase generation
- [ ] `src/app/(user)/content-calendar/[id]/page.tsx` - Batch image generation

### 3. Environment Variables
Verify these are set in Vercel:
- [ ] `NEXTAUTH_URL` - For reference image loading
- [ ] `GEMINI_API_KEY` - For AI generation
- [ ] Database connection string
- [ ] Upload/CDN credentials

### 4. Database Schema
- [ ] No schema changes required ✅
- [ ] Existing tables work with new code ✅

## Testing Before Deployment

### Local Testing
```bash
# 1. Install dependencies
pnpm install

# 2. Build the project
pnpm build

# 3. Run locally
pnpm dev
```

### Test Scenarios

#### Test 1: Small Calendar (Should be fast)
- [ ] Create 7-day calendar with 1 platform
- [ ] Verify completes in ~20-30 seconds
- [ ] Check all captions are generated
- [ ] Verify progress updates show correctly

#### Test 2: Medium Calendar (Multiple batches)
- [ ] Create 7-day calendar with 3 platforms
- [ ] Verify completes in ~45-60 seconds
- [ ] Check progress shows batch updates
- [ ] Verify all items have captions

#### Test 3: Image Generation (Batch processing)
- [ ] Generate images for 5 items (single batch)
- [ ] Verify completes successfully
- [ ] Generate images for 10+ items (multiple batches)
- [ ] Verify progress updates correctly
- [ ] Check all images are uploaded

#### Test 4: Error Handling
- [ ] Test with invalid brand ID (should show error)
- [ ] Test with missing required fields (should validate)
- [ ] Interrupt generation (should handle gracefully)

## Deployment Steps

### 1. Commit Changes
```bash
git add .
git commit -m "Fix: Resolve Vercel timeout issues with batch processing

- Split calendar generation into structure + captions phases
- Implement batch processing for image generation
- Add maxDuration config to all AI endpoints
- Update frontend to handle multi-step generation with progress tracking"
git push origin main
```

### 2. Vercel Deployment
- [ ] Push to main branch (auto-deploys if connected)
- [ ] Or manually deploy via Vercel dashboard
- [ ] Wait for build to complete

### 3. Post-Deployment Verification

#### Immediate Checks (5 minutes)
- [ ] Visit production URL
- [ ] Test calendar generation with 7 days, 1 platform
- [ ] Verify no console errors
- [ ] Check API response times in Network tab

#### Full Testing (15 minutes)
- [ ] Test calendar generation with multiple platforms
- [ ] Test image generation with 5+ items
- [ ] Verify progress updates work correctly
- [ ] Check database for created records
- [ ] Test on mobile device

### 4. Monitor for Issues

#### First Hour
- [ ] Check Vercel logs for errors
- [ ] Monitor function execution times
- [ ] Watch for timeout errors
- [ ] Check user feedback/reports

#### First Day
- [ ] Review error logs
- [ ] Check success rate of generations
- [ ] Monitor API response times
- [ ] Verify no database issues

## Rollback Plan (If Needed)

If issues occur after deployment:

### Quick Rollback
1. Go to Vercel Dashboard
2. Navigate to Deployments
3. Find previous working deployment
4. Click "Promote to Production"

### Manual Rollback
```bash
git revert HEAD
git push origin main
```

## Success Criteria

✅ Calendar generation completes without timeout
✅ Image generation handles 10+ images successfully
✅ Progress updates show correctly to users
✅ No increase in error rates
✅ User experience is improved (can see progress)

## Known Limitations

1. **Vercel Hobby Tier:** 60-second limit per function call
2. **Batch Sizes:** Optimized for speed vs. timeout balance
3. **Large Calendars:** 30+ days may take 2-3 minutes total (multiple batches)
4. **Rate Limits:** Gemini API rate limits may affect very large batches

## Support & Monitoring

### Vercel Dashboard
- Monitor function execution times
- Check error logs
- Review function invocations

### Key Metrics to Watch
- Average calendar generation time
- Image generation success rate
- API timeout errors (should be 0)
- User completion rate

### If Issues Persist

1. Check Vercel function logs
2. Verify environment variables
3. Test API endpoints directly (Postman/curl)
4. Check Gemini API quota/limits
5. Review database connection pool

## Additional Notes

- All changes are backward compatible
- No database migrations required
- Frontend gracefully handles old and new API responses
- Can be deployed during business hours (low risk)

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Verified By:** _____________
**Status:** [ ] Success [ ] Issues [ ] Rolled Back
