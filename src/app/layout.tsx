import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "🏆 Miniapps Rankings - Farcaster Toplist",
  description: "Farcaster miniapp toplist and statistics - View the most popular miniapps and track ranking changes",
  openGraph: {
    title: "🏆 Miniapps Rankings - Farcaster Toplist",
    description: "Farcaster miniapp toplist and statistics",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Miniapps Rankings",
      },
    ],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://farcaster-miniapp-rangsor.vercel.app/og-image.png",
      buttons: [
        {
          label: "🏆 View Rankings",
          action: "post",
        },
      ],
      postUrl: "https://farcaster-miniapp-rangsor.vercel.app/api/frame",
    }),
    "fc:frame:image": "https://farcaster-miniapp-rangsor.vercel.app/og-image.png",
    "fc:frame:button:1": "🏆 View Rankings",
    "fc:frame:post_url": "https://farcaster-miniapp-rangsor.vercel.app/api/frame",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Farcaster Miniapp Meta Tags */}
        <meta name="farcaster:app" content="miniapp" />
        <meta name="farcaster:category" content="analytics" />
        <meta name="farcaster:title" content="🏆 Miniapps Rankings" />
        <meta name="farcaster:description" content="Farcaster miniapp toplist and statistics" />
        <meta name="farcaster:image" content="https://farcaster-miniapp-rangsor.vercel.app/og-image.png" />
        <meta name="farcaster:url" content="https://farcaster-miniapp-rangsor.vercel.app" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
