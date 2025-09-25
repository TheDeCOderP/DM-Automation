import "./globals.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import { Toaster } from "sonner";
import Script from "next/script";
import type { Metadata } from "next";

import { ThemeProvider } from "@/providers/theme-provider";
import { SessionProvider } from "@/providers/session-provider";
import { DynamicThemeProvider } from "@/providers/dynamic-theme-provider";  

export const metadata: Metadata = {
  title: "Prabisha Digital Marketing Automation",
  description: "Automate your digital marketing with Prabisha's powerful content planning, scheduling, and publishing tools.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
            <DynamicThemeProvider>
              <Toaster richColors position="top-right" closeButton />
              {children}
            </DynamicThemeProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
