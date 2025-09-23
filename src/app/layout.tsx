import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import Script from "next/script";
import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { ThemeProvider } from "@/providers/theme-provider";
import { SessionProvider } from "@/providers/session-provider";

export const metadata: Metadata = {
  title: "Prabisha Digital Marketing Automation",
  description: "Automate your digital marketing with Prabisha's powerful content planning, scheduling, and publishing tools.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/posts/calendar');
  }

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="https://prabisha.com/wp-content/uploads/2023/10/Favicon-2.png" type="image/png" />
        <Script async src={`https://www.google.com/recaptcha/api.js?render=${process.env.GOOGLE_CAPTCHA_SITE_KEY}`}></Script>
      </head>
      <body
        className={`antialiased`}
       suppressHydrationWarning={true}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionProvider>
            <Toaster richColors position="top-right" closeButton />
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
