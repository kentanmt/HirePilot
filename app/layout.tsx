import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: { default: "Copilot — AI Recruiting Copilot", template: "%s | Copilot" },
  description: "Your AI-powered job search copilot. Discover jobs, tailor resumes, prep for interviews, and land your dream role.",
  keywords: ["job search", "AI recruiting", "resume tailor", "interview prep", "career"],
  authors: [{ name: "Copilot" }],
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-background text-foreground`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
