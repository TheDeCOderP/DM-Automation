import { prisma } from "@/lib/prisma";

interface LinkedInMedia {
  status: string;
  description: {
    text: string;
  };
  media: string;
  title: {
    text: string;
  };
}

interface LinkedInShareContent {
  shareCommentary: {
    text: string;
  };
  shareMediaCategory: string;
  media?: LinkedInMedia[];
}

interface LinkedInPostBody {
  author: string;
  lifecycleState: string;
  specificContent: {
    'com.linkedin.ugc.ShareContent': LinkedInShareContent;
  };
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': string;
  };
}

export async function publishToLinkedin(
  generatedContent: any, 
  imageBase64: string | null, 
  userId: string
) {
  try {
    if (!generatedContent || !userId) throw new Error('Invalid input');

    const socialAccount = await prisma.socialAccount.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: 'LINKEDIN'
        },
        isConnected: true
      }
    });

    if (!socialAccount) throw new Error('No LinkedIn account found');
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
      throw new Error('Token is expired');
    }

    const authorUrn = `urn:li:person:${socialAccount.platformUserId}`;
    let assetUrn: string | null = null;

    // Upload image if provided
    if (imageBase64) {
      assetUrn = await uploadImageToLinkedin(imageBase64, socialAccount.accessToken, authorUrn);
    }

    // Create post body
    const postBody: LinkedInPostBody = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: generatedContent.content,
          },
          shareMediaCategory: assetUrn ? 'IMAGE' : 'NONE',
          ...(assetUrn ? {
            media: [{
              status: 'READY',
              description: { text: 'Post image' },
              media: assetUrn,
              title: { text: 'Post image' }
            }]
          } : {})
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${socialAccount.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202402'
      },
      body: JSON.stringify(postBody)
    });

    const data = await response.json();

    if (!response.ok) {
      // Update content status to failed
      await prisma.generatedContent.update({
        where: { id: generatedContent.id },
        data: { status: 'FAILED' }
      });
      throw new Error(`LinkedIn API error: ${JSON.stringify(data)}`);
    }

    // Create platform post record
    await prisma.$transaction([
      prisma.platformPost.create({
        data: {
          platform: 'LINKEDIN',
          platformPostId: data.id,
          postUrl: `https://www.linkedin.com/feed/update/${data.id}`,
          postedAt: new Date(),
          status: 'PUBLISHED',
          generatedContentId: generatedContent.id,
          socialAccountId: socialAccount.id
        }
      }),
      prisma.generatedContent.update({
        where: { id: generatedContent.id },
        data: { 
          status: 'PUBLISHED',
          publishedAt: new Date() 
        }
      })
    ]);

    return data;
  } catch (error) {
    console.error("Error in publishing to LinkedIn:", error);
    
    // Ensure content status is set to failed if not already published
    await prisma.generatedContent.update({
      where: { id: generatedContent.id },
      data: { status: 'FAILED' }
    });

    throw error;
  }
}

async function uploadImageToLinkedin(imageBase64: string, accessToken: string, authorUrn: string): Promise<string> {
    try {
        // Step 1: Register upload
        const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202402'
            },
            body: JSON.stringify({
                registerUploadRequest: {
                    recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                    owner: authorUrn,
                    serviceRelationships: [{
                        relationshipType: 'OWNER',
                        identifier: 'urn:li:userGeneratedContent'
                    }]
                }
            })
        });

        if (!registerResponse.ok) {
            throw new Error(`Failed to register upload: ${registerResponse.statusText}`);
        }

        const registerData = await registerResponse.json();
        const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const asset = registerData.value.asset;

        // Step 2: Convert base64 to binary
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Buffer.from(base64Data, 'base64');

        // Step 3: Upload image to LinkedIn
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',  // LinkedIn typically expects PUT for the actual upload
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/octet-stream'
            },
            body: binaryData
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
        }

        return asset;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date(Date.now() + 300000); // 5 minute buffer
}