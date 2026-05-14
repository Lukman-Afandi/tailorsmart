import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TailorSmart";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${appName} — SaaS untuk penjahit`,
    template: `%s · ${appName}`,
  },
  description:
    "TailorSmart membantu bisnis tailor mengelola pelanggan, ukuran, dan order dengan aman — multi-tenant, cepat, dan siap produksi.",
  applicationName: appName,
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: appUrl,
    siteName: appName,
    title: `${appName} — SaaS untuk penjahit`,
    description:
      "Dashboard modern untuk tailor: pelanggan, order, statistik, dan paket langganan.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${appName} — SaaS untuk penjahit`,
    description:
      "Dashboard modern untuk tailor: pelanggan, order, statistik, dan paket langganan.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
