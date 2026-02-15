import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: siteId } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch the external blog site
    const externalSite = await prisma.externalBlogSite.findFirst({
      where: {
        id: siteId,
      },
      include: {
        brand: true,
      },
    });

    if (!externalSite) {
      return NextResponse.json(
        { error: 'External site not found' },
        { status: 404 }
      );
    }

    // Prepare test request based on platform
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

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
        break;
      case 'OAUTH2':
        headers['Authorization'] = `Bearer ${externalSite.apiKey}`;
        break;
    }

    // Test the connection by making a GET request to the API
    // For WordPress, we'll try to fetch posts to verify the connection
    const testUrl = `${externalSite.baseUrl}${externalSite.apiEndpoint}`;
    
    console.log('Testing connection to:', testUrl);
    console.log('Headers:', { ...headers, Authorization: '[REDACTED]' });

    const response = await fetch(testUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Connection test failed:', response.status, errorText);
      
      return NextResponse.json(
        {
          success: false,
          error: `Connection failed: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: 200 } // Return 200 but with success: false
      );
    }

    // Try to parse the response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Failed to parse response:', e);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON response from API',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connection successful!',
      platform: externalSite.platform,
      responsePreview: Array.isArray(data) 
        ? `Received ${data.length} items` 
        : 'Connection verified',
    });

  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 200 }
    );
  }
}
