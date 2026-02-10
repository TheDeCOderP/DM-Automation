// app/api/posts/auto-reply/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchLinkedInComments, replyToLinkedInComment } from '@/services/linkedin.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Platform, Status } from '@prisma/client';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateGeminiReply(commentText: string, postContent: string, brandName: string, context?: {
  commentAuthor?: string;
  platform?: string;
  previousReplies?: Array<{ author: string; text: string }>;
}): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    
    const prompt = `
You are an AI assistant for ${brandName}, responsible for replying to comments on social media posts.
Your goal is to create engaging, helpful, and brand-appropriate responses.

Context:
- Platform: ${context?.platform || 'LinkedIn'}
- Comment Author: ${context?.commentAuthor || 'Anonymous'}
- Brand: ${brandName}

Post Content:
${postContent.substring(0, 500)}...

Comment to reply to:
"${commentText}"

Previous replies in this thread (if any):
${context?.previousReplies ? context.previousReplies.map(r => `- ${r.author}: ${r.text}`).join('\n') : 'No previous replies'}

Guidelines for your reply:
1. Be friendly, professional, and on-brand
2. Address the specific points mentioned in the comment
3. Keep it concise (1-2 sentences maximum for LinkedIn)
4. Add value - offer help, ask a question, or provide additional insight
5. Use appropriate emojis sparingly (max 1-2)
6. Do not use markdown formatting
7. Do not make promises you can't keep
8. If the comment is negative, acknowledge the concern and offer to help
9. If the comment is a question, provide a helpful answer or direct to appropriate resources
10. If you're not sure what to say, simply thank them for their comment

Generate a response that follows these guidelines:
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up the response
    return text.trim()
      .replace(/["']/g, '') // Remove quotes if Gemini adds them
      .replace(/\n+/g, ' ') // Replace multiple newlines with space
      .substring(0, 280); // Ensure it fits in LinkedIn comment character limit
  } catch (error) {
    console.error('Gemini generation error:', error);
    
    // Fallback responses based on comment sentiment
    const lowerComment = commentText.toLowerCase();
    
    if (lowerComment.includes('thank') || lowerComment.includes('thanks') || lowerComment.includes('appreciate')) {
      return `Thank you for your kind words! 🙏`;
    } else if (lowerComment.includes('?') || lowerComment.includes('how') || lowerComment.includes('what') || lowerComment.includes('why')) {
      return `Great question! I'll have someone from our team reach out with more details.`;
    } else if (lowerComment.includes('bad') || lowerComment.includes('issue') || lowerComment.includes('problem') || lowerComment.includes('disappoint')) {
      return `I'm sorry to hear about this experience. Please share more details so we can help resolve this.`;
    } else {
      return `Thank you for your comment! 🙏`;
    }
  }
}

// Define proper types for LinkedIn comment responses
interface LinkedInComment {
  id: string;
  message: string;
  author?: string; // Changed from authorName to match LinkedIn API
  authorId?: string; // Added authorId
  timestamp: number;
  parentCommentId?: string;
}

interface CommentReplyResult {
  commentId: string;
  commentText?: string;
  replyText?: string;
  success?: boolean;
  error?: string;
  replyCommentId?: string;
  message?: string;
  generatedReply?: string;
  wouldSend?: boolean;
}

// Helper function to check if we should reply to a comment
function shouldReplyToComment(comment: LinkedInComment, existingReplies: any[]): boolean {
  // Don't reply if:
  // 1. It's our own comment (author is the brand)
  // 2. We've already replied to this comment
  // 3. The comment is spammy or inappropriate (basic filtering)
  
  const author = comment.author || '';
  const isFromBrand = author.toLowerCase().includes('admin') || 
                      author.toLowerCase().includes('team') ||
                      author.toLowerCase().includes('official');
  
  const alreadyReplied = existingReplies.some(reply => 
    reply.platformCommentId === comment.id || 
    reply.parentCommentId === comment.id
  );
  
  // Basic spam detection
  const commentText = comment.message.toLowerCase();
  const isSpam = commentText.includes('buy now') ||
                 commentText.includes('click here') ||
                 commentText.includes('http://') ||
                 commentText.includes('https://') ||
                 commentText.includes('make money') ||
                 commentText.includes('discount');
  
  return !isFromBrand && !alreadyReplied && !isSpam;
}

// Define type for the processed post result
interface ProcessedPostResult {
  postId: string;
  title: string | null;
  content?: string;
  brand: string;
  postType?: string;
  source?: string;
  publishedAt?: Date;
  url?: string | null;
  autoReplyEnabled?: boolean | null;
  comments?: {
    total: number;
    needReply: number;
    alreadyReplied: number;
  };
  commentPreview?: Array<{
    id: string;
    author?: string;
    message: string;
    timestamp: string;
  }>;
  autoReply?: {
    enabled: boolean;
    dryRun: boolean;
    repliesAttempted: number;
    repliesSuccessful: number;
    repliesFailed: number;
    replyResults?: CommentReplyResult[];
  };
  error?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const autoReply = searchParams.get('autoReply') !== 'false'; // Enable/disable via query param
    const dryRun = searchParams.get('dryRun') === 'true'; // For testing without actually replying
    const hours = parseInt(searchParams.get('hours') || '24');

    // Get posts from specified time period
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Build where clause with proper Prisma types
    const where: any = {
      platform: Platform.LINKEDIN,
      status: Status.PUBLISHED,
      publishedAt: { gte: timeAgo },
      autoReplyEnabled: true // Only process posts with auto-reply enabled
    };

    if (brandId) {
      where.brandId = brandId;
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        brand: { select: { name: true } },
        socialAccountPage: { 
          select: { 
            pageName: true,
            pageId: true
          } 
        },
        commentReplies: {
          select: {
            platformCommentId: true,
            platformReplyId: true,
            parentCommentId: true,
            commentText: true,
            replyText: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: limit
    });

    // Get comments for each post and optionally reply
    const postsWithComments = await Promise.all(
      posts.map(async (post): Promise<ProcessedPostResult> => {
        try {
          const comments: LinkedInComment[] = await fetchLinkedInComments(post.id, false);
          
          // Filter comments that need replies
          const commentsToReply = comments.filter(comment => 
            shouldReplyToComment(comment, post.commentReplies)
          );
          
          console.log(`Post ID: ${post.id} - Found ${commentsToReply.length} comments to reply to (out of ${comments.length} total).`);
          
          const replyResults: CommentReplyResult[] = [];
          
          if (autoReply && commentsToReply.length > 0 && !dryRun) {
            for (const comment of commentsToReply) {
              try {
                // Generate intelligent reply using Gemini
                const generatedReply = await generateGeminiReply(
                  comment.message,
                  post.content,
                  post.brand.name,
                  {
                    commentAuthor: comment.author,
                    platform: 'LinkedIn',
                    previousReplies: post.commentReplies
                      .filter(r => r.parentCommentId === comment.id || r.platformCommentId === comment.id)
                      .map(r => ({ author: 'Brand', text: r.replyText || '' }))
                  }
                );
                
                // Check if reply is appropriate (not empty or error)
                if (generatedReply && generatedReply.trim().length > 5) {
                  const replyResult = await replyToLinkedInComment(
                    post.id,
                    comment.id,
                    generatedReply
                  );
                  
                  // Store the reply in database
                  await prisma.commentReply.create({
                    data: {
                      postId: post.id,
                      platformCommentId: comment.id,
                      commentAuthorId: comment.authorId || 'unknown',
                      commentAuthorName: comment.author,
                      commentText: comment.message,
                      commentCreatedAt: new Date(comment.timestamp),
                      replyText: generatedReply,
                      platformReplyId: replyResult.commentId,
                      status: 'SENT',
                      platform: Platform.LINKEDIN
                    }
                  });
                  
                  replyResults.push({
                    commentId: comment.id,
                    commentText: comment.message.substring(0, 100),
                    replyText: generatedReply,
                    success: true,
                    replyCommentId: replyResult.commentId,
                    message: "Successfully replied with AI-generated response"
                  });
                  
                  // Add delay to avoid rate limiting
                  await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                  replyResults.push({
                    commentId: comment.id,
                    success: false,
                    error: "Generated reply was invalid or empty"
                  });
                }
              } catch (replyError) {
                console.error(`Failed to reply to comment ${comment.id}:`, replyError);
                
                // Store failed attempt in database
                await prisma.commentReply.create({
                  data: {
                    postId: post.id,
                    platformCommentId: comment.id,
                    commentAuthorId: comment.authorId || 'unknown',
                    commentAuthorName: comment.author,
                    commentText: comment.message,
                    commentCreatedAt: new Date(comment.timestamp),
                    replyText: '',
                    status: 'FAILED',
                    errorMessage: replyError instanceof Error ? replyError.message : 'Failed to reply',
                    platform: Platform.LINKEDIN
                  }
                });
                
                replyResults.push({
                  commentId: comment.id,
                  success: false,
                  error: replyError instanceof Error ? replyError.message : 'Failed to reply'
                });
              }
            }
          } else if (dryRun && commentsToReply.length > 0) {
            // Generate replies but don't send (dry run mode)
            for (const comment of commentsToReply) {
              const generatedReply = await generateGeminiReply(
                comment.message,
                post.content,
                post.brand.name,
                {
                  commentAuthor: comment.author,
                  platform: 'LinkedIn'
                }
              );
              
              replyResults.push({
                commentId: comment.id,
                commentText: comment.message.substring(0, 100),
                generatedReply: generatedReply,
                wouldSend: !dryRun,
                message: "Dry run - would reply with AI-generated response"
              });
            }
          }
          
          // Determine post type
          const postType = post.socialAccountPage ? 'page' : 'personal';
          const source = post.socialAccountPage 
            ? `Page: ${post.socialAccountPage.pageName}` 
            : `Personal Profile`;
          
          // Build the result object with proper typing
          const result: ProcessedPostResult = {
            postId: post.id,
            title: post.title,
            content: post.content.substring(0, 200) + '...',
            brand: post.brand.name,
            postType,
            source,
            url: post.url,
            autoReplyEnabled: post.autoReplyEnabled,
            comments: {
              total: comments.length,
              needReply: commentsToReply.length,
              alreadyReplied: post.commentReplies.length
            },
            commentPreview: comments.slice(0, 3).map(c => ({
              id: c.id,
              author: c.author,
              message: c.message.substring(0, 100),
              timestamp: new Date(c.timestamp).toISOString()
            }))
          };
          
          // Add auto-reply data conditionally
          if (autoReply) {
            result.autoReply = {
              enabled: true,
              dryRun,
              repliesAttempted: replyResults.length,
              repliesSuccessful: replyResults.filter(r => r.success || r.wouldSend).length,
              repliesFailed: replyResults.filter(r => !r.success && !r.wouldSend).length,
              replyResults: replyResults.length > 0 ? replyResults : undefined
            };
          }
          
          return result;
        } catch (error) {
          console.error(`Error processing post ${post.id}:`, error);
          return {
            postId: post.id,
            title: post.title,
            brand: post.brand.name,
            comments: { total: 0, needReply: 0, alreadyReplied: 0 },
            error: error instanceof Error ? error.message : 'Failed to process post'
          };
        }
      })
    );

    // Separate successful and failed fetches
    const successful = postsWithComments.filter(p => !p.error);
    const failed = postsWithComments.filter(p => p.error);

    // Calculate statistics
    let autoReplyStats = null;
    if (autoReply) {
      const totalRepliesAttempted = successful.reduce((sum, post) => 
        sum + (post.autoReply?.repliesAttempted || 0), 0);
      const totalRepliesSuccessful = successful.reduce((sum, post) => 
        sum + (post.autoReply?.repliesSuccessful || 0), 0);
      const totalRepliesFailed = successful.reduce((sum, post) => 
        sum + (post.autoReply?.repliesFailed || 0), 0);
      
      autoReplyStats = {
        totalRepliesAttempted,
        totalRepliesSuccessful,
        totalRepliesFailed,
        successRate: totalRepliesAttempted > 0 
          ? Math.round((totalRepliesSuccessful / totalRepliesAttempted) * 100) 
          : 0,
        totalPostsProcessed: successful.length,
        totalCommentsFound: successful.reduce((sum, post) => sum + (post.comments?.total || 0), 0),
        totalCommentsNeedingReply: successful.reduce((sum, post) => sum + (post.comments?.needReply || 0), 0)
      };
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalPosts: posts.length,
        successfulFetches: successful.length,
        failedFetches: failed.length,
        ...(autoReplyStats && { autoReplyStats }),
        ...(dryRun && { mode: "DRY_RUN", note: "No actual replies were sent" }),
        ...(autoReply && !dryRun && { mode: "AUTO_REPLY_ACTIVE" })
      },
      posts: successful,
      failedPosts: failed.length > 0 ? failed : undefined
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process auto-reply',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}