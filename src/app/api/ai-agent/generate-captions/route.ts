import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";
import { stripMarkdown } from "@/utils/markdown";

interface SocialPlatform {
  id: string
  name: string
  wordLimit: number
}

const socialMediaPlatforms: SocialPlatform[] = [
  { id: "FACEBOOK", name: "Facebook", wordLimit: 2200 },
  { id: "INSTAGRAM", name: "Instagram", wordLimit: 2200 },
  { id: "LINKEDIN", name: "LinkedIn", wordLimit: 3000 },
  { id: "TWITTER", name: "Twitter", wordLimit: 280 },
]

// Moved outside the POST function as a regular function
function getPlatformTone(platformId: string): string {
  switch(platformId) {
    case 'TWITTER':
      return 'concise, engaging, with potential for humor or wit';
    case 'INSTAGRAM':
      return 'visual-focused, trendy, with relevant hashtags';
    case 'LINKEDIN':
      return 'professional, achievement-oriented, business-appropriate';
    case 'FACEBOOK':
      return 'conversational, community-focused, friendly';
    default:
      return 'engaging and appropriate for the target audience';
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  
  try {
    const data = await req.json();
    const { prompt, platforms, useSameCaptions } = data;

    if (!prompt || !platforms || !Array.isArray(platforms)) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const selectedPlatforms = socialMediaPlatforms.filter((platform) => 
      platforms.includes(platform.id)
    );

    if (selectedPlatforms.length === 0) {
      return new NextResponse("No valid platforms selected", { status: 400 });
    }

    if (useSameCaptions) {
      // For same caption across all platforms, use the smallest word limit
      const minWordLimit = Math.min(...selectedPlatforms.map(p => p.wordLimit));

      const text = await generateText(
        `
          Create a single social media caption that would work well for all of these platforms: 
          ${selectedPlatforms.map(p => p.name).join(", ")}.
          
          The caption must:
          - Be optimized for all listed platforms
          - Not exceed ${minWordLimit} characters
          - Be platform-agnostic in tone
          - Use plain text only, NO markdown formatting (no **, *, __, etc.)
          
          Content requirements:
          ${prompt}
          
          Respond with ONLY the caption text, no additional commentary or formatting.
        `,
        {
          temperature: 0.7,
          maxTokens: minWordLimit,
        }
      );
      
      // Strip any markdown that might have been generated
      const cleanCaption = stripMarkdown((text || '').trim());
      
      return NextResponse.json({ 
        commonCaption: cleanCaption
      }, { status: 200 });
      
    } else {
      // For platform-specific captions
      const platformPromises = selectedPlatforms.map(async (platform) => {
        const text = await generateText(
          `
            Create a ${platform.name} caption with these strict requirements:
            - Exactly ${platform.wordLimit} characters or less
            - Tone: ${getPlatformTone(platform.id)}
            - Include relevant hashtags if appropriate
            - Must follow platform best practices
            - Use plain text only, NO markdown formatting (no **, *, __, etc.)
            - Content focus: ${prompt}
            
            Respond with ONLY the caption text, no additional commentary or formatting.
          `,
          {
            temperature: 0.7,
            maxTokens: platform.wordLimit,
          }
        );
        
        // Strip any markdown that might have been generated
        const cleanCaption = stripMarkdown((text || '').trim());
        
        return { platform: platform.id, caption: cleanCaption };
      });

      const platformResults = await Promise.all(platformPromises);
      const platformCaptions = platformResults.reduce((acc, result) => {
        acc[result.platform] = result.caption;
        return acc;
      }, {} as Record<string, string>);

      return NextResponse.json({ 
        platformCaptions 
      }, { status: 200 });
    }
    
  } catch (error) {
    console.error("Error generating content:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}