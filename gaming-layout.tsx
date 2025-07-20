import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "../components/ClientProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "🎮 Gaming Miniapp - Farcaster",
  description: "Gaming miniapp for Farcaster - Play games and have fun!",
  openGraph: {
    title: "🎮 Gaming Miniapp - Farcaster",
    description: "Gaming miniapp for Farcaster",
    images: [
      {
        url: "/gaming-og-image.png",
        width: 1200,
        height: 630,
        alt: "Gaming Miniapp",
      },
    ],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://your-gaming-domain.vercel.app/gaming-og-image.png",
      buttons: [
        {
          label: "🎮 Play Now!",
          action: "post",
        },
      ],
      postUrl: "https://your-gaming-domain.vercel.app/api/frame",
    }),
    "fc:frame:image": "https://your-gaming-domain.vercel.app/gaming-og-image.png",
    "fc:frame:button:1": "🎮 Play Now!",
    "fc:frame:post_url": "https://your-gaming-domain.vercel.app/api/frame",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
        
        {/* Farcaster Miniapp Meta Tags - GAMING CATEGORY */}
        <meta name="farcaster:app" content="miniapp" />
        <meta name="farcaster:category" content="gaming" />
        <meta name="farcaster:title" content="🎮 Gaming Miniapp" />
        <meta name="farcaster:description" content="Gaming miniapp for Farcaster - Play games and have fun!" />
        <meta name="farcaster:image" content="https://your-gaming-domain.vercel.app/gaming-og-image.png" />
        <meta name="farcaster:url" content="https://your-gaming-domain.vercel.app" />
      </head>
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
} 