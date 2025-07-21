import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FarcasterAuthProvider } from '../components/FarcasterAuthProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const config = {
  domain: typeof window !== 'undefined' ? window.location.host : 'localhost',
  siweUri: typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000/login',
  rpcUrl: 'https://mainnet.optimism.io',
  relay: 'https://relay.farcaster.xyz',
};

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <FarcasterAuthProvider>
      {children}
    </FarcasterAuthProvider>
  );
}
