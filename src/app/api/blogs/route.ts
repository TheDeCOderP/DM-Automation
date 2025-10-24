import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

// Type definitions
interface BlogData {
  title: string;
  slug: string;
  content: string;
  banner: string;
  tags: string[];
  authorId: string;
}

interface ExternalSite {
  id: string;
  name: string;
  platform: 'WORDPRESS' | 'HASHNODE' | 'DEV_TO' | 'CUSTOM_API';
  authType: 'API_KEY' | 'BASIC_AUTH' | 'OAUTH2';
  baseUrl: string;
  apiEndpoint: string;
  apiKey?: string;
  username?: string;
  config?: Record<string, unknown>;
  brand?: {
    id: string;
  };
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  slug: string;
  banner: string;
  tags: string[];
  authorId: string;
  author?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ExternalPublishingResult {
  siteId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

interface WordPressResponse {
  id: number;
  link?: string;
  guid?: {
    rendered: string;
  };
}

interface HashnodeResponse {
  data?: {
    createPublicationStory?: {
      post?: {
        id: string;
        url: string;
      };
    };
  };
  id?: string;
  url?: string;
}

interface DevToResponse {
  id: number;
  url: string;
}

interface CustomApiResponse {
  id?: string;
  data?: {
    id?: string;
    url?: string;
  };
  url?: string;
  link?: string;
}

type ApiResponse = WordPressResponse | HashnodeResponse | DevToResponse | CustomApiResponse;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();

    // Parse JSON data from FormData
    const brandId = formData.get('brandId') as string;
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const tags = JSON.parse(formData.get('tags') as string || '[]') as string[];
    const externalSiteIds = JSON.parse(formData.get('externalSiteIds') as string || '[]') as string[];
    const publishImmediately = formData.get('publishImmediately') === 'true';

    // Get banner image
    const bannerFile = formData.get('bannerImage') as File;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Brand, title, and content are required' },
        { status: 400 }
      );
    }

    let bannerUrl = '';
    
    // Upload banner image if provided
    if (bannerFile && bannerFile.size > 0) {
      try {
        bannerUrl = await uploadImage(bannerFile, 'blog_banners');
      } catch (error) {
        console.error('Error uploading banner image:', error);
        return NextResponse.json(
          { error: 'Failed to upload banner image' },
          { status: 500 }
        );
      }
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + 
      '-' + Date.now();

    // Create the blog post
    const blog = await prisma.blog.create({
      data: {
        title,
        slug,
        content,
        banner: bannerUrl,
        tags,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const results: ExternalPublishingResult[] = [];

    // If external sites are selected and immediate publishing is requested
    if (externalSiteIds.length > 0 && publishImmediately) {
      for (const siteId of externalSiteIds) {
        try {
          const result = await publishToExternalSite(blog, siteId, session.user.id);
          results.push({ siteId, success: true, data: result });
        } catch (error) {
          console.error(`Failed to publish to site ${siteId}:`, error);
          results.push({ 
            siteId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }

    return NextResponse.json({ 
      blog,
      externalPublishing: results,
      message: `Blog created successfully${publishImmediately ? ' and published to external sites' : ''}`
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating blog:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Fetch all blogs for user's brands
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    // Get user with their brands
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        brands: {
          include: {
            brand: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userBrandIds = user.brands.map(ub => ub.brandId);

    // Build where clause
    const where: {
      authorId: string;
      brandId?: string;
    } = {
      authorId: user.id
    };

    if (brandId && userBrandIds.includes(brandId)) {
      // If specific brand is requested and user has access to it
      where.authorId = user.id; // Still filter by author for now
    }

    const blogs = await prisma.blog.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        blogPosts: {
          include: {
            externalBlogSite: {
              select: {
                id: true,
                name: true,
                platform: true,
              },
            },
          },
        },
        _count: {
          select: {
            blogPosts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ blogs });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to publish to external sites
async function publishToExternalSite(blog: BlogPost, externalSiteId: string, userId: string) {
  const externalSite = await prisma.externalBlogSite.findFirst({
    where: {
      id: externalSiteId,
    },
    include: {
      brand: true,
    },
  }) as ExternalSite | null;

  if (!externalSite) {
    throw new Error('External site not found or access denied');
  }

  // Prepare payload based on platform
  const payload = prepareBlogPayload(blog, externalSite);

  // Make API request to external site
  const response = await makeExternalApiRequest(externalSite, payload);

  console.log("WordPress API Response:", response);

  // Extract the ID and URL based on the platform
  let externalPostId: string;
  let externalPostUrl: string;

  switch (externalSite.platform) {
    case 'WORDPRESS':
      const wpResponse = response as WordPressResponse;
      externalPostId = wpResponse.id.toString();
      externalPostUrl = wpResponse.link || wpResponse.guid?.rendered || `https://www.pratyushkumar.co.uk/?p=${wpResponse.id}`;
      break;
    
    case 'HASHNODE':
      const hashnodeResponse = response as HashnodeResponse;
      externalPostId = hashnodeResponse.data?.createPublicationStory?.post?.id || hashnodeResponse.id || '';
      externalPostUrl = hashnodeResponse.data?.createPublicationStory?.post?.url || hashnodeResponse.url || '';
      break;
    
    case 'DEV_TO':
      const devToResponse = response as DevToResponse;
      externalPostId = devToResponse.id.toString();
      externalPostUrl = devToResponse.url;
      break;
    
    case 'CUSTOM_API':
      const customResponse = response as CustomApiResponse;
      externalPostId = customResponse.id || customResponse.data?.id || '';
      externalPostUrl = customResponse.url || customResponse.data?.url || customResponse.link || '';
      break;
    
    default:
      const defaultResponse = response as CustomApiResponse;
      externalPostId = defaultResponse.id || defaultResponse.data?.id || '';
      externalPostUrl = defaultResponse.url || defaultResponse.data?.url || '';
  }

  // Validate that we have the required data
  if (!externalPostId) {
    throw new Error(`Failed to extract post ID from external API response: ${JSON.stringify(response)}`);
  }

  // Create blog post record
  const blogPost = await prisma.blogPost.create({
    data: {
      blogId: blog.id,
      externalBlogSiteId: externalSiteId,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      externalPostId: externalPostId,
      externalPostUrl: externalPostUrl,
    },
  });

  return blogPost;
}

function prepareBlogPayload(blog: BlogPost, externalSite: ExternalSite) {
  console.log("Blog", blog);
  const basePayload = {
    title: blog.title,
    content: blog.content,
    excerpt: blog.content.substring(0, 150) + '...',
    status: 'draft' as const,
    tags: blog.tags || [],
  };

  switch (externalSite.platform) {
    case 'WORDPRESS':
      return {
        ...basePayload,
        content: blog.content,
        status: 'draft' as const,
      };

    case 'HASHNODE':
      return {
        title: blog.title,
        contentMarkdown: blog.content,
        tags: (blog.tags || []).map((tag: string) => ({
          name: tag,
          slug: tag.toLowerCase().replace(/\s+/g, '-'),
        })),
        coverImageURL: blog.banner,
      };

    case 'DEV_TO':
      return {
        article: {
          title: blog.title,
          body_markdown: blog.content,
          published: true,
          tags: blog.tags || [],
          main_image: blog.banner,
          description: blog.content.substring(0, 150) + '...',
        },
      };

    case 'CUSTOM_API':
      // Use custom configuration if provided
      const customConfig = externalSite.config as { fieldMapping?: Record<string, string> };
      if (customConfig?.fieldMapping) {
        const mappedPayload: Record<string, unknown> = {};
        Object.keys(customConfig.fieldMapping).forEach(key => {
          const sourceKey = key as keyof typeof basePayload;
          const targetKey = customConfig.fieldMapping![key];
          mappedPayload[targetKey] = basePayload[sourceKey];
        });
        return mappedPayload;
      }
      return basePayload;

    default:
      return basePayload;
  }
}

async function makeExternalApiRequest(externalSite: ExternalSite, payload: unknown): Promise<ApiResponse> {
  const headers: Record<string, string> = {};

  // Add authentication
  switch (externalSite.authType) {
    case 'API_KEY':
      headers['Authorization'] = `Bearer ${externalSite.apiKey}`;
      break;
    case 'BASIC_AUTH':
      const credentials = Buffer.from(
        `${externalSite.username}:${externalSite.apiKey}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
      headers['Content-Type'] = 'application/json';
      break;
    case 'OAUTH2':
      headers['Authorization'] = `Bearer ${externalSite.apiKey}`;
      break;
  }

  // Ensure Content-Type is set for all requests
  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${externalSite.baseUrl}${externalSite.apiEndpoint}`;

  console.log("url", url);
  console.log("headers", headers);
  console.log("payload", payload);
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json() as ApiResponse;
}