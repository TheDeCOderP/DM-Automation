import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { z } from "zod";
import { sendMail } from "@/services/mailing.service";

// Validation schema
const RequestResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Rate limiting store (in-memory, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 3;

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    
    const validationResult = RequestResetSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid input", 
          details: validationResult.error.flatten()
        }, 
        { status: 400 }
      );
    }

    const { email } = validationResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting check
    const now = Date.now();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const key = `reset-request:${ip}:${normalizedEmail}`;
    
    const requestData = rateLimitStore.get(key);
    
    if (requestData) {
      // Clear old entries
      if (now - requestData.lastRequest > RATE_LIMIT_WINDOW) {
        rateLimitStore.delete(key);
      } else if (requestData.count >= MAX_REQUESTS_PER_WINDOW) {
        return NextResponse.json(
          { error: "Too many reset requests. Please try again later." },
          { status: 429 }
        );
      }
    }

    // Update rate limiting
    const newCount = requestData ? requestData.count + 1 : 1;
    rateLimitStore.set(key, { count: newCount, lastRequest: now });

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email: normalizedEmail } 
    });

    // Always respond success to avoid email enumeration
    if (!user) {
      return NextResponse.json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    }

    // Check if there's a recent reset token that hasn't expired yet
    if (user.resetToken && user.resetTokenExpiry && user.resetTokenExpiry > new Date()) {
      const timeLeft = Math.round((user.resetTokenExpiry.getTime() - Date.now()) / 60000); // minutes
      
      // If token expires in more than 50 minutes, don't send another email
      if (timeLeft > 50) {
        return NextResponse.json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }
    }

    // Generate secure token and expiry
    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with new reset token
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
        updatedAt: new Date(),
      },
    });

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    // Send email
    try {
      await sendMail({
        subject: "Password Reset Request",
        message: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #007bff; 
                color: white; 
                text-decoration: none; 
                border-radius: 4px; 
                margin: 20px 0;
              }
              .footer { 
                margin-top: 30px; 
                padding-top: 20px; 
                border-top: 1px solid #ddd; 
                font-size: 14px; 
                color: #666; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Password Reset Request</h2>
              <p>You requested to reset your password. Click the button below to create a new password:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p>Or copy and paste this link in your browser:</p>
              <p><code>${resetUrl}</code></p>
              
              <p><strong>This link will expire in 1 hour.</strong></p>
              
              <p>If you didn't request this reset, please ignore this email. Your password will remain unchanged.</p>
              
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        recipient: normalizedEmail,
      });
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError);
      
      // Don't reveal email failure to user for security reasons
      // The user will think the email was sent even if it failed
    }

    // Log the request (optional, for monitoring)
    console.log(`Password reset requested for: ${normalizedEmail}`);

    return NextResponse.json({ 
      message: "If an account with that email exists, a password reset link has been sent." 
    });

  } catch (error) {
    console.error("Password reset request error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("prisma") || error.message.includes("database")) {
        // Still return success message for security
        return NextResponse.json({ 
          message: "If an account with that email exists, a password reset link has been sent." 
        });
      }
    }

    // Always return success message even on unexpected errors
    return NextResponse.json({ 
      message: "If an account with that email exists, a password reset link has been sent." 
    });
  }
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.lastRequest > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Cleanup every hour