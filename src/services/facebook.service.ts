// lib/social/facebook.ts
import { prisma } from "@/lib/prisma";

export async function publishToFacebook(generatedContent: any, userId: string) {
    try {
        if(!generatedContent || !userId) throw new Error('Invalid input');

        const socialAccount = await prisma.socialAccount.findUnique({
            where: {
                userId_platform: {
                    userId,
                    platform: 'FACEBOOK'
                }
            }
        });

        console.log("Social Account: ", socialAccount);

        if(!socialAccount) throw new Error('No Facebook account found');

        const pageId = "698864169979532";
        const accessToken = socialAccount.accessToken;
        console.log('Publishing to Page ID:', pageId, 'with Token:', accessToken); 

        if(isTokenExpired(socialAccount.tokenExpiresAt)) {
            throw new Error('Token is expired');
        }
        
        // Simple text post
        const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: generatedContent.content.slice(0, 280),
                access_token: accessToken
            })
        });

        const data = await response.json();
        console.log("Response from Facebook API: ", data);

        if(response.status !== 200 || data.error) {
            throw new Error(data.error?.message || 'Failed to post on Facebook');
        }

        return data;
    } catch (error) {
        console.log("Error in publishing to Facebook: ", error);
        throw error; // Re-throw to handle in calling function
    }
}

function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date(Date.now() + 300000); // 5 minute buffer
}