import nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';

interface EmailOptions {
  recipient: string | string[];
  subject: string;
  message: string;
  attachments?: Attachment[];
}

export const sendMail = async ({
  recipient,
  subject,
  message,
  attachments = []
}: EmailOptions): Promise<SentMessageInfo> => {
  // Validate required environment variables
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Validate recipient
  if (!recipient || (Array.isArray(recipient) && recipient.length === 0)) {
    throw new Error('No recipient specified');
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      // Connection pool and rate limiting
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    // Verify connection configuration
    await transporter.verify();

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.EMAIL_FROM || `"Digital Marketing Automation" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: subject,
      html: message,
      attachments,
      // Add headers for email clients
      headers: {
        'X-Mailer': 'Digital Marketing Automation Service',
        'X-Priority': '1' // High priority
      }
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email sent successfully:', {
        messageId: info.messageId,
        recipient: Array.isArray(recipient) ? recipient.join(', ') : recipient,
        subject
      });
    }

    return info;
  } catch (error) {
    console.error('Error sending email:', {
      error,
      recipient: Array.isArray(recipient) ? recipient.join(', ') : recipient,
      subject
    });
    
    // Throw a more specific error
    if (error instanceof Error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
    throw new Error('Failed to send email due to unknown error');
  }
};