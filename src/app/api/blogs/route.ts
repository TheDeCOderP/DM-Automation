import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { uploadImage } from '@/lib/cloudinary';

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
    const tags = JSON.parse(formData.get('tags') as string || '[]');
    const externalSiteIds = JSON.parse(formData.get('externalSiteIds') as string || '[]');
    const publishImmediately = formData.get('publishImmediately') === 'true';

    // Get banner image
    const bannerFile = formData.get('bannerImage') as File;

    // Validate required fields
    if (!brandId || !title || !content) {
      return NextResponse.json(
        { error: 'Brand, title, and content are required' },
        { status: 400 }
      );
    }

    // Check user access to brand
    const userBrand = await prisma.userBrand.findFirst({
      where: {
        user: { email: session.user.email },
        brandId: brandId,
      },
    });

    if (!userBrand) {
      return NextResponse.json(
        { error: "You don't have access to this brand" },
        { status: 403 }
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
        authorId: userBrand.userId,
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

    const results = [];

    // If external sites are selected and immediate publishing is requested
    if (externalSiteIds.length > 0) {
      for (const siteId of externalSiteIds) {
        try {
          const result = await publishToExternalSite(blog, siteId, userBrand.userId);
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
    const where: any = {
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
async function publishToExternalSite(blog: any, externalSiteId: string, userId: string) {
  const externalSite = await prisma.externalBlogSite.findFirst({
    where: {
      id: externalSiteId,
    },
    include: {
      brand: true,
    },
  });

  if (!externalSite) {
    throw new Error('External site not found or access denied');
  }

  // Prepare payload based on platform
  const payload = prepareBlogPayload(blog, externalSite);

  // Make API request to external site
  const response = await makeExternalApiRequest(externalSite, payload);

  console.log("WordPress API Response:", response); // Add this to debug

  // For WordPress, the response is the post object directly
  // Extract the ID and URL based on the platform
  let externalPostId: string;
  let externalPostUrl: string;

  switch (externalSite.platform) {
    case 'WORDPRESS':
      // WordPress returns the post object directly
      externalPostId = response.id.toString();
      externalPostUrl = response.link || response.guid?.rendered || `https://www.pratyushkumar.co.uk/?p=${response.id}`;
      break;
    
    case 'HASHNODE':
      externalPostId = response.data?.createPublicationStory?.post?.id || response.id;
      externalPostUrl = response.data?.createPublicationStory?.post?.url || response.url;
      break;
    
    case 'DEV_TO':
      externalPostId = response.id.toString();
      externalPostUrl = response.url;
      break;
    
    case 'CUSTOM_API':
      // For custom APIs, try to extract from common patterns
      externalPostId = response.id || response.data?.id;
      externalPostUrl = response.url || response.data?.url || response.link || response.data?.link;
      break;
    
    default:
      externalPostId = response.id || response.data?.id;
      externalPostUrl = response.url || response.data?.url;
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
      requestPayload: payload,
      responseData: response,
    },
  });

  return blogPost;
}

function prepareBlogPayload(blog: any, externalSite: any) {
  console.log("Blog", blog);
  const basePayload = {
    title: blog.title,
    content: blog.content,
    excerpt: blog.content.substring(0, 150) + '...',
    status: 'draft',
    tags: blog.tags || [],
  };

  switch (externalSite.platform) {
    case 'WORDPRESS':
      return {
        ...basePayload,
        content: blog.content,
        status: 'draft',
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
      const customConfig = externalSite.config as any;
      if (customConfig?.fieldMapping) {
        const mappedPayload: any = {};
        Object.keys(customConfig.fieldMapping).forEach(key => {
          mappedPayload[customConfig.fieldMapping[key]] = basePayload[key as keyof typeof basePayload];
        });
        return mappedPayload;
      }
      return basePayload;

    default:
      return basePayload;
  }
}

async function  makeExternalApiRequest(externalSite: any, payload: any) {
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

  return await response.json();
}