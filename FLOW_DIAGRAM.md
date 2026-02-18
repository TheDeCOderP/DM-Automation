# Content Calendar Generation Flow

## Before (Timing Out)

```
User clicks "Generate Calendar"
         ↓
    Single API Call
         ↓
┌────────────────────────┐
│ Generate content ideas │ (10s)
├────────────────────────┤
│ Generate captions for  │
│ Platform 1 (Day 1-7)   │ (30s)
├────────────────────────┤
│ Generate captions for  │
│ Platform 2 (Day 1-7)   │ (30s)
├────────────────────────┤
│ Generate captions for  │
│ Platform 3 (Day 1-7)   │ (30s)
└────────────────────────┘
         ↓
    ⚠️ TIMEOUT (100s > 60s limit)
```

## After (Fixed)

```
User clicks "Generate Calendar"
         ↓
┌─────────────────────────────────────────┐
│ Phase 1: Structure Creation (10s)       │
│ - Generate content ideas                │
│ - Create calendar in DB                 │
│ - Return calendar ID                    │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Phase 2: Caption Generation (Batches)   │
│                                         │
│ Batch 1 (Items 1-3)  → 15s ✓           │
│ Batch 2 (Items 4-6)  → 15s ✓           │
│ Batch 3 (Item 7)     → 5s  ✓           │
│                                         │
│ Total: ~45s (under 60s limit per call) │
└─────────────────────────────────────────┘
         ↓
    ✅ SUCCESS
```

## Image Generation Flow

### Before (Timing Out)

```
User clicks "Generate All Images"
         ↓
    Single API Call
         ↓
┌────────────────────────┐
│ Generate Image 1       │ (8s)
├────────────────────────┤
│ Generate Image 2       │ (8s)
├────────────────────────┤
│ Generate Image 3       │ (8s)
├────────────────────────┤
│ Generate Image 4       │ (8s)
├────────────────────────┤
│ Generate Image 5       │ (8s)
├────────────────────────┤
│ Generate Image 6       │ (8s)
├────────────────────────┤
│ Generate Image 7       │ (8s)
├────────────────────────┤
│ Generate Image 8       │ (8s)
└────────────────────────┘
         ↓
    ⚠️ TIMEOUT (64s > 60s limit)
```

### After (Fixed)

```
User clicks "Generate All Images"
         ↓
┌─────────────────────────────────────────┐
│ Request 1: Generate 5 images (40s)      │
│ - Image 1 ✓                             │
│ - Image 2 ✓                             │
│ - Image 3 ✓                             │
│ - Image 4 ✓                             │
│ - Image 5 ✓                             │
│ Returns: needsMoreGeneration=true       │
└─────────────────────────────────────────┘
         ↓ (1s delay)
┌─────────────────────────────────────────┐
│ Request 2: Generate 3 images (24s)      │
│ - Image 6 ✓                             │
│ - Image 7 ✓                             │
│ - Image 8 ✓                             │
│ Returns: needsMoreGeneration=false      │
└─────────────────────────────────────────┘
         ↓
    ✅ SUCCESS (All 8 images generated)
```

## Key Improvements

1. **Batch Processing:** Split large operations into smaller chunks
2. **Progress Tracking:** Real-time updates for users
3. **Automatic Retry:** Frontend handles multiple API calls
4. **Safety Limits:** Maximum batch sizes and attempt counts
5. **Graceful Degradation:** Individual failures don't stop entire process

## Timing Breakdown

### Content Calendar (7 days, 3 platforms)
- **Before:** 100s (TIMEOUT ❌)
- **After:** 10s + 45s = 55s (SUCCESS ✅)

### Image Generation (12 images)
- **Before:** 96s (TIMEOUT ❌)
- **After:** 40s + 40s + 16s = 96s across 3 requests (SUCCESS ✅)

### AI Agent Operations
- **Before:** No timeout config (could timeout)
- **After:** maxDuration=60 configured (SUCCESS ✅)
