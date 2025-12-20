import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";
import { ThemeProvider } from "@/app/components/theme-provider";
import { SidebarConfigProvider } from "@/app/context/sidebar-context";
import { GlobalThemeCustomizer } from "@/app/components/GlobalThemeCustomizer";
import { Toaster } from "@/app/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HR System | German International University",
  description:
    "A unified, modular HR platform that covers the full employee lifecycle and everyday HR operations in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="system" storageKey="hr-system-theme">
          <SidebarConfigProvider>
            <AuthProvider>
              {children}
              <GlobalThemeCustomizer />
              <Toaster />
            </AuthProvider>
          </SidebarConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
