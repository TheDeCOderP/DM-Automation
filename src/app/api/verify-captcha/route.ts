import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ success: false, error: "No token provided" }, { status: 400 });
    }

    const secretKey = process.env.GOOGLE_CAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500 });
    }
    
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const data = await res.json();

    if (data.success && data.score >= 0.5) {
      return NextResponse.json({ success: true, score: data.score });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: data['error-codes'] || 'Verification failed',
        score: data.score 
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Captcha verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}