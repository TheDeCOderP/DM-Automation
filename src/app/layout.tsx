import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/providers/theme-provider";
import { SessionProvider } from "@/providers/session-provider";

export const metadata: Metadata = {
  title: "Prabisha Digital Marketing Automation",
  description: "Automate your digital marketing with Prabisha's powerful content planning, scheduling, and publishing tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="https://prabisha.com/wp-content/uploads/2023/10/Favicon-2.png" type="image/png" />
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
