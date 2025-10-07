import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Web3Providers from "@/components/Web3Providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APPRANK",
  description: "APPRANK - Farcaster miniapp toplist and statistics",
  openGraph: {
    title: "APPRANK",
    description: "Farcaster miniapp toplist and statistics",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "APPRANK",
      },
    ],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://farc-nu.vercel.app/og-image.png",
    "fc:frame:button:1": "🏆 View Rankings",
    "fc:frame:post_url": "https://farc-nu.vercel.app/api/frame",
    "fc:frame:input:text": "optional",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Web3Providers>
          {children}
        </Web3Providers>
      </body>
    </html>
  );
}