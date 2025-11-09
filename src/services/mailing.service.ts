import nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';

interface EmailOptions {
  recipient: string | string[];
  subject: string;
  message: string;
  attachments?: Attachment[];
}

// Cache transporter to avoid recreating it for each request
let cachedTransporter: nodemailer.Transporter | null = null;

const createTransporter = (): nodemailer.Transporter => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // Validate required environment variables
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    // Use proper SMTP transport options
    ...(process.env.SMTP_SECURE === 'true' ? {} : { requireTLS: true }),
    // Timeout configurations (these are valid options)
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
  } as nodemailer.TransportOptions);

  // For pooling options, use a different approach in serverless
  // In Vercel, avoid pooling entirely as it doesn't work well with serverless

  cachedTransporter = transporter;
  return transporter;
};

export const sendMail = async ({
  recipient,
  subject,
  message,
  attachments = []
}: EmailOptions): Promise<SentMessageInfo> => {
  // Validate recipient
  if (!recipient || (Array.isArray(recipient) && recipient.length === 0)) {
    throw new Error('No recipient specified');
  }

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const recipients = Array.isArray(recipient) ? recipient : [recipient];
  const invalidEmails = recipients.filter(email => !validateEmail(email));
  
  if (invalidEmails.length > 0) {
    throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
  }

  let transporter: nodemailer.Transporter | null = null;
  
  try {
    transporter = createTransporter();

    // Verify connection with timeout
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('SMTP connection timeout')), 10000);
    });
    
    await Promise.race([verifyPromise, timeoutPromise]);

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.EMAIL_FROM || `"Digital Marketing Automation" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: subject,
      html: message,
      attachments,
      headers: {
        'X-Mailer': 'Digital Marketing Automation Service',
        'X-Priority': '1'
      },
      // Add encoding to prevent issues with special characters
      encoding: 'utf-8'
    };

    // Send email with timeout
    const sendPromise = transporter.sendMail(mailOptions);
    const sendTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email sending timeout')), 30000);
    });

    const info = await Promise.race([sendPromise, sendTimeoutPromise]) as SentMessageInfo;

    if (process.env.NODE_ENV !== 'production') {
      console.log('Email sent successfully:', {
        messageId: info.messageId,
        recipient: Array.isArray(recipient) ? recipient.join(', ') : recipient,
        subject,
        response: info.response
      });
    }

    return info;
  } catch (error) {
    console.error('Error sending email:', {
      error: error instanceof Error ? error.message : error,
      recipient: Array.isArray(recipient) ? recipient.join(', ') : recipient,
      subject,
      timestamp: new Date().toISOString()
    });

    // Reset cached transporter on error to force recreation
    cachedTransporter = null;
    
    // Close transporter if it exists
    if (transporter) {
      try {
        await transporter.close();
      } catch (closeError) {
        console.error('Error closing transporter:', closeError);
      }
    }

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`Email service timeout: ${error.message}`);
      } else if (error.message.includes('Authentication failed')) {
        throw new Error('SMTP authentication failed. Please check your credentials.');
      } else if (error.message.includes('ENOTFOUND')) {
        throw new Error('SMTP server not found. Please check your SMTP host configuration.');
      } else if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Connection to SMTP server refused. Please check the port and host.');
      }
      throw new Error(`Failed to send email: ${error.message}`);
    }
    
    throw new Error('Failed to send email due to unknown error');
  }
};

// Utility function to clean up transporter (useful for serverless environments)
export const cleanupTransporter = async (): Promise<void> => {
  if (cachedTransporter) {
    try {
      await cachedTransporter.close();
      cachedTransporter = null;
    } catch (error) {
      console.error('Error cleaning up transporter:', error);
    }
  }
};