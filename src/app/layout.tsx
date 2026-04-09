import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Gritly — Built for grit.",
    template: "%s | Gritly",
  },
  description:
    "The field service platform that replaces Jobber, CompanyCam, and 4 other tools — with unlimited users on every plan.",
  keywords: [
    "field service management",
    "Jobber alternative",
    "HVAC software",
    "plumbing software",
    "electrical contractor software",
    "trades software",
    "field service software",
    "unlimited users",
    "scheduling software",
  ],
  authors: [{ name: "OASIS AI Solutions" }],
  creator: "OASIS AI Solutions",
  metadataBase: new URL("https://grit.ly"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://grit.ly",
    siteName: "Gritly",
    title: "Gritly — Built for grit.",
    description:
      "The field service platform that replaces Jobber, CompanyCam, and 4 other tools — with unlimited users on every plan.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gritly — Built for grit.",
    description:
      "The field service platform that replaces Jobber, CompanyCam, and 4 other tools — with unlimited users on every plan.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
