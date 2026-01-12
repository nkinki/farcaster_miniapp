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
        url: "/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "APPRANK",
      },
    ],
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      // Use og-animated.gif for a high-energy animated feed image (e.g. rotating Diamond VIP)
      imageUrl: "https://farc-nu.vercel.app/og-animated.gif?v=3",
      button: {
        title: "💎 Diamond VIP NFT",
        action: {
          type: "launch_miniapp",
          url: "https://farc-nu.vercel.app/",
          name: "APPRANK"
        }
      }
    }),
    // For backward compatibility
    "fc:frame": JSON.stringify({
      version: "1",
      imageUrl: "https://farc-nu.vercel.app/og-animated.gif?v=3",
      button: {
        title: "💎 Diamond VIP NFT",
        action: {
          type: "launch_frame",
          url: "https://farc-nu.vercel.app/",
          name: "APPRANK"
        }
      }
    })
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta property="og:image" content="https://farc-nu.vercel.app/og-image.png?v=2" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="APPRANK - Farcaster miniapp toplist" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://farc-nu.vercel.app/og-image.png?v=2" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Web3Providers>
          {children}
        </Web3Providers>
      </body>
    </html>
  );
}