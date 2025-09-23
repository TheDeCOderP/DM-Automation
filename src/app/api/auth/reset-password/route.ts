import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Validation schema
const ResetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    
    const validationResult = ResetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid input", 
          details: validationResult.error.flatten()
        }, 
        { status: 400 }
      );
    }

    const { email, token, password } = validationResult.data;

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (!user) {
      return NextResponse.json(
        { error: "If an account with that email exists, a reset link has been sent." }, 
        { status: 404 }
      );
    }

    // Validate reset token
    if (!user.resetToken) {
      return NextResponse.json(
        { error: "No reset token found. Please request a new password reset." }, 
        { status: 400 }
      );
    }

    if (user.resetToken !== token) {
      return NextResponse.json(
        { error: "Invalid reset token" }, 
        { status: 400 }
      );
    }

    if (!user.resetTokenExpiry) {
      return NextResponse.json(
        { error: "Reset token has no expiry date. Please request a new password reset." }, 
        { status: 400 }
      );
    }

    if (user.resetTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new password reset." }, 
        { status: 400 }
      );
    }

    if(user.password) {
      // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return NextResponse.json(
          { error: "New password cannot be the same as your current password." }, 
          { status: 400 }
        );
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user - reset password and clear reset token fields
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date(),
      },
    });

    // Log successful reset (optional console log for debugging)
    console.log(`Password reset successful for user: ${email}`);

    return NextResponse.json(
      { 
        message: "Password successfully reset. You can now log in with your new password.",
        success: true 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Password reset error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("prisma") || error.message.includes("database")) {
        return NextResponse.json(
          { error: "Database error occurred. Please try again." },
          { status: 500 }
        );
      }

      if (error.message.includes("bcrypt")) {
        return NextResponse.json(
          { error: "Error processing password. Please try again." },
          { status: 500 }
        );
      }
    }

    // Generic error handler
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}