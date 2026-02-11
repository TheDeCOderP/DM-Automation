# Image Upload Infrastructure & Storage

## Overview
This document explains where AI-generated and manually uploaded images are stored, how they're saved to the database, and the complete flow from generation to storage.

---

## Upload Services

### Primary: Cloudinary
**Location:** `src/lib/cloudinary.ts`

**Configuration:**
```typescript
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})
```

**Upload Function:**
```typescript
uploadImage(file: File, folder: string = 'profile_pics'): Promise<string>
```

**Folders Used:**
- `blog_banners/` - Blog banner images
- `blog_featured/` - Blog featured images  
- `ai-generated-images/` - AI-generated images (from Gemini)
- `profile_pics/` - User profile pictures
- `prompt-directory/` - General uploads

### Fallback: ImageKit
**Location:** `src/lib/imagekit.ts`

**Configuration:**
```typescript
imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
})
```

**Strategy:** ImageKit is tried first, with Cloudinary as fallback

---

## AI Image Generation Flow

### 1. Image Generation
**API:** `src/app/api/ai-agent/generate-image/route.ts`

**Process:**
1. User provides prompt (and optional reference image)
2. Reference image dimensions are extracted (if provided)
3. Aspect ratio is calculated automatically
4. Gemini AI generates image based on prompt and aspect ratio
5. Generated image (base64) is uploaded to Cloudinary
6. Cloudinary URL is returned

**Cloudinary Upload:**
```typescript
const uploadResult = await cloudinary.uploader.upload(base64Data, {
  folder: "ai-generated-images",
  quality: "auto",
  fetch_format: "auto",
  transformation: [
    { quality: "auto:best" },
    { fetch_format: "auto" }
  ]
});
```

### 2. File Conversion
**Component:** `AIGenerator.tsx`

Generated base64 image is converted to File object:
```typescript
const blob = new Blob([byteArray], { type: "image/jpeg" });
const file = new File([blob], `ai-generated-${Date.now()}.jpg`, {
  type: "image/jpeg",
});
```

---

## Social Posts Storage

### Database Schema
```prisma
model Media {
  id        String    @id @default(cuid())
  url       String                    // Cloudinary URL
  type      MediaType                 // IMAGE, VIDEO, CAROUSEL
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  postId    String
  post      Post      @relation(fields: [postId], references: [id])
  brandId   String 
  brand     Brand     @relation(fields: [brandId], references: [id])
  userId    String
  user      User      @relation(fields: [userId], references: [id])
}
```

### Storage Flow
1. **AI Generation** → File object created
2. **Post Creation** → Files uploaded to Cloudinary
3. **Database Save** → URLs saved to `Media` table

**API:** `src/app/api/posts/route.ts`
```typescript
// Upload to Cloudinary
const uploadResult = await cloudinary.uploader.upload_stream({
  resource_type: "auto",
});

// Save to database
await prisma.media.create({
  data: {
    postId: post.id,
    userId: token.id,
    brandId: brandId,
    url: uploadResult.secure_url,
    type: uploadResult.resource_type.toUpperCase(),
  },
});
```

---

## Blog Posts Storage

### Database Schema
```prisma
model Blog {
  id               String   @id @default(cuid())
  banner           String?   // Banner image URL (Cloudinary)
  image            String?   // Featured image URL (Cloudinary)
  imageAlt         String?   // Alt text for accessibility
  title            String
  content          String    @db.LongText
  tags             Json?
  authorId         String
  author           User      @relation(fields: [authorId], references: [id])
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

### Storage Flow
1. **AI Generation** → File object created via `AIGenerator`
2. **Blog Creation** → Files uploaded to Cloudinary
3. **Database Save** → URLs saved to `Blog` table

**API:** `src/app/api/blogs/route.ts`
```typescript
// Upload banner to Cloudinary
if (bannerFile && bannerFile.size > 0) {
  bannerUrl = await uploadImage(bannerFile, 'blog_banners');
}

// Upload featured image to Cloudinary
if (featuredFile && featuredFile.size > 0) {
  featuredUrl = await uploadImage(featuredFile, 'blog_featured');
}

// Save to database
await prisma.blog.create({
  data: {
    banner: bannerUrl,
    image: featuredUrl,
    // ... other fields
  },
});
```

---

## Complete Data Flow

### For Social Posts
```
User Action → AI Generator Component
              ↓
         Generate Image (Gemini API)
              ↓
         Upload to Cloudinary (ai-generated-images/)
              ↓
         Convert to File Object
              ↓
         Add to Post Media
              ↓
         Upload to Cloudinary (auto folder)
              ↓
         Save URL to Media Table
              ↓
         Link to Post, Brand, User
```

### For Blogs
```
User Action → AI Generator Component
              ↓
         Generate Image (Gemini API)
              ↓
         Upload to Cloudinary (ai-generated-images/)
              ↓
         Convert to File Object
              ↓
         Set as Banner/Featured Image
              ↓
         Upload to Cloudinary (blog_banners/ or blog_featured/)
              ↓
         Save URL to Blog Table
              ↓
         Link to Author (User)
```

---

## Storage Locations Summary

### Cloudinary Folders
| Folder | Purpose | Used By |
|--------|---------|---------|
| `ai-generated-images/` | AI-generated images (initial upload) | Gemini API |
| `blog_banners/` | Blog banner images | Blog creation |
| `blog_featured/` | Blog featured images | Blog creation |
| `profile_pics/` | User profile pictures | User settings |
| `prompt-directory/` | General uploads | Various |
| `auto/` | Social post media | Post creation |

### Database Tables
| Table | Fields | Purpose |
|-------|--------|---------|
| `Media` | url, type, postId, brandId, userId | Social post media |
| `Blog` | banner, image, imageAlt | Blog images |

---

## Environment Variables Required

```env
# Cloudinary (Primary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ImageKit (Fallback)
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=your_url_endpoint

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
```

---

## Key Features

### ✅ AI Image Generation
- Integrated in both social posts and blogs
- Reference image support for size matching
- Automatic aspect ratio detection
- Cloudinary upload with optimization

### ✅ Database Storage
- All images stored with URLs
- Proper relations (user, brand, post/blog)
- Metadata tracking (type, timestamps)
- Accessibility support (alt text)

### ✅ Upload Infrastructure
- Primary: Cloudinary (reliable, CDN)
- Fallback: ImageKit (redundancy)
- Automatic format optimization
- Quality management

---

## Recent Updates

### Blog AI Image Generation (Latest)
- ✅ Added `AIGenerator` component to blog creation
- ✅ Support for both banner and featured images
- ✅ Reference image feature available
- ✅ Proper Cloudinary folder organization
- ✅ Database storage with URLs
- ✅ Form data properly mapped

### Components Updated
- `src/app/(user)/blogs/create/page.tsx` - Added AI generation buttons
- `src/app/api/blogs/route.ts` - Added featured image upload
- Both banner and featured images now support AI generation

---

## Usage Examples

### Generate AI Image for Blog Banner
```typescript
<AIGenerator onFileSelect={(file) => {
  setBannerImage(file);
  setBannerPreview(URL.createObjectURL(file));
}} />
```

### Generate AI Image for Blog Featured
```typescript
<AIGenerator onFileSelect={(file) => {
  setFeaturedImage(file);
  setFeaturedPreview(URL.createObjectURL(file));
}} />
```

### Upload to Cloudinary
```typescript
const url = await uploadImage(file, 'blog_banners');
// Returns: https://res.cloudinary.com/.../blog_banners/image.jpg
```

---

## Benefits

1. **Centralized Storage**: All images in Cloudinary with CDN
2. **Database Tracking**: Full audit trail of all uploads
3. **AI Integration**: Seamless AI generation with storage
4. **Optimization**: Automatic format and quality optimization
5. **Redundancy**: Fallback to ImageKit if needed
6. **Organization**: Proper folder structure for different use cases
7. **Relations**: Proper linking to users, brands, posts, blogs
