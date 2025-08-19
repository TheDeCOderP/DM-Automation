import { sendMail } from "@/services/mailing.service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { name, email, inquiryType, message, phone } = data;

        const emailSubject = `New Inquiry: ${inquiryType}`;
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 20px auto; padding: 20px; }
                    .header { color: #4a6baf; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                    .detail { margin: 15px 0; }
                    .label { font-weight: bold; color: #555; }
                    .message { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 class="header">New Contact Inquiry</h1>
                    
                    <div class="detail">
                        <span class="label">Name:</span> ${name}
                    </div>
                    
                    <div class="detail">
                        <span class="label">Email:</span> <a href="mailto:${email}">${email}</a>
                    </div>
                    
                    ${phone ? `
                    <div class="detail">
                        <span class="label">Phone:</span> <a href="tel:${phone}">${phone}</a>
                    </div>
                    ` : ''}
                    
                    <div class="detail">
                        <span class="label">Inquiry Type:</span> ${inquiryType}
                    </div>
                    
                    <div class="detail">
                        <span class="label">Message:</span>
                        <div class="message">${message.replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
            </body>
            </html>
        `;

        sendMail({
            subject: emailSubject,
            message: emailHtml,
            recipient: "firoz.prabisha@gmail.com"
        });

        return NextResponse.json(
            { message: "Thank you for contacting us! We've received your message and will get back to you soon." }, { status: 201 }
        );

    } catch (error) {
        console.error("Error processing contact request:", error);
        return NextResponse.json({ error: "We encountered an issue while processing your request. Please try again later." }, { status: 500 });
    }
}