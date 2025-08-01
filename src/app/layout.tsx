// src/app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Web3Providers from "@/components/Web3Providers";

import { AuthKitProvider } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";

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
  // ... a többi metadata marad
};

// HELYES AuthKit konfiguráció
const authKitConfig = {
  // Ennek egy OPTIMISM RPC URL-nek kell lennie, mert az azonosság ott van regisztrálva.
  // Használhatunk egy publikus végpontot, pl. a hivatalosat.
  rpcUrl: "https://mainnet.optimism.io", 
  domain: "farcaster-miniapp-rangsor.vercel.app",
  siweUri: "https://farcaster-miniapp-rangsor.vercel.app/api/login",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Az AuthKitProvider a helyes Optimism RPC-vel van konfigurálva */}
        <AuthKitProvider config={authKitConfig}>
          {/* A Web3Providers továbbra is a Base hálózattal működik, ahogy kell. */}
          {/* Annak a konfigurációját a Web3Providers.tsx fájlban kell beállítani Base RPC-re. */}
          <Web3Providers>
            {children}
          </Web3Providers>
        </AuthKitProvider>
      </body>
    </html>
  );
}